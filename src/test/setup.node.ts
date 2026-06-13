import { createHash, webcrypto } from 'node:crypto';

/**
 * Global setup for the Node forks pool (coverage run).
 *
 * Problem: The W3C Web Crypto API (crypto.subtle) does NOT include MD5.
 * Cloudflare Workers extends it with MD5 support. hono/utils/crypto#md5()
 * calls crypto.subtle.digest('MD5', ...) which throws in Node:
 *   NotSupportedError: Unrecognized algorithm name
 *
 * Fix: Patch crypto.subtle.digest to intercept 'MD5' and delegate to
 * Node's built-in createHash('md5'). All other algorithms are forwarded
 * to the original implementation unmodified.
 *
 * This approach is safer than aliasing hono/utils/crypto, which would
 * break hono/jwt (it also imports crypto helpers from the same module).
 */

const subtle = webcrypto.subtle as unknown as SubtleCrypto;
const _originalDigest = subtle.digest.bind(subtle);

Object.defineProperty(subtle, 'digest', {
  writable: true,
  configurable: true,
  value: async (algorithm: string | { name: string }, data: ArrayBuffer | ArrayBufferView): Promise<ArrayBuffer> => {
    const name = (typeof algorithm === 'string' ? algorithm : algorithm.name).toUpperCase();

    if (name === 'MD5') {
      const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array((data as ArrayBufferView).buffer);
      const hashBuf = createHash('md5').update(bytes).digest();
      // Copy into a new detached ArrayBuffer
      const result = new ArrayBuffer(hashBuf.length);
      new Uint8Array(result).set(hashBuf);
      return result;
    }

    return _originalDigest(algorithm as Parameters<typeof _originalDigest>[0], data);
  },
});
