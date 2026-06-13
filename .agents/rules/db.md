---
trigger: always_on
---

## DRIZZLE ORM — RAW SQL IN SUBQUERIES

Every `sql<T>\`...\``expression inside`.select({})`of a subquery (one that ends with`.as('alias')`) **must** call `.as('columnAlias')` on the expression itself.

### Why

Drizzle cannot infer the column name from the object key when the field is a raw SQL expression. When the outer query JOINs or references the subquery, Drizzle throws a runtime error:

```
Error: You tried to reference "fieldName" field from a subquery, which is a raw SQL field,
but it doesn't have an alias declared. Please add an alias to the field using ".as('alias')" method.
```

### Correct Pattern

```ts
// ✅ Subquery: raw sql expression MUST have .as()
const lastVisitSub = db
  .select({
    customerId: visits.customerId,
    lastVisitAt: sql<Date>`max(${visits.checkinAt})`.as('lastVisitAt'),
  })
  .from(visits)
  .groupBy(visits.customerId)
  .as('lv'); // subquery alias (also required)

// ✅ Outer query JOINs subquery — field resolves correctly
const rows = await db
  .select({ lastVisitAt: lastVisitSub.lastVisitAt })
  .from(customers)
  .leftJoin(lastVisitSub, eq(customers.id, lastVisitSub.customerId));
```

### Forbidden Pattern

```ts
// ❌ Missing .as('lastVisitAt') → runtime error when referenced from outer query
const lastVisitSub = db
  .select({
    customerId: visits.customerId,
    lastVisitAt: sql<Date>`max(${visits.checkinAt})`, // MISSING .as()
  })
  .from(visits)
  .groupBy(visits.customerId)
  .as('lv');
```

### General Rule

> Every `sql<T>\`...\``inside`.select()`of a **subquery** → MUST have`.as('columnName')` matching the object key.

This is **not required** for top-level queries (Drizzle can infer), but is **100% required** for any subquery consumed via `.as('alias')`.

---

## DRIZZLE ORM — RELATIONAL QUERIES v2 (RQB v2)

This project uses `defineRelations` (Drizzle RQB v2). All `db.query.*` calls **MUST** use the v2 object-based syntax.

### `where` — Object, NOT function

```ts
// ✅ v2 — object-based
db.query.users.findMany({
  where: { id: '123', status: 'active' },
});

// ❌ v1 — function-based (FORBIDDEN)
db.query.users.findMany({
  where: (t, { eq, and }) => and(eq(t.id, '123'), eq(t.status, 'active')),
});
```

For optional/conditional filters, use spread:

```ts
// ✅ Conditional where
db.query.leaderboardSnapshots.findMany({
  where: {
    period: input.periodType,
    ...(input.gameId && { scopeId: input.gameId }),
  },
});
```

For complex conditions not expressible as an object, use `RAW`:

```ts
// ✅ RAW fallback when object-based is insufficient
db.query.scores.findMany({
  where: { RAW: (t) => sql`${t.points} > 500 AND ${t.shotsTotal} > 0` },
});
```

### `orderBy` — Object, NOT function

```ts
// ✅ v2 — object-based
db.query.playerStats.findMany({
  orderBy: { totalPoints: 'desc' },
});

// ❌ v1 — function-based (FORBIDDEN)
db.query.playerStats.findMany({
  orderBy: (t, { desc }) => [desc(t.totalPoints)],
});
```

### `with` — unchanged between v1 and v2

```ts
// ✅ Same syntax in v1 and v2
db.query.leaderboardSnapshots.findMany({
  with: {
    user: { columns: { fullName: true } },
    member: { columns: { membershipNumber: true, level: true } },
  },
});
```

### `extras` — computed columns inside RQB

```ts
import { sql } from 'drizzle-orm';

db.query.scores.findMany({
  extras: {
    accuracy: sql<number>`CAST(${scores.shotsHit} * 100.0 / ${scores.shotsTotal} AS REAL)`.as('accuracy'),
  },
});
```

### When to use Builder API instead

Use `db.select()...` (Builder) only when RQB v2 is insufficient:

- Complex `GROUP BY` / `HAVING` / aggregations
- `desc(col).limit(N)` on an arbitrary query (Builder is more flexible for compound order+limit)

> **Rule**: Prefer RQB v2 for all reads that need related data (`with:`). Use Builder API only for aggregations or when RQB v2 cannot express the query.
