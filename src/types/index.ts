import { PublicKey } from '@solana/web3.js';

export interface FormattedTransactionData {
  type: string;
  dex: string;
  tx: string;
  poolReserves: unknown;
  tokenPrice: number;
}

export interface StreamingData {
  dex: string;
  type: string;
  tx: string;
  poolReserves: {
    token0: string;
    token1: string;
    reserveToken0: number;
    reserveToken1: number;
  };
  tokenPrice: number;
  createdAt: Date;
}

export interface TokenData {
  mint: string;
  dex: string;
}

export interface PumpPoolInfo {
  baseAmountIn: bigint;
  quoteAmountIn: bigint;
  coinCreator: PublicKey;
}

export interface CreatePoolType {
  baseMint: PublicKey;
  quoteMint: PublicKey;
  baseTokenProgram: PublicKey;
  quoteTokenProgram: PublicKey;
  creator: PublicKey;
}

export interface TradeType {
  baseMint: PublicKey;
  quoteMint: PublicKey;
  pool: PublicKey;
  baseTokenProgram: PublicKey;
  quoteTokenProgram: PublicKey;
  user: PublicKey;
  coinCreator: PublicKey;
}

export interface WithdrawType {
  index: number;
  creator: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  user: PublicKey;
}

export interface DepositType {
  pool: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  user: PublicKey;
}

export interface MigrationTransaction {
  signature: string;
  slot: number;
  tokenA: PublicKey;
  tokenB: PublicKey;
  poolId: PublicKey;
  timestamp: number;
}

export interface ParsedLaunchLog {
  name: string;
  symbol: string;
  uri: string;
  mint: string;
}

export interface ParsedCreatePoolLog {
  baseAmountIn: bigint;
  quoteAmountIn: bigint;
  coinCreator: PublicKey;
}
