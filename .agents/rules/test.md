---
trigger: always_on
glob: '**/__tests__/**/*.ts,**/test/**/*.ts'
description: Rules for writing Cloudflare Workers integration tests with Vitest + D1
---

# Testing Rules — Cloudflare Workers / Vitest / D1

## 1. DDL must be a single-line string

`env.DB.exec()` in the Cloudflare D1 test environment parses one line at a time. A multi-line template literal is truncated after the first line → `SQLITE_ERROR: incomplete input`.

```ts
// ✅ Correct — single line
const USERS_DDL = `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY NOT NULL, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL)`;

// ❌ Wrong — truncated at line 1
const USERS_DDL = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    ...
  )
`;
```

## 2. Never use `require()` in test files

Test files run in an ESM context. Using `require()` throws `Cannot use import statement outside a module`.

```ts
// ✅ Correct
import { omit } from 'ramda';
import { createRole, listRoles } from '../service';

// ❌ Wrong — throws SyntaxError at runtime
const { listRoles } = require('../service');
```

## 3. Inject env bindings when the handler needs `c.env.*`

`app.request()` does **not** inject Cloudflare bindings (`JWT_SECRET`, `DB`, etc.) into `c.env`. If a route handler needs `c.env.JWT_SECRET` (JWT signing, etc.), use `app.fetch(new Request(...), env)` instead:

```ts
import { env } from 'cloudflare:test';

// ✅ Correct — env bindings are injected, c.env.JWT_SECRET works
const res = await app.fetch(
  new Request('http://localhost/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }),
  env,
);

// ❌ Wrong — c.env is empty, c.env.JWT_SECRET = undefined → 500
const res = await app.request('/auth/login', { method: 'POST', ... });
```

**Rule**: use `app.request()` only for routes that do not need env bindings. Use `app.fetch(req, env)` for routes that rely on JWT, D1, KV, R2, etc. from `c.env`.

## 4. Never pass `null` directly to Drizzle D1 `.set()`

D1 does not accept JS `null` — it throws `D1_TYPE_ERROR: Type 'undefined' not supported`. Use `sql\`NULL\`` to set an explicit NULL:

```ts
import { sql } from 'drizzle-orm';

// ✅ Correct
await db
  .update(users)
  .set({ refreshToken: sql`NULL` })
  .where(eq(users.id, id));

// ❌ Wrong — throws D1_TYPE_ERROR
await db.update(users).set({ refreshToken: null }).where(eq(users.id, id));
```

## 5. Never use `res.json<T>()` generic

In Cloudflare Workers tests, `Response.json()` is the Web API standard — it has no generic overload. TypeScript will error with `Expected 0 type arguments`.

```ts
// ✅ Correct — cast after parsing
const body = (await res.json()) as { id: string };

// ❌ Wrong — TS error
const body = await res.json<{ id: string }>();
```

## 6. Use a fresh Drizzle instance per test file — never the singleton

`DrizzleDB.getInstance()` is a singleton. Each test file should call `drizzle(env.DB, { schema, casing: 'snake_case' })` directly to avoid shared state across parallel test suites.

```ts
// ✅ Correct — fresh instance per test file
import { env } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
// ❌ Avoid in tests
import { DrizzleDB } from '../../db';

function getDb() {
  return drizzle(env.DB, { schema, casing: 'snake_case' });
}

const db = DrizzleDB.getInstance(env.DB);
```

## 7. Helper for repeated fetch calls with env

If a test file makes many requests that require env bindings, create a local helper to avoid repetition:

```ts
function appFetch(app: Hono<any>, path: string, init?: RequestInit) {
  return app.fetch(new Request(`http://localhost${path}`, init), env);
}
```

## 8. Never spy on `console` with `vi.spyOn` — use `vi.stubGlobal` instead

In the Cloudflare Workers runtime, `console` methods are bound native functions that are **not configurable**. `vi.spyOn(console, 'info')` throws `[Function bound info] is not a spy or a call to a spy!`.

Replace the entire `console` object on `globalThis` with a `vi.fn()`-based mock instead:

```ts
const consoleMock = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

beforeEach(() => {
  vi.stubGlobal('console', consoleMock);
  consoleMock.info.mockClear();
  // ... clear others
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ✅ Now assertions work
expect(consoleMock.info).toHaveBeenCalledWith(...);

// ❌ Wrong — throws TypeError in CF Workers env
vi.spyOn(console, 'info').mockImplementation(() => {});
expect(console.info).toHaveBeenCalledWith(...);
```

## 9. `c.env` is immutable — mock external services via closure, not injection

In the Cloudflare Workers runtime, `c.env` is the frozen environment bindings object. Trying to assign `(c.env as any).STORAGE = mock` at runtime has no effect (or silently fails), causing handlers to receive `undefined` instead of the mock.

Mock external services (R2, KV, AI, etc.) by passing them as a **closure parameter** to the app factory, and reference them directly inside route handlers:

```ts
// ✅ Correct — r2 captured in closure, not injected into c.env
function makeApp(r2: R2Mock) {
  app.post('/upload', async (c) => {
    await r2.put(key, stream); // uses r2 from closure
    // ...
  });
}

// ❌ Wrong — c.env is immutable, the assignment has no effect
app.use('*', async (c, next) => {
  (c.env as any).STORAGE = mockR2; // silently ignored in CF Workers env
  await next();
});
```

## 10. DDL must include every column the Drizzle model defines

If a Drizzle model has columns that are nullable (no `.notNull()`), they still need to exist in the DDL. If the DDL omits them, Drizzle will try to insert them as `null` and D1 will throw `no such column`.

Always derive the DDL from the actual model schema — include every column, including optional ones (`title TEXT`, `tags TEXT`, etc.):

```ts
// ✅ Correct — all columns present, nullable ones without NOT NULL
export const MEDIA_DDL = `CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  bucket_key TEXT NOT NULL,
  title TEXT,
  description TEXT,
  tags TEXT,
  created_by TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  deleted_at INTEGER
)`;

// ❌ Wrong — missing nullable columns that Drizzle still inserts
export const MEDIA_DDL = `CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY NOT NULL,
  file_name TEXT NOT NULL,
  ...
  created_at INTEGER
)`;
```
