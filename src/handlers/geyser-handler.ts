import Client, {
  CommitmentLevel,
  SubscribeRequest,
  SubscribeUpdate,
  SubscribeUpdateTransaction,
} from '@triton-one/yellowstone-grpc';
import { ClientDuplexStream } from '@grpc/grpc-js';
import base58 from 'bs58';
import { PublicKey } from '@solana/web3.js';
import { logger } from '../core/logger';
import { NetworkError } from '../core/errors';
import { config } from '../core/config';
import { MigrationHandler } from './migration-handler';
import { MigrationTransaction } from '../types';
import {
  RAYDIUM_LAUNCHLAB_PROGRAM_ID,
  RAYDIUM_LAUNCHLAB_AUTHORITY,
} from '../constants';

export class GeyserHandler {
  private client: Client;
  private migrationHandler: MigrationHandler;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.client = new Client(config.geyser.rpc, config.geyser.key, undefined);
    this.migrationHandler = new MigrationHandler(config.admin.privateKey);
  }

  private createSubscribeRequest(): SubscribeRequest {
    return {
      accounts: {},
      slots: {},
      transactions: {
        migrate: {
          accountInclude: [],
          accountExclude: [],
          accountRequired: [
            RAYDIUM_LAUNCHLAB_PROGRAM_ID.toBase58(),
            RAYDIUM_LAUNCHLAB_AUTHORITY.toBase58(),
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

  private sendSubscribeRequest(
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

  private isSubscribeUpdateTransaction(
    data: SubscribeUpdate
  ): data is SubscribeUpdate & { transaction: SubscribeUpdateTransaction } {
    return (
      'transaction' in data &&
      typeof data.transaction === 'object' &&
      data.transaction !== null &&
      'slot' in data.transaction &&
      'transaction' in data.transaction
    );
  }

  private extractMigrationData(data: SubscribeUpdate): MigrationTransaction | null {
    if (!this.isSubscribeUpdateTransaction(data)) {
      return null;
    }

    const transaction: any = data?.transaction?.transaction;
    const slot: any = data?.transaction?.slot;
    const meta: any = transaction?.meta;
    const instructions: any[] =
      transaction?.transaction?.message?.instructions || [];

    if (!transaction || !slot || !instructions || !meta) {
      return null;
    }

    let migrationIx: any = null;
    for (const instruction of instructions) {
      try {
        const hexDt = Buffer.from(instruction?.data).toString('hex');
        if (hexDt.includes('885cc8671cda908c')) {
          migrationIx = instruction;
          break;
        }
      } catch (error) {
      }
    }

    let hasMigrationInnerIx = false;
    for (const innerIxGroup of meta?.innerInstructions || []) {
      if (
        innerIxGroup.instructions.length === 43 ||
        innerIxGroup.instructions.length === 44
      ) {
        hasMigrationInnerIx = true;
        break;
      }
    }

    if (!migrationIx || !hasMigrationInnerIx) {
      return null;
    }

    try {
      const accountKeys: any = [];
      if (transaction?.transaction?.message?.accountKeys) {
        accountKeys.push(...transaction.transaction.message.accountKeys);
      }
      if (meta?.loadedWritableAddresses) {
        accountKeys.push(...meta.loadedWritableAddresses);
      }
      if (meta?.loadedReadonlyAddresses) {
        accountKeys.push(...meta.loadedReadonlyAddresses);
      }

      const accountsDataBuffer = Buffer.from(migrationIx?.accounts);

      const tokenA = new PublicKey(
        base58.encode(Buffer.from(accountKeys[Number(accountsDataBuffer[1])]))
      );

      const tokenB = new PublicKey(
        base58.encode(Buffer.from(accountKeys[Number(accountsDataBuffer[2])]))
      );

      const poolId = new PublicKey(
        base58.encode(Buffer.from(accountKeys[Number(accountsDataBuffer[17])]))
      );

      const bufferIx = Buffer.from(transaction.signature);
      const signature = base58.encode(bufferIx);

      return {
        signature,
        slot,
        tokenA,
        tokenB,
        poolId,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Failed to extract migration data', error);
      return null;
    }
  }

  private async handleMigrationData(data: SubscribeUpdate): Promise<void> {
    const migration = this.extractMigrationData(data);
    if (!migration) {
      return;
    }

    logger.info('Migration detected', {
      signature: migration.signature,
      tokenA: migration.tokenA.toBase58(),
      tokenB: migration.tokenB.toBase58(),
      poolId: migration.poolId.toBase58(),
      timestamp: new Date(migration.timestamp).toISOString(),
    });

    logger.info(
      `Migration transaction: https://solscan.io/tx/${migration.signature}`
    );

    try {
      await this.migrationHandler.handleMigration(migration);
      logger.info('Migration processed successfully', {
        signature: migration.signature,
      });
    } catch (error) {
      logger.error('Failed to process migration', error, {
        signature: migration.signature,
      });
    }
  }

  private handleStreamEvents(
    stream: ClientDuplexStream<SubscribeRequest, SubscribeUpdate>
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      stream.on('data', async (data) => {
        if (data.filters[0] === 'migrate') {
          await this.handleMigrationData(data);
        }
      });

      stream.on('error', (error: Error) => {
        logger.error('Stream error', error);
        reject(error);
        stream.end();
      });

      stream.on('end', () => {
        logger.warn('Stream ended');
        resolve();
      });

      stream.on('close', () => {
        logger.warn('Stream closed, attempting reconnect...');
        this.reconnect();
        resolve();
      });
    });
  }

  private reconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = 5000;
    logger.info(`Reconnecting in ${delay}ms...`);

    this.reconnectTimeout = setTimeout(() => {
      this.subscribe().catch((error) => {
        logger.error('Reconnection failed', error);
        this.reconnect();
      });
    }, delay);
  }

  async subscribe(): Promise<void> {
    try {
      const stream = await this.client.subscribe();
      const request = this.createSubscribeRequest();

      await this.sendSubscribeRequest(stream, request);
      logger.info('Geyser connection established');

      await this.handleStreamEvents(stream);
    } catch (error) {
      logger.error('Error in subscription process', error);
      throw new NetworkError(
        'Failed to establish Geyser connection',
        error instanceof Error ? error : undefined
      );
    }
  }

  async start(): Promise<void> {
    try {
      await this.subscribe();
    } catch (error) {
      logger.error('Initial subscription failed', error);
      this.reconnect();
    }
  }

  stop(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    logger.info('Geyser handler stopped');
  }
}
