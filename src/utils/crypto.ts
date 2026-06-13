/**
 * Hash a string with SHA-256 using the Web Crypto API.
 * Works in Cloudflare Workers (no Node.js crypto dependency).
 *
 * Used to hash refresh tokens before storing in DB so that
 * even if D1 is compromised, raw JWT tokens are not exposed.
 */
export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a cryptographically secure random string of `length` characters
 * selected from `chars`. Uses crypto.getRandomValues — NOT Math.random.
 *
 * Bias note: each byte is taken mod chars.length. To keep bias negligible,
 * chars.length should be a power of 2 or small enough that 256 % chars.length ≈ 0.
 * All current call-sites use alphabets of length 32 (256 % 32 = 0, perfectly uniform).
 */
export function cryptoRandomChars(chars: string, length: number): string {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => chars[b % chars.length]).join('');
}

/**
 * Generate a cryptographically secure random numeric PIN of `length` digits.
 * Uses crypto.getRandomValues for uniform distribution.
 *
 * Note: Uint16 max is 65535. For length <= 4 (max <= 9999), rejection sampling
 * is applied to avoid modulo bias. For length >= 5, Uint16 range fits within max
 * so the first draw always succeeds — no bias possible.
 */
export function cryptoRandomPin(length = 6): string {
  const max = Math.pow(10, length);
  const buf = new Uint16Array(1);
  for (let attempts = 0; attempts < 100; attempts++) {
    crypto.getRandomValues(buf);
    const n = buf[0];
    if (n < max) return n.toString().padStart(length, '0');
  }
  // Fallback — only reachable for length <= 4 after 100 misses (statistically impossible)
  crypto.getRandomValues(buf);
  return (buf[0] % max).toString().padStart(length, '0');
}

/**
 * Constant-time string comparison to prevent timing attacks on shared secrets.
 * Pads both inputs to the same length before XOR — avoids early-return on length
 * mismatch, which would leak the secret length via response latency variance.
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  const maxLen = Math.max(aBytes.length, bBytes.length);
  const aPadded = new Uint8Array(maxLen);
  const bPadded = new Uint8Array(maxLen);
  aPadded.set(aBytes);
  bPadded.set(bBytes);
  let diff = aBytes.length ^ bBytes.length; // non-zero if lengths differ
  for (let i = 0; i < maxLen; i++) {
    diff |= aPadded[i] ^ bPadded[i];
  }
  return diff === 0;
}
