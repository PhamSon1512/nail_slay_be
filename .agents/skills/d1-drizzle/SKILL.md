---
name: cloudflare-d1
description: Cloudflare D1 SQLite database with Workers, Drizzle ORM, migrations
---

# Cloudflare D1 Skill

Cloudflare D1 is a serverless SQLite database for Cloudflare Workers. Use Drizzle ORM v2 (beta) for type-safe queries and relations.

**Sources:** [D1 Docs](https://developers.cloudflare.com/d1/) | [Drizzle + D1](https://orm.drizzle.team/docs/connect-cloudflare-d1) | [Relations v2](https://orm.drizzle.team/docs/relations-v2) | [RQB v2](https://orm.drizzle.team/docs/rqb-v2)

---

## Core Principle

**SQLite at the edge, migrations in version control, Drizzle v2 for type-safe relations.**

**⚠️ This uses Drizzle ORM beta (1.0.0-beta.1+). Relations v2 API fully replaces v1.**

```bash
npm i drizzle-orm@beta
npm i -D drizzle-kit@beta
```

---

## D1 Stack

| Component | Purpose |
|-----------|---------|
| **D1** | Serverless SQLite database |
| **Workers** | Edge runtime |
| **Wrangler** | CLI for dev and deploy |
| **Drizzle ORM beta** | Type-safe ORM with Relations v2 |
| **Drizzle Kit beta** | Migration tooling |

---

## Project Setup

### Create D1 Database
```bash
npx wrangler d1 create my-database
```

### Configure wrangler.toml
```toml
name = "my-app"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
migrations_dir = "drizzle"
migrations_table = "drizzle_migrations"
```

### Drizzle Config
```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
});
```

---

## Schema Definition

```typescript
// src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  invitedBy: integer('invited_by'),
  role: text('role', { enum: ['user', 'admin'] }).default('user'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content'),
  authorId: integer('author_id'),
  published: integer('published', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const groups = sqliteTable('groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
});

export const usersToGroups = sqliteTable('users_to_groups', {
  userId: integer('user_id').notNull(),
  groupId: integer('group_id').notNull(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
```

---

## Relations v2 (defineRelations)

**Replaces `relations()` from v1. Import `defineRelations` from `drizzle-orm`.**

### Dedicated relations file
```typescript
// src/db/relations.ts
import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';

export const relations = defineRelations(schema, (r) => ({
  // One-to-One (self-referencing)
  users: {
    invitee: r.one.users({
      from: r.users.invitedBy,
      to: r.users.id,
    }),
    // One-to-Many
    posts: r.many.posts(),
    // Many-to-Many via junction table
    groups: r.many.groups({
      from: r.users.id.through(r.usersToGroups.userId),
      to: r.groups.id.through(r.usersToGroups.groupId),
    }),
  },
  posts: {
    // optional: false → author is always required (non-nullable type)
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
      optional: false,
    }),
  },
  groups: {
    participants: r.many.users({
      from: r.groups.id.through(r.usersToGroups.groupId),
      to: r.users.id.through(r.usersToGroups.userId),
    }),
  },
}));
```

### Alias (replaces `relationName` from v1)
```typescript
// v1: relationName: "author_post"
// v2: alias: "author_post"

export const relations = defineRelations(schema, (r) => ({
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
      alias: 'author_post',
    }),
  },
}));
```

### Predefined filters on a relation
```typescript
// Filter baked into the relation definition — no filtering needed at query time
export const relations = defineRelations(schema, (r) => ({
  groups: {
    verifiedUsers: r.many.users({
      from: r.groups.id.through(r.usersToGroups.groupId),
      to: r.users.id.through(r.usersToGroups.userId),
      where: { verified: true },
    }),
  },
}));
```

### Split relations into parts
```typescript
import { defineRelations, defineRelationsPart } from 'drizzle-orm';
import * as schema from './schema';

export const mainRelations = defineRelations(schema, (r) => ({
  users: {
    posts: r.many.posts(),
  },
}));

export const postRelations = defineRelationsPart(schema, (r) => ({
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
  },
}));
```

---

## Database Client

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/d1';
import { relations } from './relations';

// v2: pass relations instead of schema
export function createDb(d1: D1Database) {
  return drizzle(d1, { relations });
}

// With split parts:
// const db = drizzle(d1, { relations: { ...mainRelations, ...postRelations } });

export type Database = ReturnType<typeof createDb>;
export * from './schema';
```

---

## Migration Workflow

```bash
# Generate migration from schema
npx drizzle-kit generate

# Apply locally
npx wrangler d1 migrations apply my-database --local

# Apply to production
npx wrangler d1 migrations apply my-database --remote

# Dry run before production apply
npx wrangler d1 migrations apply my-database --remote --dry-run

# Pull relations.ts in v2 syntax from DB
npx drizzle-kit pull
```

---

## Relational Queries v2 (db.query)

**`db.query` → RQB v2 (new). `db._query` → RQB v1 (legacy, still works).**

### findMany / findFirst
```typescript
// Fetch all users
const users = await db.query.users.findMany();

// Fetch first user matching condition
const user = await db.query.users.findFirst({
  where: { email: 'user@example.com' },
});
```

### with — eager load relations
```typescript
// Load posts for each user
const usersWithPosts = await db.query.users.findMany({
  with: {
    posts: true,
  },
});

// Many-to-Many (v2: direct, no junction table in query)
const usersWithGroups = await db.query.users.findMany({
  with: {
    groups: true,
  },
});

// Nested relations with column selection
const postsWithAuthor = await db.query.posts.findMany({
  with: {
    author: {
      columns: { id: true, name: true },
    },
  },
});

// Predefined filter relation
const groupsWithVerified = await db.query.groups.findMany({
  with: {
    verifiedUsers: true,
  },
});
```

### where — object syntax (v2)
```typescript
// v1: where: (users, { eq }) => eq(users.id, 1)
// v2: object syntax
const user = await db.query.users.findFirst({
  where: { id: 1 },
});

// Multiple conditions → implicit AND
const results = await db.query.users.findMany({
  where: { age: 25, role: 'admin' },
});

// OR
const results = await db.query.users.findMany({
  where: {
    OR: [
      { id: { gt: 10 } },
      { name: { like: 'John%' } },
    ],
  },
});

// NOT
const results = await db.query.users.findMany({
  where: {
    NOT: { id: { gt: 10 } },
    name: { like: 'John%' },
  },
});

// RAW SQL filter
const results = await db.query.users.findMany({
  where: {
    AND: [
      { RAW: (table) => sql`LOWER(${table.name}) LIKE 'john%'` },
      { age: { between: [25, 35] } },
    ],
  },
});

// Filter by relation (v2 only)
const usersWithPosts = await db.query.users.findMany({
  where: {
    id: { gt: 10 },
    posts: { content: { like: 'M%' } },
  },
});
```

### orderBy — object syntax (v2)
```typescript
// v1: orderBy: (users, { asc }) => [asc(users.id)]
// v2:
const results = await db.query.users.findMany({
  orderBy: { createdAt: 'desc' },
});
```

### columns — partial select
```typescript
const results = await db.query.users.findMany({
  columns: {
    id: true,
    name: true,
    // omit other columns
  },
});
```

### limit / offset — including on nested relations
```typescript
// v2: offset on nested relations is supported
await db.query.posts.findMany({
  limit: 5,
  offset: 2,
  with: {
    comments: {
      offset: 3, // supported in v2
      limit: 3,
    },
  },
});
```

---

## Standard Queries (Select / Insert / Update / Delete)

```typescript
import { eq, and, or, like, gt, desc, count, sql } from 'drizzle-orm';

// Select
const allPosts = await db.select().from(posts);
const published = await db.select().from(posts).where(eq(posts.published, true));
const topPosts = await db.select().from(posts).orderBy(desc(posts.createdAt)).limit(10);

// Insert
const [newUser] = await db.insert(users).values({
  email: 'user@example.com',
  name: 'John Doe',
}).returning();

// Upsert
await db.insert(users)
  .values({ email: 'user@test.com', name: 'New' })
  .onConflictDoUpdate({
    target: users.email,
    set: { name: 'New' },
  });

// Update
await db.update(posts)
  .set({ published: true })
  .where(eq(posts.id, 1));

// Atomic increment
await db.update(posts)
  .set({ viewCount: sql`${posts.viewCount} + 1` })
  .where(eq(posts.id, 1));

// Delete
await db.delete(posts).where(eq(posts.id, 1));
```

### Joins (use when you need raw SQL control)
```typescript
const postsWithAuthors = await db.select({
  post: posts,
  author: users,
})
.from(posts)
.innerJoin(users, eq(posts.authorId, users.id));
```

### Batch (replaces transactions in D1)
```typescript
const results = await db.batch([
  db.insert(users).values({ email: 'a@test.com', name: 'A' }),
  db.insert(users).values({ email: 'b@test.com', name: 'B' }),
  db.update(posts).set({ published: true }).where(eq(posts.id, 1)),
]);
```

---

## Worker with Hono

```typescript
// src/index.ts
import { Hono } from 'hono';
import { createDb } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

type Bindings = { DB: D1Database };

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', async (c, next) => {
  c.set('db', createDb(c.env.DB));
  await next();
});

