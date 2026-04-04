'use client';

import { MiniKit } from '@worldcoin/minikit-js';
import { encodeFunctionData, parseAbi } from 'viem';
import { TOKENS, WORLD_CHAIN_ID } from '@/lib/constants';
import type { WorldIdProof } from '@/lib/worldid';
import WorldInPaperAbi from '@/lib/WorldInPaper.abi.json';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';
const ABI = WorldInPaperAbi as readonly unknown[];

function worldIdTuple(proof: WorldIdProof) {
  return {
    root: proof.root,
    signalHash: proof.signalHash,
    nullifierHash: proof.nullifierHash,
    externalNullifierHash: proof.externalNullifierHash,
    proof: proof.proof,
  };
}

export function useContract() {
  const createGame = async (
    name: string,
    entryAmount: bigint,
    startingWIPBalance: bigint,
    maxPlayers: number,
    startTime: bigint,
    endTime: bigint,
    worldId: WorldIdProof,
  ) => {
    const result = await MiniKit.sendTransaction({
      chainId: WORLD_CHAIN_ID,
      transactions: [
        {
          to: TOKENS.USDC.address,
          data: encodeFunctionData({
            abi: parseAbi(['function approve(address spender, uint256 amount) returns (bool)']),
            functionName: 'approve',
            args: [CONTRACT_ADDRESS as `0x${string}`, entryAmount],
          }),
        },
        {
          to: CONTRACT_ADDRESS,
          data: encodeFunctionData({
            abi: ABI,
            functionName: 'createGame',
            args: [name, entryAmount, startingWIPBalance, maxPlayers, startTime, endTime, worldIdTuple(worldId)],
          }),
        },
      ],
    });
    return result;
  };

  const joinGame = async (gameId: bigint, entryAmount: bigint, worldId: WorldIdProof) => {
    const result = await MiniKit.sendTransaction({
      chainId: WORLD_CHAIN_ID,
      transactions: [
        {
          to: TOKENS.USDC.address,
          data: encodeFunctionData({
            abi: parseAbi(['function approve(address spender, uint256 amount) returns (bool)']),
            functionName: 'approve',
            args: [CONTRACT_ADDRESS as `0x${string}`, entryAmount],
          }),
        },
        {
          to: CONTRACT_ADDRESS,
          data: encodeFunctionData({
            abi: ABI,
            functionName: 'joinGame',
            args: [gameId, worldIdTuple(worldId)],
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
  ) => {
    const result = await MiniKit.sendTransaction({
      chainId: WORLD_CHAIN_ID,
      transactions: [
        {
          to: CONTRACT_ADDRESS,
          data: encodeFunctionData({
            abi: ABI,
            functionName: 'submitTrade',
            args: [gameId, assetAddress, origin, isBuy, amountIn],
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
            abi: ABI,
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
