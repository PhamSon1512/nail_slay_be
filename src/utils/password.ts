// Password hashing utilities using Web Crypto PBKDF2 (Cloudflare Workers compatible)

// ─── Private helpers (DRY: reused by hashPassword + comparePassword) ──────────

/** Convert a Uint8Array to a lowercase hex string. */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Convert a hex string to a Uint8Array.  Returns null if input is malformed. */
function hexToBytes(hex: string): Uint8Array | null {
  const pairs = hex.match(/.{2}/g);
  if (!pairs) return null;
  return Uint8Array.from(pairs.map((h) => parseInt(h, 16)));
}

/** Derive a PBKDF2 key from password + salt. */
async function deriveKey(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      // Cast to ArrayBuffer to satisfy TS strict types (avoid SharedArrayBuffer conflict)
      salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Hash a password using PBKDF2 with a random 16-byte salt.
 * Output format: "<salt_hex>:<hash_hex>"
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hashBuf = await deriveKey(password, salt);
  return `${bytesToHex(salt)}:${bytesToHex(new Uint8Array(hashBuf))}`;
}

/**
 * Constant-time comparison to prevent timing attacks on sensitive string comparisons.
 * Pads the shorter array to avoid leaking length information via early return.
 */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  // Use the longer length so both arrays are iterated fully — prevents timing leak
  // from early return when lengths differ.
  const len = Math.max(a.length, b.length);
  let diff = a.length !== b.length ? 1 : 0; // pre-seed diff if lengths differ
  for (let i = 0; i < len; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

/**
 * Compare a plaintext password against a stored PBKDF2 hash.
 * Returns false for any malformed stored value.
 */
export async function comparePassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) return false;

  const salt = hexToBytes(saltHex);
  const storedArr = hexToBytes(hashHex);
  if (!salt || !storedArr) return false;

  const expectedBuf = await deriveKey(password, salt);
  return timingSafeEqual(new Uint8Array(expectedBuf), storedArr);
}
