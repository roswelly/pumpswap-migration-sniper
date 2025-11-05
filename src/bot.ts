import Client, {
  CommitmentLevel,
  SubscribeRequest,
  SubscribeUpdate,
  SubscribeUpdateTransaction,
} from "@triton-one/yellowstone-grpc";
import {
  CompiledInstruction,
  Message,
} from "@triton-one/yellowstone-grpc/dist/types/grpc/solana-storage";
import { ClientDuplexStream } from "@grpc/grpc-js";
import base58 from "bs58";
import { Keypair, PublicKey, sendAndConfirmTransaction, Transaction, TransactionInstruction } from "@solana/web3.js";

import { connectDB, GEYSER_KEY, GEYSER_RPC, tickers } from "./config/index";
import { raydiumCpmmSwap } from "./service/raydium-cpmm/swap";
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, NATIVE_MINT } from "@solana/spl-token";
import { connection } from "./service/raydium-cpmm/config";
import { raydiumCpmmSwapWithFetch } from "./service/raydium-cpmm/hard-code";


const adminKeypair = Keypair.fromSecretKey(base58.decode(process.env.ADMIN_PRIVATE_KEY || ''))
const adminPublicKey = adminKeypair.publicKey

export const parseLaunchLog = (log: string) => {
  const logBuffer = Buffer.from(log);
  let offset = 8; // discriminator

  const symbolLen = logBuffer[offset];

  offset += 4; // empty space

  const nameBuffer = logBuffer.slice(offset, offset + symbolLen);
  const name = nameBuffer.toString();

  offset += symbolLen;
  const nameLen = logBuffer[offset];

  offset += 4;
  const symbolBuffer = logBuffer.slice(offset, offset + nameLen);
  const symbol = symbolBuffer.toString();

  offset += nameLen;
  const uriLen = logBuffer[offset];

  offset += 4;
  const uriBuffer = logBuffer.slice(offset, offset + uriLen);
  const uri = uriBuffer.toString();

  offset += uriLen;

  const mintBuffer = new PublicKey(logBuffer.subarray(offset, offset + 32));
  const mint = mintBuffer.toBase58();

  return {
    name,
    symbol,
    uri,
    mint,
  };
};

export const parseCreatePoolLog = (log: string) => {
  const logBuffer = Buffer.from(log);
  let offset = 8 + 2; // discriminator + index

  const baseAmountIn = logBuffer.readBigUInt64LE(offset);
  offset += 8;
  const quoteAmountIn = logBuffer.readBigUInt64LE(offset);
  offset += 8;

  const coinCreator = new PublicKey(logBuffer.subarray(offset, offset + 32));

  return {
    baseAmountIn,
    quoteAmountIn,
    coinCreator,
  };
};

export async function subscribeGeyser() {
  // await connectDB();
  const client = new Client(GEYSER_RPC, GEYSER_KEY, undefined);
  const stream = await client.subscribe();
  const request = createSubscribeRequest();

  try {
    await sendSubscribeRequest(stream, request);
    console.log("Geyser connection established");
    await handleStreamEvents(stream);
  } catch (error) {
    console.log("Error in subscription process:", error);
    stream.end();
    setTimeout(() => {
      subscribeGeyser();
    }, 5_000);
  }
}

function createSubscribeRequest(): SubscribeRequest {
  return {
    accounts: {},
    slots: {},
    transactions: {
      migrate: {
        accountInclude: [],
        accountExclude: [],
        accountRequired: [
          "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",        // raydium launchlab
          "WLHv2UAZm6z4KyaaELi5pjdbJh6RESMva1Rnn8pJVVh",        // raydium launchlab authority
        ],
      },
    },
    transactionsStatus: {},
    entry: {},
    blocks: {},
    blocksMeta: {},
    commitment: CommitmentLevel.CONFIRMED,
    accountsDataSlice: [],
    ping: undefined,
  };
}

function sendSubscribeRequest(
  stream: ClientDuplexStream<SubscribeRequest, SubscribeUpdate>,
  request: SubscribeRequest
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    stream.write(request, (err: Error | null) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function handleStreamEvents(
  stream: ClientDuplexStream<SubscribeRequest, SubscribeUpdate>
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    stream.on("data", async (data) => {
      if (data.filters[0] === "migrate") {

        handleMigrationData(data, true);
      }
    });

    stream.on("error", (error: Error) => {
      console.error("Stream error:", error);
      reject(error);
      stream.end();
    });

    stream.on("end", () => {
      console.log("Stream ended");
      resolve();
    });

    stream.on("close", () => {
      console.log("Stream closed");
      subscribeGeyser();
      resolve();
    });
  });
}

