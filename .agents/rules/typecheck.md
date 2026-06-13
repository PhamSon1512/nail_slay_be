# Type Checking — MANDATORY BEFORE COMPLETING ANY TASK

## Command

Whenever you need to verify TypeScript types for files inside `jobs/`, `models/store/system*`, or `models/store/revenue*`, run:

```bash
npx tsc --noEmit 2>&1 | grep -E "jobs/|models/store/system|models/store/revenue" | head -40
```

To do a **full project type-check** (no filter):

```bash
npx tsc --noEmit 2>&1 | head -60
```

## When to Run

- **After every code change** to any file inside `src/jobs/`, `src/models/store/system*.ts`, or `src/models/store/revenue*.ts`.
- **Before marking any task as complete** that touches TypeScript types, Drizzle schema, or service-layer contracts.
- **Before committing** — run the filtered check at minimum, full check preferred.

## Interpretation Rules

| Output                | Meaning                    | Action                     |
| --------------------- | -------------------------- | -------------------------- |
| Empty / no output     | ✅ No type errors in scope | Safe to proceed            |
| Lines with `error TS` | ❌ Type errors found       | MUST fix before proceeding |
| Lines with `warning`  | ⚠️ Non-blocking warnings   | Review, fix if trivial     |

## Rules

- **NEVER claim a task is done if the type-check returns any `error TS` line.**
- Run the **filtered command first** (faster); run the full command when unsure about cross-module impact.
- If `tsc` itself fails to run (e.g. missing `tsconfig.json`), stop and report the issue immediately.
- Do not suppress errors with `// @ts-ignore` or `// @ts-expect-error` without explicit user approval.
