import { Router } from 'express';
import { quoteRequestSchema, quoteResponseSchema } from '../services/quote/quote.schema';
import { JupiterService } from '../services/jupiter/jupiter.service';
import { UniswapService } from '../services/uniswap/uniswap.service';
import { HyperliquidService } from '../services/hyperliquid/hyperliquid.service';
import { verifyZod } from '../utils/verify-zod';

export class QuoteRoute {
    public router: Router = Router();

    constructor(
        private readonly uniswapService: UniswapService,
        private readonly jupiterService: JupiterService,
        private readonly hyperliquidService: HyperliquidService
    ) {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post('/', this.getQuote);
    }

    private getQuote = async (req: any, res: any) => {
        const validated = verifyZod(quoteRequestSchema, req.body);

        if (!validated.success) {
            return res.status(400).json({
                error: 'Invalid body',
                details: validated.errors
            });
        }

        try {
            const { assetId, origin, isBuy, amount } = validated.data;

            let price: number;
            switch (origin) {
                case 'solana':
                    price = await this.jupiterService.getQuote(assetId, isBuy, amount);
                    break;
                case 'base':
                case 'ethereum':
                case 'bsc':
                case 'worldchain':
                    price = await this.uniswapService.getQuote(assetId, isBuy, amount, origin);
                    break;
                case 'hyperliquid':
                    price = await this.hyperliquidService.getMidPrice(assetId);
                    break;
                default:
                    throw new Error(`Unknown origin: ${origin}`);
            }

            const payload = quoteResponseSchema.parse({
                assetId: validated.data.assetId,
                origin: validated.data.origin,
                isBuy: validated.data.isBuy,
                amount: validated.data.amount,
                price
            });

            return res.status(200).json(payload);
        } catch (error) {
            return res.status(500).json({
                error: 'Failed to fetch quote',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };
}
