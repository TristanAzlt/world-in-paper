import { env } from '../../config';
import type { Origin } from '../../types/origin';

const USDC_BY_ORIGIN: Partial<Record<Origin, string>> = {
    base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    bsc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    worldchain: '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1'
};

const CHAIN_ID_BY_ORIGIN: Partial<Record<Origin, number>> = {
    base: 8453,
    ethereum: 1,
    bsc: 56,
    worldchain: 480
};

const DUMMY_SWAPPER = '0x0000000000000000000000000000000000000001';
const UNISWAP_PROTOCOLS = ["V2", "V3", "V4"] as const;
const UNISWAP_ROUTING_PREFERENCE = "BEST_PRICE" as const;

export class UniswapService {
    async getQuote(tokenAddress: string, isBuy: boolean, amount: string, origin: Origin): Promise<number> {
        const chainId = CHAIN_ID_BY_ORIGIN[origin];
        const usdc = USDC_BY_ORIGIN[origin];

        if (!chainId || !usdc) {
            throw new Error(`Unsupported Uniswap chain for origin ${origin}`);
        }

        if (!env.UNISWAP_API_KEY) {
            throw new Error('UNISWAP_API_KEY is missing');
        }

        const tokenIn = isBuy ? usdc : tokenAddress;
        const tokenOut = isBuy ? tokenAddress : usdc;

        const response = await fetch('https://trade-api.gateway.uniswap.org/v1/quote', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-api-key': env.UNISWAP_API_KEY
            },
            body: JSON.stringify({
                type: 'EXACT_INPUT',
                amount,
                tokenIn,
                tokenOut,
                tokenInChainId: chainId,
                tokenOutChainId: chainId,
                swapper: DUMMY_SWAPPER,
                protocols: [...UNISWAP_PROTOCOLS],
                routingPreference: UNISWAP_ROUTING_PREFERENCE
            })
        });

        if (!response.ok) {
            throw new Error(`Uniswap API HTTP ${response.status}`);
        }

        const data = await response.json() as any;

        const inAmt = Number(data.quote?.input?.amount);
        const outAmt = Number(data.quote?.output?.amount);
        const route = data.quote?.route?.[0];

        if (!Array.isArray(route) || route.length === 0) {
            throw new Error('Invalid Uniswap route');
        }

        const firstHop = route[0];
        const lastHop = route[route.length - 1];
        const inDecimals = Number(firstHop?.tokenIn?.decimals);
        const outDecimals = Number(lastHop?.tokenOut?.decimals);

        if (![inAmt, outAmt, inDecimals, outDecimals].every(Number.isFinite)) {
            throw new Error('Invalid Uniswap quote payload');
        }

        if (isBuy) {
            const usdcIn = inAmt / 10 ** inDecimals;
            const tokensOut = outAmt / 10 ** outDecimals;
            return usdcIn / tokensOut;
        }

        const tokensIn = inAmt / 10 ** inDecimals;
        const usdcOut = outAmt / 10 ** outDecimals;
        return usdcOut / tokensIn;
    }
}

export const uniswapService = new UniswapService();
