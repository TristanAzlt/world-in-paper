export const ORIGINS = [
    'base',
    'ethereum',
    'bsc',
    'solana',
    'worldchain',
    'hyperliquid'
] as const;

export type Origin = (typeof ORIGINS)[number];

export const GECKOTERMINAL_NETWORK_BY_ORIGIN: Partial<Record<Origin, string>> = {
    base: 'base',
    ethereum: 'eth',
    bsc: 'bsc',
    solana: 'solana',
    worldchain: 'world-chain'
};
