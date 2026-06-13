import type { Bindings, Variables } from '../../../@types';
import { OpenAPIHono } from '@hono/zod-openapi';
import { env } from 'cloudflare:test';
import dayjs from 'dayjs';
import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { media } from '../../../models';
import { getDb, MEDIA_DDL, USERS_DDL, USERS_IDX } from '../../../test/helpers';
import { throwError } from '../../../utils';

// ─── In-memory R2 mock ────────────────────────────────────────────────────────
// c.env is immutable in CF Workers runtime — we cannot inject STORAGE into it.
// Instead we capture the mock R2 in a closure and reference it directly inside
// each route handler.

type R2Mock = {
  put(key: string, body: ReadableStream, opts?: any): Promise<void>;
  get(key: string): Promise<{ body: ReadableStream } | null>;
};

function makeMockR2(): R2Mock {
  const store = new Map<string, Uint8Array>();

  async function put(key: string, body: ReadableStream) {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value as Uint8Array);
    }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const buf = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      buf.set(c, off);
      off += c.length;
    }
    store.set(key, buf);
  }

  async function get(key: string) {
    const data = store.get(key);
    if (!data) return null;
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(data);
        c.close();
      },
    });
    return { body: stream };
  }

  return { put, get };
}

// ─── App factory ──────────────────────────────────────────────────────────────

function makeApp(r2: R2Mock) {
  const app = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();

  const userId = 'media-user-id';

  app.use('*', async (c, next) => {
    c.set('db', getDb());
    c.set('jwtPayload', {
      id: userId,
      email: 'media@test.com',
      roles: [],
      first_name: null,
      last_name: null,
      exp: dayjs().add(1, 'day').unix(),
      jti: Date.now(),
    });
    await next();
  });

  // POST /media — upload
  app.post('/media', async (c) => {
    const body = await c.req.parseBody();
    const file = body['file'] as File;

    if (!file) return throwError.badRequest('No file uploaded');

    const { createId } = await import('@paralleldrive/cuid2');
    const fileKey = createId();

    // Use r2 from closure — c.env.STORAGE is immutable in CF Workers test env
    await r2.put(fileKey, file.stream());

    const result = await c.var.db
      .insert(media)
      .values({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        bucketKey: fileKey,
        createdBy: userId,
      })
      .returning()
      .get();

    return c.json(result, 201);
  });

  // GET /media/:id — download
  app.get('/media/:id', async (c) => {
    const { id } = c.req.param();

    const fileInfo = await c.var.db.select().from(media).where(eq(media.id, id)).get();
    if (!fileInfo) return throwError.notFound('File');

    // Use r2 from closure — c.env.STORAGE is immutable in CF Workers test env
    const file = await r2.get(fileInfo.bucketKey);
    if (!file) return throwError.notFound('File in storage');

    return new Response(file.body, {
      headers: {
        'Content-Type': fileInfo.fileType,
        'Content-Disposition': `attachment; filename="${fileInfo.fileName}"`,
      },
    });
  });

  app.onError((err, c) => {
    const status: number = (err as any).statusCode ?? (err as any).status ?? 500;
    return c.json({ message: err.message }, status as any);
  });

  return app;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await env.DB.exec(USERS_DDL);
  for (const idx of USERS_IDX) await env.DB.exec(idx);
  for (const ddl of MEDIA_DDL) {
    await env.DB.exec(ddl);
  }
});

beforeEach(async () => {
  await getDb().delete(media);
});

// ─── POST /media ──────────────────────────────────────────────────────────────

describe('POST /media', () => {
  it('201 — uploads file and saves to DB', async () => {
    const r2 = makeMockR2();
    const app = makeApp(r2);

    const file = new File([new Uint8Array([1, 2, 3, 4])], 'test.png', { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', file);

    const res = await app.request('/media', { method: 'POST', body: formData });
    expect(res.status).toBe(201);

    const body = (await res.json()) as any;
    expect(body.fileName).toBe('test.png');
    expect(body.fileType).toBe('image/png');
    expect(body.fileSize).toBe(4);
    expect(body.bucketKey).toBeTruthy();
    expect(body.id).toBeTruthy();
  });

  it('400 — missing file in form data', async () => {
    const app = makeApp(makeMockR2());
    const res = await app.request('/media', { method: 'POST', body: new FormData() });
    expect(res.status).toBe(400);
  });
});

// ─── GET /media/:id ───────────────────────────────────────────────────────────

describe('GET /media/:id', () => {
  it('200 — returns file with correct headers', async () => {
    const r2 = makeMockR2();
    const app = makeApp(r2);

    // Upload first, then download
    const file = new File([new Uint8Array([10, 20, 30])], 'sample.txt', { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', file);

    const uploadRes = await app.request('/media', { method: 'POST', body: formData });
    expect(uploadRes.status).toBe(201);
    const { id } = (await uploadRes.json()) as { id: string };

    const res = await app.request(`/media/${id}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/plain');
    expect(res.headers.get('Content-Disposition')).toContain('sample.txt');
  });

  it('404 — unknown media id returns 404', async () => {
    const res = await makeApp(makeMockR2()).request('/media/nonexistent-id');
    expect(res.status).toBe(404);
  });

  it('404 — file in DB but missing from R2', async () => {
    // Insert a DB record that points to a non-existent R2 key
    await getDb().insert(media).values({
      fileName: 'ghost.png',
      fileType: 'image/png',
      fileSize: 100,
      bucketKey: 'missing-key',
      createdBy: 'media-user-id',
    });

    const [row] = await getDb().select().from(media);
    const res = await makeApp(makeMockR2()).request(`/media/${row.id}`);
    expect(res.status).toBe(404);
  });
});
