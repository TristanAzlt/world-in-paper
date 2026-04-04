import { z } from 'zod';

export const hyperliquidCategorySchema = z.enum([
    'crypto',
    'stocks',
    'indices',
    'commodities'
]);

export const hyperliquidUniverseItemSchema = z.object({
    name: z.string().min(1),
    isDelisted: z.boolean().optional()
});

export const hyperliquidAssetContextSchema = z.object({
    markPx: z.string().nullable().optional(),
    openInterest: z.string().nullable().optional()
});

export const hyperliquidMetaAndAssetCtxSchema = z.tuple([
    z.object({
        universe: z.array(hyperliquidUniverseItemSchema)
    }),
    z.array(hyperliquidAssetContextSchema)
]);

export const hyperliquidMetaAndAssetCtxsSchema = z.union([
    hyperliquidMetaAndAssetCtxSchema,
    z.array(hyperliquidMetaAndAssetCtxSchema)
]);

export const hyperliquidAssetSchema = z.object({
    origin: z.literal('hyperliquid'),
    category: hyperliquidCategorySchema,
    address: z.string().min(1),
    name: z.string().min(1),
    symbol: z.string().min(1),
    image: z.string().url(),
    price: z.number().finite().positive(),
    market_cap: z.number().finite().positive()
});

export const hyperliquidAssetSelectionItemSchema = z.object({
    name: z.string().min(1),
    category: hyperliquidCategorySchema
});

export const hyperliquidAssetSelectionSchema = z.object({
    assets: z.array(hyperliquidAssetSelectionItemSchema).min(1)
});

export type HyperliquidCategory = z.infer<typeof hyperliquidCategorySchema>;
export type HyperliquidAsset = z.infer<typeof hyperliquidAssetSchema>;
export type HyperliquidMetaAndAssetCtxEntry = z.infer<typeof hyperliquidMetaAndAssetCtxSchema>;
export type HyperliquidAssetSelection = z.infer<typeof hyperliquidAssetSelectionSchema>;
