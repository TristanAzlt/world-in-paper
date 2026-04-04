import { z } from 'zod';
import { ORIGINS } from '../../types/origin';

export const geckoTokenIncludedSchema = z.object({
    id: z.string(),
    type: z.literal('token'),
    attributes: z.object({
        address: z.string().min(1),
        name: z.string().min(1),
        symbol: z.string().min(1),
        image_url: z.string().url().nullable().optional()
    })
});

export const geckoPoolSchema = z.object({
    attributes: z.object({
        base_token_price_usd: z.string().min(1).nullable().optional(),
        market_cap_usd: z.string().min(1).nullable().optional()
    }),
    relationships: z.object({
        base_token: z.object({
            data: z.object({
                id: z.string().min(1),
                type: z.literal('token')
            })
        })
    })
});

export const geckoTrendingPoolsSchema = z.object({
    data: z.array(geckoPoolSchema),
    included: z.array(
        z.union([
            geckoTokenIncludedSchema,
            z.object({
                id: z.string(),
                type: z.string(),
                attributes: z.record(z.string(), z.unknown()).optional()
            })
        ])
    ).optional()
});

export const outputAssetSchema = z.object({
    origin: z.enum(ORIGINS),
    address: z.string().min(1),
    name: z.string().min(1),
    symbol: z.string().min(1),
    image: z.string().url(),
    price: z.number().finite(),
    market_cap: z.number().finite()
});

export type GeckoTokenIncluded = z.infer<typeof geckoTokenIncludedSchema>;
export type AssetToken = z.infer<typeof outputAssetSchema>;
