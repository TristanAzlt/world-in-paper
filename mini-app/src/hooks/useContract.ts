'use client';

import { MiniKit } from '@worldcoin/minikit-js';
import { encodeFunctionData, parseAbi } from 'viem';
import { TOKENS, WORLD_CHAIN_ID } from '@/lib/constants';
import WorldInPaperAbi from '@/lib/WorldInPaper.abi.json';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';

export function useContract() {
  const createGame = async (
    entryAmount: bigint,
    startingWIPBalance: bigint,
    maxPlayers: number,
    startTime: bigint,
    endTime: bigint,
  ) => {
    const result = await MiniKit.sendTransaction({
      chainId: WORLD_CHAIN_ID,
      transactions: [
        // Approve USDC for the entry amount (creator auto-joins)
        {
          to: TOKENS.USDC.address,
          data: encodeFunctionData({
            abi: parseAbi(['function approve(address spender, uint256 amount) returns (bool)']),
            functionName: 'approve',
            args: [CONTRACT_ADDRESS as `0x${string}`, entryAmount],
          }),
        },
        // Create game
        {
          to: CONTRACT_ADDRESS,
          data: encodeFunctionData({
            abi: WorldInPaperAbi as any,
            functionName: 'createGame',
            args: [entryAmount, startingWIPBalance, maxPlayers, startTime, endTime],
          }),
        },
      ],
    });
    return result;
  };

  const joinGame = async (gameId: bigint, entryAmount: bigint) => {
    const result = await MiniKit.sendTransaction({
      chainId: WORLD_CHAIN_ID,
      transactions: [
        // Approve USDC
        {
          to: TOKENS.USDC.address,
          data: encodeFunctionData({
            abi: parseAbi(['function approve(address spender, uint256 amount) returns (bool)']),
            functionName: 'approve',
            args: [CONTRACT_ADDRESS as `0x${string}`, entryAmount],
          }),
        },
        // Join
        {
          to: CONTRACT_ADDRESS,
          data: encodeFunctionData({
            abi: WorldInPaperAbi as any,
            functionName: 'joinGame',
            args: [gameId],
          }),
        },
      ],
    });
    return result;
  };

  const submitTrade = async (
    gameId: bigint,
    assetAddress: string,
    origin: number,
    isBuy: boolean,
    amountIn: bigint,
    worldIdProof: {
      nullifier: bigint;
      action: bigint;
      rpId: bigint;
      nonce: bigint;
      signalHash: bigint;
      expiresAtMin: bigint;
      issuerSchemaId: bigint;
      credentialGenesisIssuedAtMin: bigint;
      zeroKnowledgeProof: [bigint, bigint, bigint, bigint, bigint];
    },
  ) => {
    const result = await MiniKit.sendTransaction({
      chainId: WORLD_CHAIN_ID,
      transactions: [
        {
          to: CONTRACT_ADDRESS,
          data: encodeFunctionData({
            abi: WorldInPaperAbi as any,
            functionName: 'submitTrade',
            args: [gameId, assetAddress, origin, isBuy, amountIn, worldIdProof],
          }),
        },
      ],
    });
    return result;
  };

  const claimGame = async (gameId: bigint) => {
    const result = await MiniKit.sendTransaction({
      chainId: WORLD_CHAIN_ID,
      transactions: [
        {
          to: CONTRACT_ADDRESS,
          data: encodeFunctionData({
            abi: WorldInPaperAbi as any,
            functionName: 'claimGame',
            args: [gameId],
          }),
        },
      ],
    });
    return result;
  };

  return { createGame, joinGame, submitTrade, claimGame };
}
