import { getAssociatedTokenAddress, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { Connection } from "@solana/web3.js";

const RaydiumCpmmProgramId = new PublicKey("CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C");

/**
 * Derives the AMM config PDA address for a given index
 * Per IDL: amm_config PDA seeds = ["amm_config", index]
 * @param index - The config index (u16)
 * @returns The AMM config PublicKey
 */
export function getAmmConfig(index: number = 0): PublicKey {
    const [ammConfig] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("amm_config"),
            Buffer.from(Uint16Array.from([index]).buffer)
        ],
        RaydiumCpmmProgramId
    );
    return ammConfig;
}

/**
 * Fetches the AMM config address from pool state on-chain
 * @param connection - The Solana connection
 * @param poolState - The pool state PublicKey
 * @returns The AMM config PublicKey
 */
export async function getAmmConfigFromPool(
    connection: Connection,
    poolState: PublicKey
): Promise<PublicKey> {
    const accountInfo = await connection.getAccountInfo(poolState);
    if (!accountInfo) {
        throw new Error(`Pool state ${poolState.toBase58()} not found`);
    }

    // The amm_config field is at offset 8 (after discriminator + amm_config field)
    // According to IDL: PoolState has amm_config as first field (pubkey = 32 bytes)
    const ammConfigBuffer = accountInfo.data.slice(8, 8 + 32);
    return new PublicKey(ammConfigBuffer);
}

// Per IDL: swap_base_input discriminator is [143, 190, 90, 218, 196, 30, 51, 222]
const SWAP_BASE_INPUT_DISCRIMINATOR = Buffer.from([143, 190, 90, 218, 196, 30, 51, 222]);

/**
 * Creates a Raydium CPMM swap_base_input instruction
 * @param userPublicKey - The user performing the swap (must be signer)
 * @param poolState - The pool state account address
 * @param ammConfig - The AMM config account address (can be derived using getAmmConfig())
 * @param inputTokenMint - The mint of the input token
 * @param outputTokenMint - The mint of the output token
 * @param amountIn - The amount of input token to swap (u64)
 * @param minimumAmountOut - Minimum amount of output token to receive (u64)
 */
export const raydiumCpmmSwap = async (
    userPublicKey: PublicKey,
    poolState: PublicKey,
    ammConfig: PublicKey,
    inputTokenMint: PublicKey,
    outputTokenMint: PublicKey,
    amountIn: bigint,
    minimumAmountOut: bigint
) => {
    // Derive PDA for vault_and_lp_mint_auth_seed
    const [authority] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault_and_lp_mint_auth_seed")],
        RaydiumCpmmProgramId
    );

    // User token accounts
    const inputTokenAccount = await getAssociatedTokenAddress(inputTokenMint, userPublicKey);
    const outputTokenAccount = await getAssociatedTokenAddress(outputTokenMint, userPublicKey);

    // Derive vault PDAs for the pool
    const [inputVault] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("pool_vault"),
            poolState.toBuffer(),
            inputTokenMint.toBuffer()
        ],
        RaydiumCpmmProgramId
    );

    const [outputVault] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("pool_vault"),
            poolState.toBuffer(),
            outputTokenMint.toBuffer()
        ],
        RaydiumCpmmProgramId
    );

    // Derive observation state PDA
    const [observationState] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("observation"),
            poolState.toBuffer()
        ],
        RaydiumCpmmProgramId
    );

    // Build instruction data: discriminator + amount_in (u64) + minimum_amount_out (u64)
    const dataLayout = Buffer.alloc(16);
    dataLayout.writeBigUInt64LE(amountIn, 0);
    dataLayout.writeBigUInt64LE(minimumAmountOut, 8);
    const instructionData = Buffer.concat([SWAP_BASE_INPUT_DISCRIMINATOR, dataLayout]);

    // Create Raydium CPMM swap instruction (swap_base_input)
    // Per IDL account order for swap_base_input:
    // 0: payer (signer)
    // 1: authority (PDA)
    // 2: amm_config
    // 3: pool_state (writable)
    // 4: input_token_account (writable)
    // 5: output_token_account (writable)
    // 6: input_vault (writable)
    // 7: output_vault (writable)
    // 8: input_token_program
    // 9: output_token_program
    // 10: input_token_mint
    // 11: output_token_mint
    // 12: observation_state (writable)

    // console.log("userPublicKey: ", userPublicKey)
    // console.log("authority: ", authority)
    // console.log("ammConfig: ", ammConfig)
    // console.log("poolState: ", poolState)
    // console.log("inputTokenAccount: ", inputTokenAccount)
    // console.log("outputTokenAccount: ", outputTokenAccount)
    // console.log("inputVault: ", inputVault)
    // console.log("outputVault: ", outputVault)
    // console.log("TOKEN_PROGRAM_ID: ", TOKEN_PROGRAM_ID)
    // console.log("TOKEN_PROGRAM_ID: ", TOKEN_PROGRAM_ID)
    // console.log("inputTokenMint: ", inputTokenMint)
    // console.log("outputTokenMint: ", outputTokenMint)
    // console.log("observationState: ", observationState)

    const raydiumCpmmSwapInstruction = new TransactionInstruction({
        programId: RaydiumCpmmProgramId,
        keys: [
            { pubkey: userPublicKey, isSigner: true, isWritable: false },                    // 0: payer
            { pubkey: authority, isSigner: false, isWritable: false },                      // 1: authority (PDA)
            { pubkey: ammConfig, isSigner: false, isWritable: false },                       // 2: amm_config
            { pubkey: poolState, isSigner: false, isWritable: true },                        // 3: pool_state
            { pubkey: inputTokenAccount, isSigner: false, isWritable: true },               // 4: input_token_account
            { pubkey: outputTokenAccount, isSigner: false, isWritable: true },              // 5: output_token_account
            { pubkey: inputVault, isSigner: false, isWritable: true },                       // 6: input_vault
            { pubkey: outputVault, isSigner: false, isWritable: true },                     // 7: output_vault
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },               // 8: input_token_program
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },               // 9: output_token_program
            { pubkey: inputTokenMint, isSigner: false, isWritable: false },                  // 10: input_token_mint
            { pubkey: outputTokenMint, isSigner: false, isWritable: false },                 // 11: output_token_mint
            { pubkey: observationState, isSigner: false, isWritable: true },                 // 12: observation_state
        ],
        data: instructionData
    });

    return raydiumCpmmSwapInstruction
}

/**
 * Creates a Raydium CPMM swap_base_input instruction with automatic ammConfig fetching
 * @param connection - The Solana connection
 * @param userPublicKey - The user performing the swap (must be signer)
 * @param poolState - The pool state account address
 * @param inputTokenMint - The mint of the input token
 * @param outputTokenMint - The mint of the output token
 * @param amountIn - The amount of input token to swap (u64)
 * @param minimumAmountOut - Minimum amount of output token to receive (u64)
 */
export const raydiumCpmmSwapWithFetch = async (
    connection: Connection,
    userPublicKey: PublicKey,
    poolState: PublicKey,
    inputTokenMint: PublicKey,
    outputTokenMint: PublicKey,
    amountIn: bigint,
    minimumAmountOut: bigint
) => {
    // Automatically fetch ammConfig from pool state
    const ammConfig = await getAmmConfigFromPool(connection, poolState);

    return raydiumCpmmSwap(
        userPublicKey,
        poolState,
        ammConfig,
        inputTokenMint,
        outputTokenMint,
        amountIn,
        minimumAmountOut
    );
}
