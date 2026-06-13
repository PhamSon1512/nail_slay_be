import { describe, expect, it } from 'vitest';
import { timingSafeEqual } from '../password';

// timingSafeEqual — pure synchronous, no crypto.subtle dependency

describe('timingSafeEqual', () => {
  const enc = new TextEncoder();

  it('returns true for identical buffers', () => {
    const a = enc.encode('password123');
    const b = enc.encode('password123');
    expect(timingSafeEqual(a, b)).toBe(true);
  });

  it('returns false when buffers differ by one byte at end', () => {
    const a = enc.encode('password123');
    const b = enc.encode('password124');
    expect(timingSafeEqual(a, b)).toBe(false);
  });

  it('returns false when buffers differ in length', () => {
    const a = enc.encode('short');
    const b = enc.encode('longer');
    expect(timingSafeEqual(a, b)).toBe(false);
  });

  it('returns true for empty buffers', () => {
    expect(timingSafeEqual(new Uint8Array(0), new Uint8Array(0))).toBe(true);
  });

  it('returns false for empty vs non-empty', () => {
    expect(timingSafeEqual(new Uint8Array(0), enc.encode('x'))).toBe(false);
  });

  it('returns false when first char differs', () => {
    const a = enc.encode('apassword');
    const b = enc.encode('bpassword');
    expect(timingSafeEqual(a, b)).toBe(false);
  });
});

// hashPassword + comparePassword — use real Web Crypto (available in Cloudflare Workers env)

describe('hashPassword', () => {
  it('produces a string with the format "<saltHex>:<hashHex>"', async () => {
    const { hashPassword } = await import('../password');
    const hash = await hashPassword('mysecret');
    expect(typeof hash).toBe('string');
    const parts = hash.split(':');
    expect(parts).toHaveLength(2);
    // salt: 16 bytes → 32 hex chars
    expect(parts[0]).toHaveLength(32);
    // hash: 256 bits → 32 bytes → 64 hex chars
    expect(parts[1]).toHaveLength(64);
  });

  it('produces different hashes on each call (random salt)', async () => {
    const { hashPassword } = await import('../password');
    const h1 = await hashPassword('samepassword');
    const h2 = await hashPassword('samepassword');
    expect(h1).not.toBe(h2);
  });
});

describe('comparePassword', () => {
  it('returns true when password matches hash', async () => {
    const { hashPassword, comparePassword } = await import('../password');
    const hash = await hashPassword('correct-horse-battery');
    expect(await comparePassword('correct-horse-battery', hash)).toBe(true);
  });

  it('returns false when password does not match hash', async () => {
    const { hashPassword, comparePassword } = await import('../password');
    const hash = await hashPassword('original');
    expect(await comparePassword('wrong', hash)).toBe(false);
  });

  it('returns false for a malformed stored hash (missing colon)', async () => {
    const { comparePassword } = await import('../password');
    expect(await comparePassword('anything', 'nocolon')).toBe(false);
  });

  it('returns false for empty stored hash', async () => {
    const { comparePassword } = await import('../password');
    expect(await comparePassword('anything', '')).toBe(false);
  });
});
