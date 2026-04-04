import { Router } from 'express';
import { z } from 'zod';
import { GeckoTerminalService } from '../services/gecko-terminal/gecko-terminal.service';
import { HyperliquidService } from '../services/hyperliquid/hyperliquid.service';
import { ORIGINS } from '../types/origin';
import { verifyZod } from '../utils/verify-zod';
import { getRedisClient } from '../utils/redis';

const getAssetsQuerySchema = z.object({
    origin: z.enum(ORIGINS)
});

const CACHE_TTL_SECONDS = 60;


export class AssetsRoute {
    public router: Router = Router();

    private redis = getRedisClient();

    constructor(
        private readonly geckoTerminalService: GeckoTerminalService,
        private readonly hyperliquidService: HyperliquidService

    ) {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get('/', this.getAssets);
    }

    private getAssets = async (req: any, res: any) => {
        const validated = verifyZod(getAssetsQuerySchema, req.query);

        if (!validated.success) {
            return res.status(400).json({
                error: 'Invalid query',
                details: validated.errors
            });
        }

        const { origin } = validated.data;

        const cacheKey = `assets:origin:${origin}`;

        try {
            const cached = await this.redis.get(cacheKey);

            if (cached) {
                return res.status(200).json(JSON.parse(cached));
            }

            if (origin === 'hyperliquid') {
                const categories = await this.hyperliquidService.getCategorizedAssets();
                const tokens = Object.values(categories).flat();
                const payload = { origin, tokens, categories };

                await this.redis.set(cacheKey, JSON.stringify(payload), {
                    EX: CACHE_TTL_SECONDS
                });

                return res.status(200).json(payload);
            }

            const tokens = await this.geckoTerminalService.getTrendingAssetsByOrigin(origin);
            const payload = { origin, tokens };

            await this.redis.set(cacheKey, JSON.stringify(payload), {
                EX: CACHE_TTL_SECONDS
            });

            return res.status(200).json(payload);
        } catch (error) {
            return res.status(500).json({
                error: 'Failed to fetch assets',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
