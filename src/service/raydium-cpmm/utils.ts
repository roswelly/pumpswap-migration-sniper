import { CREATE_CPMM_POOL_PROGRAM, DEVNET_PROGRAM_ID, getPdaAmmConfigId, getPdaPoolId } from '@raydium-io/raydium-sdk-v2'
import { PublicKey } from '@solana/web3.js'

const VALID_PROGRAM_ID = new Set([
    CREATE_CPMM_POOL_PROGRAM.toBase58(),
    DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM.toBase58(),
])

export const isValidCpmm = (id: string) => VALID_PROGRAM_ID.has(id)