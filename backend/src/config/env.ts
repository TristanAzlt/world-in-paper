import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    RPC_URL: z.string().url().default('https://ethereum-sepolia-rpc.publicnode.com'),
    CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM contract address').default('0x0000000000000000000000000000000000000000'),
    OBSERVER_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM contract address').default('0x0000000000000000000000000000000000000000'),
    REDIS_URL: z.string().url().default('redis://127.0.0.1:6379'),
    REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
    BODY_LIMIT: z.string().default('10kb'),
    CORS_ORIGIN: z.string().default('*'),
    UNISWAP_API_KEY: z.string().default('')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    const details = parsed.error.issues
        .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
        .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = parsed.data;
export type Env = typeof env;
