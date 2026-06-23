import type { Bindings } from '../@types';

export function getSiteBaseUrl(env: Bindings): string {
  return (env.SITE_BASE_URL ?? 'https://nailslaystudio.com').replace(/\/$/, '');
}

export async function pingIndexNow(env: Bindings, urls: string[]): Promise<void> {
  const key = env.INDEXNOW_KEY;
  if (!key || urls.length === 0) return;

  const host = new URL(getSiteBaseUrl(env)).host;
  const body = {
    host,
    key,
    keyLocation: `${getSiteBaseUrl(env)}/${key}.txt`,
    urlList: urls.map((u) => (u.startsWith('http') ? u : `${getSiteBaseUrl(env)}${u.startsWith('/') ? u : `/${u}`}`)),
  };

  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error('IndexNow ping failed:', e);
  }
}

export function articlePublicUrl(env: Bindings, slug: string): string {
  return `${getSiteBaseUrl(env)}/articles/${slug}`;
}
