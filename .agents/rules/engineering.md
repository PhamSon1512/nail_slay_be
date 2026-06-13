---
trigger: always_on
---

# Project Scale — ALWAYS KEEP IN MIND

This system manages **production-scale data**:

| Entity     | Volume  |
| ---------- | ------- |
| Clubs      | ~1,000  |
| Members    | ~10,000 |
| Affiliates | ~50,000 |

**Every design decision must account for this scale.** A solution that works fine at 100 rows may collapse at 50,000. Before writing any query, endpoint, or data structure, ask: _does this hold under production load?_

> **Critical**: Unindexed joins, full-table scans, or in-memory aggregations over affiliate/member data are **not acceptable** in any hot path.

---

# Engineering Principles — MANDATORY

These rules apply to **every line of code** written or modified. No exceptions.

---

## 1. SIMPLICITY FIRST

- **Always choose the simplest solution that correctly solves the problem.**
- Do not add abstraction, indirection, or generalization until it is concretely needed.
- If two solutions are equal in correctness, pick the shorter, more readable one.
- Delete code instead of commenting it out. Dead code is noise.

> **Red flag**: If you're adding a factory for a factory, an abstraction over an abstraction, or a helper that's only called once — stop and reconsider.

---

## 2. RESOURCE EFFICIENCY

- **Prefer lazy evaluation over eager loading.** Only fetch/compute what is actually needed.
- Avoid N+1 queries. Always batch or join when querying relations.
- Use indexes. Never filter on unindexed columns in hot paths.
- Avoid redundant computations inside loops; hoist invariants out.
- Cache results that are expensive and stable; invalidate explicitly.

> **Red flag**: Any database call inside a loop is a bug candidate. Any unindexed `.where()` on a large table needs justification.

---

## 3. DRY — DON'T REPEAT YOURSELF

- **Every piece of knowledge must have a single, unambiguous representation.**
- Extract shared logic into a utility/helper the moment it appears **twice**.
- Shared types, constants, and schemas live in one place and are imported everywhere else.
- Do not copy-paste code between files — refactor instead.

> **Red flag**: If you're about to write code that looks like something that already exists, search for it first.

---

## 4. SOLID PRINCIPLES

### S — Single Responsibility

Each function, class, or module does **one thing** and does it well.
A function that validates, transforms, and persists data is three functions duct-taped together.

### O — Open/Closed

Extend behavior via composition and configuration, not by editing internals.
Prefer adding new handlers/strategies over modifying existing switch/if-else chains.

### L — Liskov Substitution

Implementations must fulfill the full contract of their interface.
If a subtype breaks a caller's assumptions, the abstraction is wrong.

### I — Interface Segregation

Expose only what callers need. Avoid fat interfaces.
A route handler does not need the full service — expose only the method it calls.

### D — Dependency Inversion

Depend on abstractions, not concretions.
Inject dependencies; do not instantiate them inside functions.

---

## 5. SMART DEFAULTS

- **Fail fast and loudly.** Validate inputs at the boundary, not deep in the call stack.
- Use types fully — avoid `any`, casting, and `!` non-null assertions without justification.
- Keep functions pure where possible; isolate side-effects at the edges.
- Name things precisely: `getUserById` not `getUser`, `isExpired` not `check`.

---

## Self-Check Before Writing Any Code

Before writing or modifying code, ask:

1. Is there already code that does this? → **Reuse it.**
2. Is this the simplest correct solution? → **If not, simplify.**
3. Does this function do more than one thing? → **Split it.**
4. Am I fetching more data than needed? → **Scope the query.**
5. Will this scale, or will it become a bottleneck? → **Design accordingly.**