app.get('/users', async (c) => {
  const db = c.get('db');
  const result = await db.query.users.findMany({
    with: { posts: true },
    orderBy: { createdAt: 'desc' },
  });
  return c.json(result);
});

app.get('/users/:id', async (c) => {
  const db = c.get('db');
  const id = parseInt(c.req.param('id'));
  const user = await db.query.users.findFirst({
    where: { id },
    with: { posts: true },
  });
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json(user);
});

export default app;
```

---

## Partial Upgrade (keep v1 queries alongside v2)

Migrate query by query without a large refactor:

```typescript
// Step 1: move v1 relations import to drizzle-orm/_relations
import { relations } from 'drizzle-orm/_relations'; // v1 still works

// Step 2: use db._query for v1, db.query for v2
await db._query.users.findMany(); // RQB v1 (legacy)
await db.query.users.findMany();  // RQB v2 (new)
```

---

## Local Development

```bash
# Dev server
npx wrangler dev

# Execute SQL locally
npx wrangler d1 execute my-database --local --command "SELECT * FROM users"

# Drizzle Studio
npx drizzle-kit studio
```

---

## CLI Quick Reference

```bash
# Database
wrangler d1 create <name>
wrangler d1 list
wrangler d1 info <name>

# Migrations
drizzle-kit generate               # Generate from schema
drizzle-kit migrate                # Apply migrations
drizzle-kit pull                   # Pull schema + relations.ts (v2 syntax)
drizzle-kit studio                 # Visual DB browser

