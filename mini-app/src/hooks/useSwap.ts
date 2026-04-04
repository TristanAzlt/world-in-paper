'use client';

import { useState } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { encodeFunctionData, parseAbi, encodePacked } from 'viem';
import { TOKENS, WORLD_CHAIN_ID } from '@/lib/constants';

// Uniswap V3 SwapRouter on World Chain (real deployment)
const SWAP_ROUTER = '0x091AD9e2e6e5eD44c1c66dB50e49A601F9f36cF6';

// Tokens that need multi-hop via WETH (no direct pool to USDC)
const MULTI_HOP_TOKENS = new Set([
  TOKENS.USOL.address.toLowerCase(),
  TOKENS.UXRP.address.toLowerCase(),
]);

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
      const quoteData = await getQuote(tokenInAddress, TOKENS.USDC.address, amount);
      if (!quoteData?.quote) throw new Error('No quote');

      const minOut = BigInt(quoteData.quote.output.amount);
      const minAmountOut = (minOut * 95n) / 100n;

      const isMultiHop = MULTI_HOP_TOKENS.has(tokenInAddress.toLowerCase());

      let swapData: string;

      if (isMultiHop) {
        // Multi-hop: token → WETH (fee 3000) → USDC (fee 500)
        const path = encodePacked(
          ['address', 'uint24', 'address', 'uint24', 'address'],
          [tokenInAddress as `0x${string}`, 3000, TOKENS.WETH.address, 500, TOKENS.USDC.address],
        );

        swapData = encodeFunctionData({
          abi: parseAbi([
            'function exactInput((bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)',
          ]),
          functionName: 'exactInput',
          args: [{
            path,
            recipient: walletAddress as `0x${string}`,
            amountIn: BigInt(amount),
            amountOutMinimum: minAmountOut,
          }],
        });
      } else {
        // Single hop: token → USDC (fee 500)
        swapData = encodeFunctionData({
          abi: parseAbi([
            'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
          ]),
          functionName: 'exactInputSingle',
          args: [{
            tokenIn: tokenInAddress as `0x${string}`,
            tokenOut: TOKENS.USDC.address,
            fee: 500,
            recipient: walletAddress as `0x${string}`,
            amountIn: BigInt(amount),
            amountOutMinimum: minAmountOut,
            sqrtPriceLimitX96: 0n,
          }],
        });
      }

      const result = await MiniKit.sendTransaction({
        chainId: WORLD_CHAIN_ID,
        transactions: [
          {
            to: tokenInAddress,
            data: encodeFunctionData({
              abi: parseAbi(['function approve(address spender, uint256 amount) returns (bool)']),
              functionName: 'approve',
              args: [SWAP_ROUTER, BigInt(amount)],
            }),
          },
          {
            to: SWAP_ROUTER,
            data: swapData,
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
