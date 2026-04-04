'use server';
import { hashNonce } from './client-helpers';

export const getNewNonces = async () => {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const signedNonce = await hashNonce({ nonce });
  return { nonce, signedNonce };
};
