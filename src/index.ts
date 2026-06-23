import type { Bindings, Variables } from './@types';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import ApiRoutes from './api/routes';
import { createDb } from './db';
import { slashRootPaths } from './middlewares/slashRoot';
import { handleError, notFoundHandler } from './utils';
import { findRedirect } from './utils/redirectLookup';

const app = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://nail-slay-fe.pages.dev',
  'https://nailslay.pages.dev',
  'https://nailslaystudio.com',
  'https://www.nailslaystudio.com',
];

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return ALLOWED_ORIGINS[0];
      if (ALLOWED_ORIGINS.includes(origin)) return origin;
      return null;
    },
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

app.use(
  secureHeaders({
    permissionsPolicy: {
      camera: false,
      microphone: true,
      geolocation: ['*'],
      bluetooth: ['none'],
    },
  }),
);

app.use(async (c, next) => {
  c.set('db', createDb(c.env.DB, c.env.ENVIRONMENT));
  await next();
});

app.use('*', async (c, next) => {
  const method = c.req.method;
  if (method === 'GET' || method === 'HEAD') {
    const redirect = await findRedirect(c, c.req.path);
    if (redirect) {
      const target = redirect.toPath.startsWith('http')
        ? redirect.toPath
        : redirect.toPath.startsWith('/')
          ? redirect.toPath
          : `/${redirect.toPath}`;
      return c.redirect(target, redirect.statusCode as 301 | 302);
    }
  }
  await next();
});

app.use(
  '*',
  slashRootPaths((request, env, executionCtx) => app.fetch(request, env, executionCtx)),
);

app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', { type: 'http', scheme: 'bearer' });
app.doc('/openapi', { info: { title: 'My API', version: '1.0' }, openapi: '3.1.0' });
app.get('/doc', swaggerUI({ url: '/openapi' }));
app.get('/ref', Scalar({ url: '/openapi' }));
app.get('/', (c) => c.text('Hello Hono!'));

app.get('/sitemap.xml', async (c) => {
  const { generateSitemapXml } = await import('./api/seo/service');
  const xml = await generateSitemapXml(c);
  return c.body(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' });
});

app.get('/robots.txt', async (c) => {
  const { generateRobotsTxt } = await import('./api/seo/service');
  return c.body(generateRobotsTxt(c), 200, { 'Content-Type': 'text/plain; charset=utf-8' });
});

app.get('/:key.txt', async (c) => {
  const key = c.req.param('key');
  const indexKey = c.env.INDEXNOW_KEY;
  if (!indexKey || key !== indexKey) {
    return c.notFound();
  }
  return c.body(indexKey, 200, { 'Content-Type': 'text/plain; charset=utf-8' });
});

app.route('/', ApiRoutes);

app.onError((error, c) => handleError(c, error));
app.notFound(notFoundHandler);

export default {
  fetch: app.fetch,
  async scheduled(_: ScheduledController, env: Bindings) {
    try {
      await env.DB.prepare('SELECT 1 as ping').first();
    } catch (error) {
      console.error('Warmup ping failed:', error);
    }
  },
};
