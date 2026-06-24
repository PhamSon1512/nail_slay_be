import type { Bindings, Variables } from '../../@types';
import { OpenAPIHono } from '@hono/zod-openapi';
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import app from '../../index';
import { rewriteStorefrontGet } from '../../middlewares/rewriteStorefrontGet';
import { getDb } from '../../test/helpers';
import { registerApiRoutes } from '../routes';

function fetchWithRewrite(testApp: OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>, url: string) {
  return testApp.fetch(rewriteStorefrontGet(new Request(url)), env);
}

function makeFullApiApp() {
  const testApp = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();
  testApp.use('*', async (c, next) => {
    c.set('db', getDb());
    await next();
  });
  registerApiRoutes(testApp);
  return testApp;
}

describe('API routes integration', () => {
  it('GET /products is registered', async () => {
    const testApp = makeFullApiApp();
    const res = await fetchWithRewrite(testApp, 'http://localhost/products?limit=1');
    expect(res.status).not.toBe(404);
  });

  it('GET /articles is registered', async () => {
    const testApp = makeFullApiApp();
    const res = await fetchWithRewrite(testApp, 'http://localhost/articles?limit=1');
    expect(res.status).not.toBe(404);
  });

  it('GET /categories is registered', async () => {
    const testApp = makeFullApiApp();
    const res = await fetchWithRewrite(testApp, 'http://localhost/categories');
    expect(res.status).not.toBe(404);
  });

  it('GET /products via index app is registered', async () => {
    const res = await app.fetch(new Request('http://localhost/products?limit=1'), env);
    expect(res.status).not.toBe(404);
  });
});
