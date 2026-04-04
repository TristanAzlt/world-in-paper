export const WORLD_CHAIN_ID = 480;
export const WORLD_RPC = 'https://worldchain-mainnet.g.alchemy.com/public';

export const TOKENS = {
  USDC: {
    address: '0x79A02482A880bCE3F13e09Da970dC34db4CD24d1' as `0x${string}`,
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
  },
  WLD: {
    address: '0x2cFc85d8E48F8EAB294be644d9E25C3030863003' as `0x${string}`,
    decimals: 18,
    symbol: 'WLD',
    name: 'Worldcoin',
  },
  WETH: {
    address: '0x4200000000000000000000000000000000000006' as `0x${string}`,
    decimals: 18,
    symbol: 'WETH',
    name: 'Wrapped Ether',
  },
  WBTC: {
    address: '0x03C7054BCB39f7b2e5B2c7AcB37583e32D70Cfa3' as `0x${string}`,
    decimals: 8,
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
  },
} as const;

export const UNISWAP_API_KEY = process.env.NEXT_PUBLIC_UNISWAP_API_KEY || '';
export const UNISWAP_API_URL = 'https://trade-api.gateway.uniswap.org/v1';
