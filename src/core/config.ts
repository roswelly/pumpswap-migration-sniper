import dotenv from 'dotenv';
import { ConfigurationError } from './errors';
import { logger } from './logger';

dotenv.config();

interface Config {
  geyser: {
    rpc: string;
    key: string;
  };
  rpc: {
    url: string;
    grpcUrl?: string;
    grpcToken?: string;
  };
  database: {
    url: string;
    enabled: boolean;
  };
  admin: {
    privateKey: string;
  };
  cluster: 'mainnet' | 'devnet';
  trading: {
    tickers: string[];
    slippage: number;
    priorityFee?: number;
  };
}

class ConfigManager {
  private config: Config | null = null;

  private validateConfig(): Config {
    const geyserRpc = process.env.GEYSER_RPC;
    const geyserKey = process.env.GEYSER_KEY;
    const rpcUrl = process.env.RPC_URL;
    const dbUrl = process.env.DB_URL;
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
    const cluster = (process.env.CLUSTER || 'mainnet') as 'mainnet' | 'devnet';

    const errors: string[] = [];

    if (!geyserRpc) errors.push('GEYSER_RPC is required');
    if (!geyserKey) errors.push('GEYSER_KEY is required');
    if (!rpcUrl) errors.push('RPC_URL is required');
    if (!adminPrivateKey) errors.push('ADMIN_PRIVATE_KEY is required');

    if (errors.length > 0) {
      throw new ConfigurationError(
        `Missing required environment variables: ${errors.join(', ')}`
      );
    }

    return {
      geyser: {
        rpc: geyserRpc!,
        key: geyserKey!,
      },
      rpc: {
        url: rpcUrl!,
        grpcUrl: process.env.GRPC_URL,
        grpcToken: process.env.GRPC_TOKEN,
      },
      database: {
        url: dbUrl || '',
        enabled: !!dbUrl,
      },
      admin: {
        privateKey: adminPrivateKey!,
      },
      cluster,
      trading: {
        tickers: process.env.TICKERS
          ? process.env.TICKERS.split(',').map((t) => t.trim())
          : [],
        slippage: parseFloat(process.env.SLIPPAGE || '0.001'),
        priorityFee: process.env.PRIORITY_FEE
          ? parseInt(process.env.PRIORITY_FEE, 10)
          : undefined,
      },
    };
  }

  getConfig(): Config {
    if (!this.config) {
      try {
        this.config = this.validateConfig();
        logger.info('Configuration loaded successfully');
      } catch (error) {
        logger.error('Failed to load configuration', error);
        throw error;
      }
    }
    return this.config;
  }

  reload(): void {
    this.config = null;
    dotenv.config();
    this.getConfig();
  }
}

export const configManager = new ConfigManager();
export const config = configManager.getConfig();

export const GEYSER_RPC = config.geyser.rpc;
export const GEYSER_KEY = config.geyser.key;
export const RPC_URL = config.rpc.url;
export const grpcUrl = config.rpc.grpcUrl || '';
export const grpcToken = config.rpc.grpcToken || '';
export const tickers = config.trading.tickers;
