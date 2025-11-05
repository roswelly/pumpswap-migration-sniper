import axios from 'axios';
import { VersionedTransaction } from '@solana/web3.js';
import base58 from 'bs58';

export const executeJitoTxSdk = async (transactions: VersionedTransaction[]) => {
    try {
        const serializedTransactions: string[] = [];
        for (let i = 0; i < transactions.length; i++) {
            const serializedTransaction = base58.encode(transactions[i].serialize());
            serializedTransactions.push(serializedTransaction);
        }
        // console.log("serializedTransactions: ", serializedTransactions.length);
        const config = {
            headers: {
                "Content-Type": "application/json",
            },
        };
        const data = {
            jsonrpc: "2.0",
            id: 1,
            method: "sendBundle",
            params: [serializedTransactions],
        };
        const response = await axios
            .post(
                process.env.QUICK_URL as string,
                data,
                config
            )
        return response.data
    } catch (error) {
        // console.log(error)
        return null
    }
}