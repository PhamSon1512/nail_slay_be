import type { KVNamespace } from '@cloudflare/workers-types';

export async function getCachedJson<T>(cache: KVNamespace, key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const cached = await cache.get(key);
  if (cached) return JSON.parse(cached) as T;

  const value = await loader();
  await cache.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
  return value;
}

export async function invalidateCacheKey(cache: KVNamespace, key: string) {
  await cache.delete(key);
}
