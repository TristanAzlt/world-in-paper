'use client';

import { IDKit, orbLegacy, type RpContext, type IDKitResult } from '@worldcoin/idkit';
import { keccak256, encodePacked, decodeAbiParameters } from 'viem';

export interface WorldIdProof {
  root: bigint;
  signalHash: bigint;
  nullifierHash: bigint;
  externalNullifierHash: bigint;
  proof: readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
}

const EMPTY_PROOF: WorldIdProof = {
  root: 0n,
  signalHash: 0n,
  nullifierHash: 0n,
  externalNullifierHash: 0n,
  proof: [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n],
};

function hashToField(value: `0x${string}`): bigint {
  return BigInt(keccak256(value)) >> 8n;
}

function computeExternalNullifierHash(appId: string, action: string): bigint {
  const appIdHash = hashToField(encodePacked(['string'], [appId]));
  return hashToField(encodePacked(['uint256', 'string'], [appIdHash, action]));
}

function decodeProof(abiEncodedProof: string): readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint] {
  const decoded = decodeAbiParameters(
    [{ type: 'uint256[8]', name: 'proof' }],
    abiEncodedProof as `0x${string}`,
  );
  return decoded[0] as readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
}

export async function getWorldIdProof(action: string, signal: string): Promise<WorldIdProof> {
  const appId = process.env.NEXT_PUBLIC_APP_ID;
  if (!appId) {
    console.warn('NEXT_PUBLIC_APP_ID not set, using empty proof');
    return EMPTY_PROOF;
  }

  try {
    // Step 1: Get RP signature
    const rpRes = await fetch('/api/rp-signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });

    if (!rpRes.ok) throw new Error('Failed to get RP signature');
    const rpSig = await rpRes.json();

    const rpContext: RpContext = {
      rp_id: rpSig.rp_id,
      nonce: rpSig.nonce,
      created_at: rpSig.created_at,
      expires_at: rpSig.expires_at,
      signature: rpSig.sig,
    };

    // Step 2: Request World ID proof via IDKit
    const request = await IDKit.request({
      app_id: appId as `app_${string}`,
      action,
      rp_context: rpContext,
      allow_legacy_proofs: true,
    }).preset(orbLegacy({ signal }));

    const completion = await request.pollUntilCompletion();

    if (!completion.success) {
      throw new Error('World ID verification cancelled or failed');
    }

    const result = completion.result as IDKitResult;

    // Step 3: Extract v3 response
    if (!('responses' in result) || !result.responses?.length) {
      throw new Error('No v3 responses in IDKit result');
    }

    const response = result.responses[0];
    if (!('merkle_root' in response)) {
      throw new Error('Not a v3 response');
    }

    // Step 4: Compute hashes and decode proof
    const signalHash = response.signal_hash
      ? BigInt(response.signal_hash)
      : hashToField(encodePacked(['string'], [signal]));

    const externalNullifierHash = computeExternalNullifierHash(appId, action);

    return {
      root: BigInt(response.merkle_root),
      signalHash,
      nullifierHash: BigInt(response.nullifier),
      externalNullifierHash,
      proof: decodeProof(response.proof),
    };
  } catch (e) {
    console.error('World ID verification failed:', e);
    throw e;
  }
}

export { EMPTY_PROOF };
