import { createHash } from 'node:crypto';

/**
 * Node.js polyfill for hono/utils/crypto.
 *
 * The W3C Web Crypto API (crypto.subtle) does NOT support MD5 — only SHA-* family.
 * Cloudflare Workers extends Web Crypto to include MD5, which is why the real
 * hono/utils/crypto works in workerd but throws "Unrecognized algorithm name" in Node.
 *
 * This polyfill is aliased via resolve.alias in vitest.coverage.config.mts so all tests
 * calling md5() get a Node-compatible implementation producing the same hex output.
 */

export async function md5(text: string): Promise<string | null> {
  try {
    return createHash('md5').update(text, 'utf8').digest('hex');
  } catch {
    return null;
  }
}
