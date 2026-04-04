'use client';

import { useState } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { encodeFunctionData } from 'viem';
import { TOKENS, WORLD_CHAIN_ID } from '@/lib/constants';

const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3';
const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

interface SwapQuote {
  amountOut: string;
  priceImpact: number;
  gasEstimate: string;
}

export function useSwap(walletAddress?: string) {
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<SwapQuote | null>(null);

  const getQuote = async (
    tokenInAddress: string,
    tokenOutAddress: string,
    amount: string,
  ) => {
    try {
      const res = await fetch('/api/swap-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'EXACT_INPUT',
          amount,
          tokenIn: tokenInAddress,
          tokenOut: tokenOutAddress,
          tokenInChainId: WORLD_CHAIN_ID,
          tokenOutChainId: WORLD_CHAIN_ID,
          swapper: walletAddress || '0x0000000000000000000000000000000000000001',
        }),
      });

      if (!res.ok) throw new Error(`API ${res.status}`);

      const data = await res.json();
      if (data.quote) {
        setQuote({
          amountOut: data.quote.output.amount,
          priceImpact: data.quote.priceImpact || 0,
          gasEstimate: data.quote.gasUseEstimate || '0',
        });
      }

      return data;
    } catch (error) {
      console.error('Quote failed:', error);
      return null;
    }
  };

  const executeSwap = async (
    tokenInAddress: string,
    amount: string,
  ) => {
    if (!walletAddress) return null;
    setLoading(true);

    try {
      // Get quote + swap calldata in one server call to minimize deadline issues
      const res = await fetch('/api/swap-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _quoteAndSwap: true,
          type: 'EXACT_INPUT',
          amount,
          tokenIn: tokenInAddress,
          tokenOut: TOKENS.USDC.address,
          tokenInChainId: WORLD_CHAIN_ID,
          tokenOutChainId: WORLD_CHAIN_ID,
          swapper: walletAddress,
        }),
      });
      const swapData = await res.json();
      if (!swapData.swap) throw new Error('No swap data: ' + JSON.stringify(swapData));

      const routerAddress = swapData.swap.to;

      const result = await MiniKit.sendTransaction({
        chainId: WORLD_CHAIN_ID,
        transactions: [
          {
            to: tokenInAddress,
            data: encodeFunctionData({
              abi: [{
                name: 'approve',
                type: 'function',
                inputs: [
                  { name: 'spender', type: 'address' },
                  { name: 'amount', type: 'uint256' },
                ],
                outputs: [{ name: '', type: 'bool' }],
                stateMutability: 'nonpayable',
              }],
              functionName: 'approve',
              args: [PERMIT2, MAX_UINT256],
            }),
          },
          {
            to: PERMIT2,
            data: encodeFunctionData({
              abi: [{
                name: 'approve',
                type: 'function',
                inputs: [
                  { name: 'token', type: 'address' },
                  { name: 'spender', type: 'address' },
                  { name: 'amount', type: 'uint160' },
                  { name: 'expiration', type: 'uint48' },
                ],
                outputs: [],
                stateMutability: 'nonpayable',
              }],
              functionName: 'approve',
              args: [tokenInAddress, routerAddress, BigInt(amount), 0],
            }),
          },
          {
            to: routerAddress,
            data: swapData.swap.data,
          },
        ],
      });

      console.log('Swap result:', JSON.stringify(result));
      return result;
    } catch (error) {
      console.error('Swap failed:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { getQuote, executeSwap, quote, loading };
}
