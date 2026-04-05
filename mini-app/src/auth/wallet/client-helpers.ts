/**
 * Generates an HMAC-SHA256 hash of the provided nonce using a secret key from the environment.
 * Uses Web Crypto API (compatible with Edge Runtime).
 */
export const hashNonce = async ({ nonce }: { nonce: string }): Promise<string> => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(process.env.HMAC_SECRET_KEY!),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(nonce));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};
