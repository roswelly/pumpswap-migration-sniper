import { VersionedTransaction } from "@solana/web3.js";
import base58 from "bs58";
import axios from "axios";

export const executeJitoTx = async (transactions: VersionedTransaction[]) => {
    try {
        let serializedTransactions = [];
        for (let i = 0; i < transactions.length; i++) {
            const serializedTransaction = base58.encode(transactions[i].serialize());
            serializedTransactions.push(serializedTransaction);
        }

        const endpoints = [
             'https://mainnet.block-engine.jito.wtf/api/v1/bundles',
             'https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles',
             'https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles',
             'https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles',
             'https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles',
        ];

        const requests = endpoints.map((url) =>
            axios.post(url, {
                jsonrpc: '2.0',
                id: 1,
                method: 'sendBundle',
                params: [serializedTransactions],
            })
        );

        // console.log('Sending transactions to endpoints...');

        const results = await Promise.all(requests.map((p) => p.catch((e) => e)));

        const successfulResults = results.filter((result) => !(result instanceof Error));

        return true
    } catch (error) {
        console.log('Error during transaction execution', error);
        return false
    }
}




