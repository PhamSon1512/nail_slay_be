## ZOD SCHEMAS — OPENAPI COMPATIBILITY RULES

These rules apply to **every `openapi.ts` file** in `src/api/**`. Violations cause a 500 error on the `/openapi` route.

---

### RULE 1 — NEVER use `z.custom<T>()` for enum types

The `@hono/zod-openapi` generator cannot infer the type from `z.custom<T>()` and throws:

```
Unknown zod object type, please specify `type` and other OpenAPI props using `schema.openapi`.
```

**Always use `z.enum(CONST_TUPLE)` instead, importing the tuple constant from `src/models/_types.ts`.**

```ts
// ✅ Correct
import { GUN_TYPES, GUN_STATUSES } from '../../models/_types';

type: z.enum(GUN_TYPES).optional(),
status: z.enum(GUN_STATUSES),

// ❌ Wrong — throws 500
import type { GunType, GunStatus } from '../../models/_types';

type: z.custom<GunType>().optional(),
status: z.custom<GunStatus>(),
```

---

### RULE 2 — Complex object types: use `z.unknown()`, NOT `z.custom<T>()`

For domain types that are complex objects (not simple string enums), such as `CampaignBenefits`, use `z.unknown()` instead of `z.custom<T>()`.

```ts
// ✅ Correct — CampaignBenefits is a complex object, not an enum
benefits: z.unknown().optional(),

// ❌ Wrong
benefits: z.custom<CampaignBenefits>().optional(),
```

---

### RULE 3 — Never use `z.coerce.date()` in query params (`request.query`)

OpenAPI serialization only supports strings in query parameters. `z.coerce.date()` causes a parse error during spec generation.

```ts
// ✅ Correct — receive as string, coerce to Date inside the handler
asOf: z.string().optional(),   // in openapi.ts

// In handler:
const asOf = input.asOf ? new Date(input.asOf) : undefined;

// ❌ Wrong — crashes the /openapi generator
asOf: z.coerce.date().optional(),
```

> **Exception**: `z.coerce.date()` IS allowed in **body schemas** (`request.body`) since JSON bodies support ISO date strings parsed directly.

---

### RULE 4 — Use `z.string()` for pagination params in query schemas

Query string params are always strings. Using `z.number()` for `limit`/`offset` in `request.query` causes OpenAPI spec errors.

```ts
// ✅ Correct
limit: z.string().optional(),
offset: z.string().optional(),

// ❌ Wrong
limit: z.number().int().max(100).optional(),
offset: z.number().int().min(0).optional(),
```

Parse them to numbers in the handler:

```ts
const limit = input.limit ? parseInt(input.limit, 10) : 20;
const offset = input.offset ? parseInt(input.offset, 10) : 0;
```

---

### RULE 5 — Single source of truth for enum constants

All domain enum tuple constants live in `src/models/_types.ts` and are exported as `as const` arrays. Always import the tuple, not just the type:

```ts
// ✅ Import the tuple constant (for z.enum)

// ❌ Only importing the type is not enough for z.enum
import type { GunType } from '../../models/_types';
import { GUN_CONDITIONS, GUN_TYPES } from '../../models/_types';
```

**Naming convention**: the tuple constant is always the SCREAMING_SNAKE_CASE plural of the type name:

- `GunType` → `GUN_TYPES`
- `CampaignStatus` → `CAMPAIGN_STATUSES`
- `LeaderboardPeriod` → `LEADERBOARD_PERIODS`
- `LeaderboardStatsScope` → `LEADERBOARD_STATS_SCOPES`
