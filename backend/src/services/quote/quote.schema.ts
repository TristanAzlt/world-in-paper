import { z } from 'zod';
import { ORIGINS } from '../../types/origin';

export const quoteRequestSchema = z.object({
    assetId: z.string().min(1),
    origin: z.enum(ORIGINS),
    isBuy: z.boolean(),
    amount: z.string().regex(/^\d+$/, 'amount must be a numeric string')
});

export const quoteResultSchema = z.object({
    price: z.number().finite().positive()
});

export const quoteResponseSchema = z.object({
    assetId: z.string(),
    origin: z.enum(ORIGINS),
    isBuy: z.boolean(),
    amount: z.string(),
    price: z.number().finite().positive()
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type QuoteResult = z.infer<typeof quoteResultSchema>;
export type QuoteResponse = z.infer<typeof quoteResponseSchema>;