wrangler d1 migrations apply <name> --local
wrangler d1 migrations apply <name> --remote

# SQL
wrangler d1 execute <name> --local --command "SQL"
wrangler d1 execute <name> --local --file ./seed.sql
```

---

## D1 Limits

| Limit | Value |
|-------|-------|
| **Database size** | 10 GB |
| **Row size** | 1 MB |
| **SQL statement** | 100 KB |
| **Batch size** | 1000 statements |
| **Reads/day (free)** | 5 million |
| **Writes/day (free)** | 100,000 |

---

## Anti-Patterns

- ❌ Using `relations()` from `drizzle-orm` (v1 API) → use `defineRelations`
- ❌ Passing `schema` to `drizzle()` → pass `relations` instead
- ❌ `where: (table, { eq }) => eq(...)` callback syntax → use object syntax in v2
- ❌ `orderBy: (table, { asc }) => [asc(...)]` callback syntax → use object syntax in v2
- ❌ Multi-line DDL string in `env.DB.exec()` during tests (D1 parses line by line)
- ❌ Passing `null` directly to Drizzle `.set()` → use `sql\`NULL\``
- ❌ Single large database → design for multiple smaller databases (per-tenant)
- ❌ Large blobs in D1 → use R2 for file storage
- ❌ No batching → use `db.batch()` for multiple operations
