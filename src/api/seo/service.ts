import type { HonoCtx } from '../../@types';
import { and, desc, eq, isNull, ne, or, sql } from 'drizzle-orm';
import { articles } from '../../models';
import { getSiteBaseUrl } from '../../utils/indexNow';

export async function generateSitemapXml(c: HonoCtx): Promise<string> {
  const base = getSiteBaseUrl(c.env);
  const now = new Date().toISOString().split('T')[0];

  const published = await c.var.db
    .select({
      slug: articles.slug,
      updatedAt: articles.updatedAt,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .where(and(isNull(articles.deletedAt), eq(articles.status, 'published')))
    .orderBy(desc(articles.publishedAt))
    .all();

  const urls = [
    { loc: `${base}/`, lastmod: now, priority: '1.0' },
    { loc: `${base}/articles`, lastmod: now, priority: '0.8' },
    ...published.map((a) => ({
      loc: `${base}/articles/${a.slug}`,
      lastmod: (a.updatedAt ?? a.publishedAt ?? new Date()).toISOString().split('T')[0],
      priority: '0.7',
    })),
  ];

  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <priority>${u.priority}</priority>\n  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

export function generateRobotsTxt(c: HonoCtx): string {
  const base = getSiteBaseUrl(c.env);
  return `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${base}/sitemap.xml\n`;
}

export async function adminLinkSuggestions(c: HonoCtx, query: { articleId?: string; q?: string }) {
  const q = (query.q ?? '').trim().toLowerCase();
  if (!q || q.length < 2) return { items: [] as { id: string; title: string; slug: string; url: string; score: number }[] };

  const conditions = [isNull(articles.deletedAt), eq(articles.status, 'published')];
  if (query.articleId) conditions.push(ne(articles.id, query.articleId));

  const rows = await c.var.db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      focusKeyword: articles.focusKeyword,
      excerpt: articles.excerpt,
    })
    .from(articles)
    .where(and(...conditions))
    .limit(100)
    .all();

  const tokens = q.split(/\s+/).filter((t) => t.length > 2);
  const base = getSiteBaseUrl(c.env);

  const scored = rows
    .map((row) => {
      const haystack = `${row.title} ${row.focusKeyword ?? ''} ${row.excerpt ?? ''}`.toLowerCase();
      let score = 0;
      if (haystack.includes(q)) score += 10;
      for (const t of tokens) {
        if (haystack.includes(t)) score += 2;
      }
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        url: `/articles/${row.slug}`,
        absoluteUrl: `${base}/articles/${row.slug}`,
        score,
      };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return { items: scored };
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
