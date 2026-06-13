---
trigger: always_on
priority: highest
---

# MANDATORY SELF-REVIEW — BEFORE CLAIMING ANY TASK IS DONE

> **This is the highest-priority rule in the project.**
> No code, file, or response is considered complete until this checklist has been executed mentally (or explicitly) by the agent.

After writing or modifying **any** code, run through these layers in order. If **any item fails**, fix it before responding "done".

---

## Layer 1 — Correctness

- [ ] Does the logic actually solve what was asked, **not a simpler adjacent version of it**?
- [ ] Are all edge cases handled? (empty arrays, null/undefined, zero denominators, empty DB results)
- [ ] Do conditionals cover **all branches**, including the else-path?
- [ ] Are aggregate functions (SUM, AVG, COUNT) scoped to the correct dataset? (no global leaks across unrelated records)
- [ ] Do subqueries reference the outer context with proper WHERE filters?

## Layer 2 — Data Integrity

- [ ] Could any write path violate a DB constraint (uniqueness, FK, NOT NULL)?
- [ ] Could any read path return **stale, duplicated, or cross-contaminated data**?
  - Watch for: JOIN fan-out (1-to-many inflating SUM/COUNT), missing DISTINCT on aggregations
- [ ] Are financial amounts (`pricePaid`, `totalRevenue`, etc.) deduplicated before summing?
- [ ] Are soft-deleted rows filtered out where relevant (`deletedAt IS NULL`)?

## Layer 3 — Security

- [ ] Can any input be used for injection (raw string interpolation in SQL)?
- [ ] Does any query leak data across store/user/tenant boundaries?
- [ ] Are internal secrets / DO tokens validated before trust?
- [ ] Could an attacker pass crafted input to skip an integrity check?

## Layer 4 — Performance

- [ ] Is there a DB call inside a loop? → **Must batch or JOIN instead.**
- [ ] Are WHERE filters using indexed columns? (check `src/models/` for index definitions)
- [ ] Are aggregation queries run at scale feasible for 50,000 affiliate rows?
- [ ] Are expensive queries parallelized with `Promise.all` where safe?

## Layer 5 — TypeScript & Type Safety

- [ ] No implicit `any` types — all parameters and return types are explicit or inferred safely.
- [ ] No `as Type` casts without justification.
- [ ] No `!` non-null assertions unless the value is provably non-null at that point.
- [ ] Does the Drizzle query use **RQB v2 syntax** (`where: {}`, `orderBy: {}`) not v1 callback syntax?
- [ ] Are raw `sql<T>` expressions inside subqueries aliased with `.as('alias')`?

## Layer 6 — Dead Code & Cleanliness

- [ ] Are all declared variables actually used in the return value or a side effect?
- [ ] Are all imports actually used?
- [ ] Are there any commented-out code blocks? → **Delete them.**
- [ ] Are computed values exposed to callers, or silently discarded?

---

## How to Apply This Rule

**For every task**, mentally run this checklist after writing code. If you find a failure:

1. Fix it immediately.
2. Briefly note what was found and fixed (1 sentence max per item).

You do NOT need to print the checklist in your response. Just run it, fix issues, then respond.

> **Example of correct behavior**: Agent writes a service, internally notices the revenue SUM would be inflated by JOIN fan-out (Layer 2), fixes it with DISTINCT before responding. In the response, briefly mentions: _"Fixed potential revenue double-count via DISTINCT on purchase join."_

> **Example of incorrect behavior**: Agent writes code, immediately responds "Done!", only for the user to notice bugs later.
