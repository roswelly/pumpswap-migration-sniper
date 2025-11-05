import {
    ApiV3PoolInfoStandardItemCpmm,
    CpmmKeys,
    CpmmParsedRpcData,
    CurveCalculator,
    FeeOn,
    printSimulate,
    TxVersion,
} from '@raydium-io/raydium-sdk-v2'
import { initSdk } from './config'
import { isValidCpmm } from './utils'
import BN from 'bn.js'
import { NATIVE_MINT } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'

export const raydiumCpmmSwap = async (inputMint: string, poolId: string, amount: number) => {
    try {

        const raydium = await initSdk()

        const inputAmount = new BN(amount)

        let poolInfo: ApiV3PoolInfoStandardItemCpmm
        let poolKeys: CpmmKeys | undefined
        let rpcData: CpmmParsedRpcData

        if (raydium.cluster === 'mainnet') {
            // if you wish to get pool info from rpc, also can modify logic to go rpc method directly
            const data = await raydium.api.fetchPoolById({ ids: poolId })
            poolInfo = data[0] as ApiV3PoolInfoStandardItemCpmm
            if (!isValidCpmm(poolInfo.programId)) throw new Error('target pool is not CPMM pool')
            rpcData = await raydium.cpmm.getRpcPoolInfo(poolInfo.id, true)
        } else {
            const data = await raydium.cpmm.getPoolInfoFromRpc(poolId)
            poolInfo = data.poolInfo
            poolKeys = data.poolKeys
            rpcData = data.rpcData
        }

        if (inputMint !== poolInfo.mintA.address && inputMint !== poolInfo.mintB.address)
            throw new Error('input mint does not match pool')

        const baseIn = inputMint === poolInfo.mintA.address

        // swap pool mintA for mintB
        const swapResult = CurveCalculator.swapBaseInput(
            inputAmount,
            baseIn ? rpcData.baseReserve : rpcData.quoteReserve,
            baseIn ? rpcData.quoteReserve : rpcData.baseReserve,
            rpcData.configInfo!.tradeFeeRate,
            rpcData.configInfo!.creatorFeeRate,
            rpcData.configInfo!.protocolFeeRate,
            rpcData.configInfo!.fundFeeRate,
            rpcData.feeOn === FeeOn.BothToken || rpcData.feeOn === FeeOn.OnlyTokenB
        )

        console.log(
            'swap result',
            Object.keys(swapResult).reduce(
                (acc, cur) => ({
                    ...acc,
                    [cur]: swapResult[cur as keyof typeof swapResult].toString(),
                }),
                {}
            )
        )

        /**
         * swapResult.inputAmount -> input amount
         * swapResult.outputAmount -> output amount
         * swapResult.tradeFee -> this swap fee, charge input mint
         */

        const { execute, transaction } = await raydium.cpmm.swap({
            poolInfo,
            poolKeys,
            inputAmount,
            swapResult,
            slippage: 0.001, // range: 1 ~ 0.0001, means 100% ~ 0.01%
            baseIn,

            txVersion: TxVersion.V0,
            // optional: set up priority fee here
            // computeBudgetConfig: {
            //   units: 600000,
            //   microLamports: 4659150,
            // },

            // optional: add transfer sol to tip account instruction. e.g sent tip to jito
            // txTipConfig: {
            //   address: new PublicKey('96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5'),
            //   amount: new BN(10000000), // 0.01 sol
            // },
        })

        // printSimulate([transaction])

        // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
        const { txId } = await execute({ sendAndConfirm: true })
        console.log(`swapped: ${poolInfo.mintA.symbol} to ${poolInfo.mintB.symbol}:`, {
            txId: `https://explorer.solana.com/tx/${txId}`,
        })
    } catch (error) {
        console.error(error)
    }
}