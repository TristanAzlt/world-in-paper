const USDC_SOL = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

export class JupiterService {
    async getQuote(mintAddress: string, isBuy: boolean, amount: string): Promise<number> {
        const tokenDecimals = await this.getSolanaTokenDecimals(mintAddress);
        const tokenScale = 10 ** tokenDecimals;

        const inputMint = isBuy ? USDC_SOL : mintAddress;
        const outputMint = isBuy ? mintAddress : USDC_SOL;

        const response = await fetch(
            `https://lite-api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`
        );

        if (!response.ok) {
            throw new Error(`Jupiter HTTP ${response.status}`);
        }

        const data = await response.json() as any;
        const inAmt = Number(data?.inAmount);
        const outAmt = Number(data?.outAmount);

        if (![inAmt, outAmt].every(Number.isFinite)) {
            throw new Error('Invalid Jupiter quote payload');
        }

        if (isBuy) {
            return (inAmt / 1e6) / (outAmt / tokenScale);
        }

        return (outAmt / 1e6) / (inAmt / tokenScale);
    }

    private async getSolanaTokenDecimals(mintAddress: string): Promise<number> {
        const response = await fetch(SOLANA_RPC, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getAccountInfo',
                params: [mintAddress, { encoding: 'jsonParsed' }]
            })
        });

        if (!response.ok) {
            throw new Error(`Solana RPC HTTP ${response.status}`);
        }

        const data = await response.json() as any;
        const decimals = Number(data?.result?.value?.data?.parsed?.info?.decimals);

        if (!Number.isFinite(decimals)) {
            throw new Error('Invalid Solana mint metadata');
        }

        return decimals;
    }
}

export const jupiterService = new JupiterService();
