import { PublicKey } from "@solana/web3.js";

export interface PumpPoolInfo {
    baseAmountIn: bigint;
    quoteAmountIn: bigint;
    coinCreator: PublicKey;
}