function isSubscribeUpdateTransaction(
  data: SubscribeUpdate
): data is SubscribeUpdate & { transaction: SubscribeUpdateTransaction } {
  return (
    "transaction" in data &&
    typeof data.transaction === "object" &&
    data.transaction !== null &&
    "slot" in data.transaction &&
    "transaction" in data.transaction
  );
}

async function handleMigrationData(data: SubscribeUpdate, isTest: boolean = false) {
  if (!isTest && !isSubscribeUpdateTransaction(data)) {
    return;
  }

  const transaction: any = data?.transaction?.transaction;
  const slot: any = data?.transaction?.slot;
  const meta: any = transaction?.meta;
  const inner_instructions: any = transaction?.transaction?.message?.instructions || meta?.innerInstructions;
  const instructions: any[] = transaction?.transaction?.message?.instructions || meta?.innerInstructions;


  if (!transaction || !slot || !instructions || !inner_instructions || !meta)
    return;

  let flag = false,
    migrationIx = [];
  for (let i = 0; i < instructions.length; i++) {
    const instruction = instructions[i];
    try {
      const hexDt = Buffer.from(instruction?.data).toString("hex");
      if (hexDt.includes("885cc8671cda908c")) {
        flag = true;
        migrationIx = instruction;
      }
    } catch (error) { }
  }

  let migrattionIxFlag = false,
    migrateIx: any[] = [];

  for (let i = 0; i < meta?.innerInstructions.length; i++) {
    const innerInstructions = meta?.innerInstructions[i].instructions;
    if (innerInstructions.length === 43 || innerInstructions.length === 44) {
      migrattionIxFlag = true;
      migrateIx = innerInstructions;
    }
  }


  if (flag && migrattionIxFlag) {
    console.log("===== Migration Detected: ", formatDate(), Date.now());

    const bufferIx = Buffer.from(transaction.signature);
    const signature = base58.encode(bufferIx);
    console.log(`===== Migration Transaction Detected: https://solscan.io/tx/${signature}`);

    try {

      const accountKeys: any = [];
      if (transaction?.transaction?.message?.accountKeys) {
        accountKeys.push(...transaction?.transaction?.message?.accountKeys)
      }
      if (meta?.loadedWritableAddresses) {
        accountKeys.push(...meta?.loadedWritableAddresses)
      }
      if (meta?.loadedReadonlyAddresses) {
        accountKeys.push(...meta?.loadedReadonlyAddresses)
      }

      const accountsDataBuffer = Buffer.from(migrationIx?.accounts);

      // Base Mint
      const tokenA = new PublicKey(base58.encode(Buffer.from(accountKeys[Number(accountsDataBuffer[1])])))
      console.log("tokenA: ", tokenA.toBase58());

      // Quote Mint
      const tokenB = new PublicKey(base58.encode(Buffer.from(accountKeys[Number(accountsDataBuffer[2])])))
      console.log("tokenB: ", tokenB.toBase58());

      const txInstructions: TransactionInstruction[] = []

      const tokenAAta = await getAssociatedTokenAddress(tokenA, adminPublicKey)
      txInstructions.push(createAssociatedTokenAccountInstruction(adminPublicKey, tokenAAta, adminPublicKey, tokenA))

      const poolId = new PublicKey(base58.encode(Buffer.from(accountKeys[Number(accountsDataBuffer[17])])))
      console.log("poolId: ", poolId.toBase58());

      // await raydiumCpmmSwap(tokenB.toBase58(), poolId, 4 * 10 ** 6);
      // tokenA, tokenB => Token to USD1, tokenB, tokenA => USD1 to Token
      txInstructions.push(await raydiumCpmmSwapWithFetch(connection, adminPublicKey, poolId, tokenB, tokenA, BigInt(1 * 10 ** 6), BigInt(0)))

      const tx = new Transaction()
      tx.add(...txInstructions)
      tx.feePayer = adminPublicKey
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      console.log(await connection.simulateTransaction(tx))

      const txId = await sendAndConfirmTransaction(connection, tx, [adminKeypair])
      console.log("https://solscan.io/tx/" + txId);

      console.log("===== Migration Success: ", formatDate(), Date.now());

    } catch (error) {
      console.log("error", error);
    }
  }
}

export function formatDate() {
  const options: any = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  };

  const now = new Date();
  return now.toLocaleString("en-US", options);
}

