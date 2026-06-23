# Hono Boilerplate

> A production-ready REST API boilerplate running on **Cloudflare Workers** — powered by Hono v4, Drizzle ORM + D1, R2 file storage, DB-driven Casbin RBAC, and full OpenAPI documentation.

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](CHANGELOG.md)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![Hono](https://img.shields.io/badge/Hono-v4-E36002?logo=hono)](https://hono.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [API Routes](#api-routes)
- [RBAC System](#rbac-system)
- [Useful Scripts](#useful-scripts)
- [Deploy to Cloudflare](#deploy-to-cloudflare)
- [Development Workflow](#development-workflow)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare Workers                       │
│                   (src/index.ts — entry point)               │
│                                                             │
│   ┌───────────────────────────────────────────────────┐    │
│   │                   Hono v4 (OpenAPIHono)             │    │
│   │                                                     │    │
│   │  POST /auth/login            → Login, issue JWT    │    │
│   │  POST /auth/sign-up          → Register account    │    │
│   │  GET  /auth/token            → Refresh access token│    │
│   │  GET  /profile               → Current user info   │    │
│   │  PUT  /profile               → Update profile      │    │
│   │  GET  /users/me              → User detail (admin) │    │
│   │  POST /users                 → Create user (admin) │    │
│   │  POST /media                 → Upload file to R2   │    │
│   │  GET  /media/:id             → Download file       │    │
│   │  GET/POST /rbac/roles        → Role management     │    │
│   │  GET/POST /rbac/permissions  → Permission mgmt     │    │
│   │  GET/POST /rbac/roles/:slug/permissions → Assign   │    │
│   │  GET  /doc                   → Swagger UI          │    │
│   │  GET  /ref                   → Scalar API Reference│    │
│   └─────────────────────────┬───────────────────────────┘   │
│                             │                               │
│               ┌─────────────▼──────────────┐               │
│               │         Drizzle ORM         │               │
│               └──────┬──────────────┬───────┘               │
│                      │              │                        │
│               ┌──────▼──────┐ ┌────▼──────┐                │
│               │  D1 (SQLite)│ │ R2 (Files)│                │
│               └─────────────┘ └───────────┘                │
│                                                             │
│  + KV (cache)   + Rate Limiter (3 tiers)   + Cron Trigger  │
└─────────────────────────────────────────────────────────────┘
```

**Request flow:**

1. Every request hits `src/index.ts` (Cloudflare Worker entry point)
2. Delegated to `OpenAPIHono` router with typed `Bindings` & `Variables`
3. Auth middleware validates JWT → injects user context
4. Casbin middleware enforces RBAC permissions (policies loaded from D1)
5. Route handler processes request → returns JSON response

---

## Tech Stack

### Core Framework

| Library                    | Version | Role                                   |
| -------------------------- | ------- | -------------------------------------- |
| Hono                       | 4.12.x  | Web framework (Cloudflare Workers)     |
| @hono/zod-openapi          | 0.19.x  | OpenAPI schema definition & validation |
| @hono/swagger-ui           | 0.5.x   | Swagger UI documentation               |
| @scalar/hono-api-reference | 0.9.x   | Scalar API reference UI                |
| @hono/casbin               | 1.x     | Casbin RBAC middleware for Hono        |

### Database & Storage

| Library              | Version | Role                              |
| -------------------- | ------- | --------------------------------- |
| Drizzle ORM          | 0.44.x  | Type-safe SQL ORM                 |
| drizzle-zod          | 0.7.x   | Drizzle schema → Zod bridge       |
| drizzle-query-logger | 1.1.x   | SQL query logging for Drizzle     |
| @paralleldrive/cuid2 | 2.2.x   | Collision-resistant ID generation |

### Utilities

| Library       | Version | Role                          |
| ------------- | ------- | ----------------------------- |
| casbin        | 5.40.x  | Role-based access control     |
| dayjs         | 1.11.x  | Date & time handling          |
| ramda         | 0.32.x  | Functional utility library    |
| ramda-adjunct | 5.1.x   | Ramda type predicates & utils |

### Cloudflare Infrastructure

| Service      | Binding                  | Purpose                       |
| ------------ | ------------------------ | ----------------------------- |
| D1 Database  | `DB`                     | SQLite database (persistent)  |
| R2 Bucket    | `STORAGE`                | File & media storage          |
| KV Namespace | `CACHE`                  | Cache layer                   |
| Rate Limiter | `API_RATE_LIMITER`       | General API (100 req/60s)     |
| Rate Limiter | `FREE_USER_RATE_LIMITER` | Free tier users (100 req/60s) |
| Rate Limiter | `PAID_USER_RATE_LIMITER` | Paid users (1000 req/60s)     |
| Cron Trigger | `*/5 * * * *`            | D1 warmup ping every 5 min    |

### Dev Tooling

| Tool                   | Purpose                               |
| ---------------------- | ------------------------------------- |
| Wrangler 4.x           | Cloudflare CLI (dev, deploy, D1, R2)  |
| drizzle-kit            | Generate & apply DB migrations        |
| Vitest                 | Unit & integration testing            |
| Husky + lint-staged    | Pre-commit: auto-format with Prettier |
| Prettier               | Code formatting                       |
| GitNexus               | Code intelligence & impact analysis   |
| commit-and-tag-version | Semver bump + CHANGELOG generation    |

---

## Project Structure

```
hono-boilerplate/
├── src/                          # Application source code
│   ├── @types/                   # TypeScript types & interfaces
│   │   ├── index.ts              # Context, Bindings, Variables types
│   │   └── error.ts              # Error types & codes
│   ├── api/                      # Route handlers
│   │   ├── auth/                 # Authentication (login, sign-up, token refresh)
│   │   ├── media/                # File upload/download (R2)
│   │   ├── profile/              # Current user profile (get, update)
│   │   ├── rbac/                 # RBAC management (roles, permissions, assignments)
│   │   │   ├── index.ts          # Route registrations
│   │   │   ├── openapi.ts        # OpenAPI route definitions & Zod schemas
│   │   │   └── service.ts        # Business logic (DB queries, cache invalidation)
│   │   ├── users/                # User management (admin: create, get by id)
│   │   └── routes.ts             # Route aggregator
│   ├── db/                       # Drizzle DB singleton factory
│   ├── middlewares/              # Hono middlewares
│   │   ├── auth.ts               # JWT authentication
│   │   ├── casbin.ts             # DB-driven Casbin RBAC authorization
│   │   ├── rateLimit.ts          # Rate limiting (tiered)
│   │   └── index.ts              # Middleware exports
│   ├── models/                   # Drizzle table schemas
│   │   ├── index.ts              # Schema exports
│   │   ├── user.ts               # Users table
│   │   ├── media.ts              # Media table
│   │   └── rbac.ts               # RBAC tables (roles, permissions, role_permissions)
│   ├── test/                     # Test helpers & mocks
│   │   ├── helpers.ts            # Shared test utilities (appFetch, DDL helpers)
│   │   └── env.d.ts              # Test environment type declarations
│   ├── utils/                    # Utility functions
│   │   ├── errorHandler.ts       # Global error handling
│   │   ├── errors.ts             # AppError classes & throwError
│   │   ├── logger.ts             # Structured logging
│   │   ├── password.ts           # Password hashing utilities
│   │   ├── rbac.ts               # Custom RBAC engine (enforce, loadPolicies, cache)
│   │   ├── schema.ts             # Common Zod schemas
│   │   └── index.ts              # Utility exports
│   └── index.ts                  # App entry point
│
├── migrations/                   # SQL migration files (drizzle-kit generated)
│
├── scripts/
│   ├── seed-admin.mjs            # Interactive script to create first admin user
│   └── setup-wrangler.mjs        # Create Cloudflare D1 / R2 / KV resources
│
├── wrangler.jsonc                # Cloudflare Workers config
├── drizzle.config.ts             # Drizzle config (points to D1)
├── vitest.config.mts             # Vitest config (Cloudflare Workers pool)
├── tsconfig.json                 # TypeScript config
└── package.json
```

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10
- A **Cloudflare account** with Wrangler authenticated (`npx wrangler login`)

### Step 1 — Clone & install

```bash
git clone https://github.com/vunamhung/hono-boilerplate.git
cd hono-boilerplate
npm install
```

### Step 2 — Configure environment

Create `.dev.vars` for local Worker secrets (Wrangler reads this automatically):

```bash
# .dev.vars
JWT_SECRET=your-super-secret-key-here
ENVIRONMENT=development
```

### Step 3 — Setup Cloudflare resources

> Requires `wrangler login` first.

```bash
# Automatically create D1, R2, and KV on Cloudflare and update wrangler.jsonc
npm run setup:wrangler
```

### Step 4 — Initialize the database

```bash
# Apply migrations to local D1
npm run db:apply:local

# Seed the first admin user (interactive — asks for email & password)
npm run seed:admin
```

### Step 5 — Start the dev server

```bash
npm run dev
```

API runs at **`http://localhost:8787`**

- **Swagger UI:** `http://localhost:8787/doc`
- **Scalar Reference:** `http://localhost:8787/ref`
- **OpenAPI JSON:** `http://localhost:8787/openapi`

---

## Environment Variables

### `.dev.vars` — Cloudflare Worker secrets (local only)

```bash
JWT_SECRET=your-jwt-secret
ENVIRONMENT=development
GEMINI_API_KEY=your-google-ai-studio-api-key
SITE_BASE_URL=https://nailslaystudio.com
INDEXNOW_KEY=your-indexnow-verification-key
```

Production secrets (never commit):

```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put INDEXNOW_KEY
```

### `wrangler.jsonc` — Cloudflare vars (non-secret)

```jsonc
"vars": {
  "ENVIRONMENT": "production"
}
```

### `.env` — Script utilities only

```bash
CLOUDFLARE_API_TOKEN=your-cf-api-token    # Used by setup-wrangler.mjs
CLOUDFLARE_ACCOUNT_ID=your-account-id     # Used by setup-wrangler.mjs
```

---

## Database

Uses **Drizzle ORM** on top of **Cloudflare D1** (SQLite).

### Generate a new migration

After modifying any schema file in `src/models/`:

```bash
npm run db:generate
```

### Apply migrations

```bash
npm run db:apply:local     # → local D1 (dev)
npm run db:apply:remote    # → Cloudflare D1 (production)
```

### Schema overview

| Table              | Description                                            |
| ------------------ | ------------------------------------------------------ |
| `users`            | User accounts, roles, refresh tokens                   |
| `media`            | Media library records (files stored in R2)             |
| `roles`            | RBAC roles with optional parent inheritance            |
| `permissions`      | Resource + HTTP method pairs (keyMatch2 path patterns) |
| `role_permissions` | Many-to-many join table: role ↔ permission assignments |

---

## API Routes

All endpoints are defined **OpenAPI-first** via `@hono/zod-openapi` with full request/response validation.

### Browsing the API docs

When the dev server is running:

- **Swagger UI:** `http://localhost:8787/doc` — interactive Swagger UI
- **Scalar Reference:** `http://localhost:8787/ref` — modern API reference UI
- **OpenAPI JSON:** `http://localhost:8787/openapi` — raw OpenAPI spec

### Endpoint reference

#### Auth

| Method | Endpoint        | Description                        | Auth |
| ------ | --------------- | ---------------------------------- | ---- |
| GET    | `/`             | Health check                       | No   |
| POST   | `/auth/login`   | Email/password login — returns JWT | No   |
| POST   | `/auth/sign-up` | Register a new account             | No   |
| GET    | `/auth/token`   | Refresh access token via cookie    | Yes  |

#### Profile

| Method | Endpoint   | Description                    | Auth |
| ------ | ---------- | ------------------------------ | ---- |
| GET    | `/profile` | Get current authenticated user | Yes  |
| PUT    | `/profile` | Update current user profile    | Yes  |

#### Users (Admin)

| Method | Endpoint    | Description             | Auth |
| ------ | ----------- | ----------------------- | ---- |
| GET    | `/users/me` | Get current user detail | Yes  |
| POST   | `/users`    | Create a new user       | Yes  |

#### Media

| Method | Endpoint     | Description                   | Auth |
| ------ | ------------ | ----------------------------- | ---- |
| POST   | `/media`     | Upload file to R2 (multipart) | Yes  |
| GET    | `/media/:id` | Download / get file from R2   | Yes  |

#### RBAC — Roles

| Method | Endpoint            | Description       | Auth |
| ------ | ------------------- | ----------------- | ---- |
| GET    | `/rbac/roles`       | List all roles    | Yes  |
| POST   | `/rbac/roles`       | Create a new role | Yes  |
| PATCH  | `/rbac/roles/:slug` | Update a role     | Yes  |
| DELETE | `/rbac/roles/:slug` | Delete a role     | Yes  |

#### RBAC — Permissions

| Method | Endpoint                | Description             | Auth |
| ------ | ----------------------- | ----------------------- | ---- |
| GET    | `/rbac/permissions`     | List all permissions    | Yes  |
| POST   | `/rbac/permissions`     | Create a new permission | Yes  |
| PATCH  | `/rbac/permissions/:id` | Update a permission     | Yes  |
| DELETE | `/rbac/permissions/:id` | Delete a permission     | Yes  |

#### RBAC — Assignments

| Method | Endpoint                            | Description                       | Auth |
| ------ | ----------------------------------- | --------------------------------- | ---- |
| GET    | `/rbac/roles/:slug/permissions`     | List permissions assigned to role | Yes  |
| POST   | `/rbac/roles/:slug/permissions`     | Assign a permission to a role     | Yes  |
| DELETE | `/rbac/roles/:slug/permissions/:id` | Revoke a permission from a role   | Yes  |

#### RBAC — Admin

| Method | Endpoint     | Description                        | Auth |
| ------ | ------------ | ---------------------------------- | ---- |
| POST   | `/rbac/seed` | Seed default roles and permissions | Yes  |

#### Docs

| Method | Endpoint   | Description          | Auth |
| ------ | ---------- | -------------------- | ---- |
| GET    | `/doc`     | Swagger UI           | No   |
| GET    | `/ref`     | Scalar API Reference | No   |
| GET    | `/openapi` | OpenAPI JSON spec    | No   |

### Authentication

All protected endpoints require a **JWT Bearer token**:

```bash
curl -H "Authorization: Bearer <access_token>" \
  http://localhost:8787/profile
```

- **Access token** — returned in login response body. Short-lived.
- **Refresh token** — stored in an **HttpOnly cookie** (`refreshToken`). Used by `GET /auth/token`.

---

## RBAC System

The project implements a full **Role-Based Access Control** system using **Casbin** with policies stored entirely in **Cloudflare D1** — no file-based policy definitions, no redeployment needed to update access rules.

### How it works

1. Roles and permissions are managed dynamically via the `/rbac/*` API endpoints
2. The `casbin.ts` middleware loads policies from D1 on first request (cached in-memory with a 5-minute TTL)
3. Casbin uses `keyMatch2` path patterns — e.g. `/api/users/:id` matches `/api/users/cm9abc`
4. JWT payload carries the user's `roles` array; access is granted if **any** role passes the check
5. `src/utils/rbac.ts` provides a custom RBAC engine (`enforce`, `loadPolicies`, `invalidatePolicyCache`) as an alternative to the Casbin middleware
6. After any admin write to roles / permissions / role_permissions, the cache is invalidated in the current isolate; other isolates auto-expire via TTL

### DB schema for RBAC

```
roles (slug PK, name, description, parentSlug)
  └── parentSlug → roles.slug  (role inheritance)

permissions (id PK, resource, action, description)
  e.g. resource="/api/users/:id", action="GET"

role_permissions (roleSlug FK, permissionId FK)  ← many-to-many
```

### Built-in roles (seeded via `/rbac/seed`)

| Role               | Description                          |
| ------------------ | ------------------------------------ |
| `root`             | Full access to everything (`*`)      |
| `admin`            | Admin panel access + shop management |
| `store_owner`      | Full store operations                |
| `merchandiser`     | Products, inventory, collections     |
| `customer_service` | Orders, customers, refunds           |
| `marketing`        | Campaigns, analytics, content        |
| `finance`          | Billing, transactions, reports       |
| `pos_manager`      | POS operations + locations           |
| `pos_cashier`      | Basic POS operations                 |

### JWT payload structure

```typescript
{
  id: string
  email: string
  shop_id: string | null
  roles: string[]
  permissions: string[]
  role_category: 'admin' | 'store'
  exp: number
}
```

---

## Useful Scripts

```bash
# Development
npm run dev              # Start local dev server (Wrangler)
npm run deploy           # Deploy to Cloudflare Workers (minified)
npm run cf-typegen       # Regenerate Cloudflare Worker type bindings

# Testing
npm run test             # Run all tests (Vitest)
npm run test:watch       # Watch mode

# Database
npm run db:generate      # Generate a new migration from schema changes
npm run db:apply:local   # Apply migrations → local D1
npm run db:apply:remote  # Apply migrations → production D1

# Seeding
npm run seed:admin         # Create first admin user (local)
npm run seed:admin:remote  # Create first admin user (production)

# Setup
npm run setup:wrangler   # Create Cloudflare D1 / R2 / KV resources

# Code Quality
npm run format           # Format all files with Prettier

# Release
npm run release          # Bump semver + update CHANGELOG.md
```

---

## Deploy to Cloudflare

### First-time setup

**1. Authenticate Wrangler:**

```bash
npx wrangler login
```

**2. Create Cloudflare resources:**

```bash
npm run setup:wrangler
```

**3. Apply migrations to production D1:**

```bash
npm run db:apply:remote
```

**4. Seed the production admin user:**

```bash
npm run seed:admin:remote
```

**5. Deploy:**

```bash
npm run deploy
```

### Preview deployments

Upload a preview version without touching production:

```bash
npx wrangler versions upload
```

Promote to production (or progressive rollout) after verification:

```bash
npx wrangler versions deploy
```

---

## Development Workflow

### Pre-commit hooks

Husky runs **lint-staged** before every commit:

- Formats `*.{js,ts,tsx,json,md}` with Prettier automatically

### OpenAPI-first approach

All routes are defined using `@hono/zod-openapi`:

```typescript
// Define route with schema
const route = createRoute({
  method: 'post',
  path: '/auth/login',
  request: { body: { content: { 'application/json': { schema: LoginSchema } } } },
  responses: { 200: { content: { 'application/json': { schema: AuthResponseSchema } } } },
});

// Register on OpenAPIHono instance
app.openapi(route, handler);
```

### BaseController pattern

Extend `BaseController` for standard CRUD operations with built-in pagination, search, and logging:

```typescript
export class MyController extends BaseController {
  constructor() {
    super(myTable, ['searchable', 'fields']);
  }

  // Override or add custom methods
  async customAction(c: iContext) { ... }
}
```

### Error handling

Use the `throwError` utility for consistent, typed errors:

```typescript
throwError.notFound('User not found', { userId });
throwError.badRequest('Invalid input', { field: 'email' });
throwError.unauthorized('Invalid token');
throwError.forbidden('Insufficient permissions');
```

### Testing

Tests run in the **Cloudflare Workers runtime** via `@cloudflare/vitest-pool-workers`:

```bash
npm run test
```

Key conventions (see `RULE[test.md]`):

- Use `app.fetch(req, env)` for routes that need `c.env.*` bindings (JWT, D1, etc.)
- Use `drizzle(env.DB, { schema, casing: 'snake_case' })` directly in tests — never the singleton
- DDL must be a single-line string for `env.DB.exec()`

### Code intelligence (GitNexus)

GitNexus indexes the codebase into a knowledge graph so AI agents have full architectural context — every call chain, dependency, and execution flow.

**Daily commands:**

```bash
npx gitnexus status          # Check if the index is up to date
npx gitnexus analyze         # Re-index after large changes
npx gitnexus analyze --force # Force full re-index
npx gitnexus wiki            # Generate wiki documentation
```

**Before editing any symbol**, run an impact analysis to understand the blast radius:

```bash
# Who calls this function? What breaks if I change it?
npx gitnexus impact <symbolName> upstream
```

> Full mandatory workflow for agents → see `AGENTS.md`.

---

## GitNexus MCP Setup

[GitNexus](https://github.com/abhigyanpatwari/GitNexus) is a code intelligence engine that indexes your repository into a knowledge graph and exposes it to AI agents (Cursor, Claude Code, etc.) via the **Model Context Protocol (MCP)**. It tracks every dependency, call chain, and execution flow so agents don't miss context when editing code.

### Step 1 — Install globally

```bash
npm install -g gitnexus
```

### Step 2 — Index this repository

Run once from the project root:

```bash
npx gitnexus analyze
```

To force a full re-index at any time:

```bash
npx gitnexus analyze --force
```

### Step 3 — Configure MCP for your editor (one-time)

Auto-detect your editors and write the correct global MCP config:

```bash
npx gitnexus setup
```

Or configure manually per editor:

#### Claude Code

```bash
claude mcp add gitnexus -- npx -y gitnexus@latest mcp
```

> Claude Code gets the deepest integration: MCP tools + agent skills + `PreToolUse` hooks that enrich searches with graph context + `PostToolUse` hooks that auto-reindex after commits.

#### Cursor

Add to `~/.cursor/mcp.json` (global — works for all projects):

```json
{
  "mcpServers": {
    "gitnexus": {
      "command": "npx",
      "args": ["-y", "gitnexus@latest", "mcp"]
    }
  }
}
```

#### Codex

Add to `~/.codex/config.toml` (system scope) or `.codex/config.toml` (project scope):

```toml
[mcp_servers.gitnexus]
command = "npx"
args = ["-y", "gitnexus@latest", "mcp"]
```

#### OpenCode

Add to `~/.config/opencode/config.json`:

```json
{
  "mcp": {
    "gitnexus": {
      "command": "npx",
      "args": ["-y", "gitnexus@latest", "mcp"]
    }
  }
}
```

### CLI Reference

```bash
gitnexus setup                     # Configure MCP for your editors (one-time)
gitnexus analyze [path]            # Index a repository (or update stale index)
gitnexus analyze --force           # Force full re-index
gitnexus analyze --skills          # Generate repo-specific skill files
gitnexus analyze --skip-embeddings # Skip embedding generation (faster)
gitnexus analyze --embeddings      # Enable embedding generation (better search)
gitnexus analyze --verbose         # Log skipped files
gitnexus mcp                       # Start MCP server (stdio)
gitnexus serve                     # Start local HTTP server for web UI connection
gitnexus list                      # List all indexed repositories
gitnexus status                    # Show index status for current repo
gitnexus clean                     # Delete index for current repo
gitnexus clean --all --force       # Delete all indexes
gitnexus wiki [path]               # Generate repository wiki from knowledge graph
```

---

## AI-Assisted Development

This project ships with two AI workflow systems built on top of your AI editor (Cursor, Claude Code, etc.).

### BMAD Agents

**BMAD** (Build with Method, Architect, and Develop) is a set of role-based AI agent personas stored in `.agents/workflows/`. Each agent is activated by typing a slash command in your AI chat.

| Slash Command                | Agent       | Role                                            |
| ---------------------------- | ----------- | ----------------------------------------------- |
| `/agent:quick-flow-solo-dev` | Barry 🚀    | Rapid end-to-end feature delivery (recommended) |
| `/agent:dev`                 | Dev         | Implementation & coding tasks                   |
| `/agent:architect`           | Architect   | Technical design & system architecture          |
| `/agent:pm`                  | PM          | Roadmap, backlog & product decisions            |
| `/agent:analyst`             | Analyst     | Requirements & stakeholder analysis             |
| `/agent:qa`                  | QA          | Testing, quality assurance & test planning      |
| `/agent:sm`                  | SM          | Sprint planning & ceremonies                    |
| `/agent:ux-designer`         | UX Designer | Wireframes & UX specifications                  |
| `/agent:tech-writer`         | Tech Writer | Documentation & guides                          |

#### Recommended starting agent: Quick Flow Solo Dev

Type `/agent:quick-flow-solo-dev` in your AI chat. The agent (Barry) will greet you and show a menu:

```
[QS] Quick Spec    — create a lean, implementation-ready tech spec
[QD] Quick Dev     — implement a story/spec end-to-end
[QQ] Quick Dev New — unified: clarify → plan → implement → review (experimental)
[CR] Code Review   — multi-faceted code review
[PM] Party Mode    — spin up all agents for group discussion
[DA] Dismiss Agent
```

**Example workflow:**

```
You → /agent:quick-flow-solo-dev
Barry: (greets, shows menu)

You → QS   # or type "quick spec" or just "1"
Barry: asks clarifying questions, produces a tech spec

You → QD   # implement the spec
Barry: implements the feature end-to-end following project conventions
```

---

## Links

- [GitNexus](https://github.com/abhigyanpatwari/GitNexus)
- [Hono Docs](https://hono.dev/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Casbin](https://casbin.org/)
- [CHANGELOG](CHANGELOG.md)
