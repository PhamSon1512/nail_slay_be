#!/usr/bin/env node
const base = process.argv[2] ?? 'http://127.0.0.1:8787';
const email = process.env.SEED_EMAIL ?? 'admin@example.com';
const password = process.env.SEED_PASSWORD ?? 'Admin@123456';

async function main() {
  const checks = [];

  const sitemap = await fetch(`${base}/sitemap.xml`);
  const sitemapText = await sitemap.text();
  checks.push(['sitemap.xml', sitemap.status === 200 && sitemapText.includes('<urlset')]);

  const robots = await fetch(`${base}/robots.txt`);
  const robotsText = await robots.text();
  checks.push(['robots.txt', robots.status === 200 && robotsText.includes('Sitemap:')]);

  const nf = await fetch(`${base}/nonexistent-seo-test-path-xyz`);
  checks.push(['404 response', nf.status === 404]);

  const login = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginData = await login.json();
  const token = loginData?.data?.token ?? loginData?.data?.access_token ?? loginData?.token ?? loginData?.access_token;
  if (!token) {
    console.error('Login failed', login.status, JSON.stringify(loginData).slice(0, 300));
    process.exit(1);
  }

  await new Promise((r) => setTimeout(r, 500));
  const logs = await fetch(`${base}/admin/seo/404-logs`, { headers: { Authorization: `Bearer ${token}` } });
  const logsData = await logs.json();
  const logItems = logsData?.data ?? logsData;
  checks.push(['404 logs API', logs.status === 200 && Array.isArray(logItems)]);

  const redirects = await fetch(`${base}/admin/seo/redirects`, { headers: { Authorization: `Bearer ${token}` } });
  checks.push(['redirects list', redirects.status === 200]);

  const create = await fetch(`${base}/admin/seo/redirects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fromPath: '/old-seo-test', toPath: '/articles', statusCode: 301 }),
  });
  checks.push(['create redirect', create.status === 201 || create.status === 409]);

  const redir = await fetch(`${base}/old-seo-test`, { redirect: 'manual' });
  checks.push(['redirect middleware', redir.status === 301 && !!redir.headers.get('location')]);

  const links = await fetch(`${base}/admin/articles/link-suggestions?q=nail`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const linksData = await links.json();
  checks.push(['link suggestions', links.status === 200 && Array.isArray(linksData?.data?.items ?? linksData?.items)]);

  const gemini = await fetch(`${base}/admin/articles/seo-ai-suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title: 'Cách làm nail đẹp tại nhà',
      content: 'Hướng dẫn nail art cơ bản',
      excerpt: 'Bài viết về nail',
    }),
  });
  const geminiData = await gemini.json();
  const g = geminiData?.data ?? geminiData;
  const geminiErr = JSON.stringify(geminiData);
  const geminiQuota = geminiErr.includes('429') || geminiErr.toLowerCase().includes('quota');
  checks.push([
    'gemini suggest',
    gemini.status === 200 && !!(g?.metaTitle || g?.focusKeywords?.length),
    geminiQuota ? 'quota exceeded (key OK)' : gemini.status === 401 || gemini.status === 403 ? 'API key invalid' : '',
  ]);

  let failed = 0;
  for (const [name, ok, note] of checks) {
    const quotaOk = name === 'gemini suggest' && note === 'quota exceeded (key OK)';
    const pass = ok || quotaOk;
    console.log(`${pass ? '✓' : '✗'} ${name}${note ? ` (${note})` : ''}`);
    if (!pass) failed++;
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
