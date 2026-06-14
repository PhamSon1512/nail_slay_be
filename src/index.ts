import type { Bindings, Variables } from './@types';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { trimTrailingSlash } from 'hono/trailing-slash';
import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import ApiRoutes from './api/routes';
import { createDb } from './db';
import { handleError, notFoundHandler } from './utils';

const app = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://nail-slay-fe.pages.dev',
  'https://nailslay.pages.dev',
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

app.use(trimTrailingSlash());

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

// app.get(
//   '*',
//   cache({
//     cacheName: 'hono',
//     cacheControl: 'max-age=3600',
//   }),
// );

app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', { type: 'http', scheme: 'bearer' });
app.doc('/openapi', { info: { title: 'My API', version: '1.0' }, openapi: '3.1.0' });
app.get('/doc', swaggerUI({ url: '/openapi' }));
app.get('/ref', Scalar({ url: '/openapi' }));
app.get('/', (c) => c.text('Hello Hono!'));

app.route('/', ApiRoutes);

// Global error handling using onError
app.onError((error, c) => handleError(c, error));

// Handle 404 errors
app.notFound(notFoundHandler);

export default {
  fetch: app.fetch,
  // Xử lý sự kiện scheduled từ Cron Trigger
  async scheduled(_: ScheduledController, env: Bindings) {
    try {
      await env.DB.prepare('SELECT 1 as ping').first(); // Ping nhẹ D1 để giữ connection warm
    } catch (error) {
      console.error('Warmup ping failed:', error);
    }
  },
};
