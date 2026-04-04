'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPublicClient, http, erc20Abi, formatUnits } from 'viem';
import { worldchain } from 'viem/chains';
import { TOKENS, WORLD_RPC } from '@/lib/constants';

const client = createPublicClient({
  chain: worldchain,
  transport: http(WORLD_RPC),
});

export interface TokenBalance {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  balance: bigint;
  formatted: number;
}

export function useBalances(walletAddress?: string) {
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [usdcBalance, setUsdcBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchBalances = useCallback(async () => {
    if (!walletAddress) {
      const tokenList = Object.values(TOKENS);
      setBalances(tokenList.map((token) => ({
        symbol: token.symbol,
        name: token.name,
        address: token.address,
        decimals: token.decimals,
        balance: 0n,
        formatted: 0,
      })));
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching balances for:', walletAddress);
      const address = walletAddress as `0x${string}`;
      const tokenList = Object.values(TOKENS);

      const results = await Promise.all(
        tokenList.map((token) =>
          client.readContract({
            address: token.address,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address],
          }),
        ),
      );

      // Also get native ETH balance
      const ethBalance = await client.getBalance({ address });

      const tokenBalances: TokenBalance[] = [
        {
          symbol: 'ETH',
          name: 'Ether',
          address: '0x0000000000000000000000000000000000000000' as `0x${string}`,
          decimals: 18,
          balance: ethBalance,
          formatted: Number(formatUnits(ethBalance, 18)),
        },
        ...tokenList.map((token, i) => ({
          symbol: token.symbol,
          name: token.name,
          address: token.address,
          decimals: token.decimals,
          balance: results[i],
          formatted: Number(formatUnits(results[i], token.decimals)),
        })),
      ];

      setBalances(tokenBalances);
      setUsdcBalance(
        tokenBalances.find((t) => t.symbol === 'USDC')?.formatted ?? 0,
      );
    } catch (error) {
      console.error('Failed to fetch balances:', error, 'wallet:', walletAddress);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 15000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  return { balances, usdcBalance, loading, refetch: fetchBalances };
}
