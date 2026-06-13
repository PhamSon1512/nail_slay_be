---
name: requesting-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
---

# Requesting Code Review

Perform a focused self-review of completed work before moving on. In Antigravity, there are no separate reviewer subagents — the same agent reviews its own output with fresh eyes.

**Core principle:** Review early, review often.

## When to Request Review

**Mandatory:**
- After each task in subagent-driven development
- After completing major feature
- Before merge to main

**Optional but valuable:**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing complex bug

## How to Review

**1. Get the diff:**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or origin/main
git diff $BASE_SHA HEAD
```

**2. Self-review checklist — read the diff and check:**

- **Spec compliance:** Does the code match every requirement? Nothing extra, nothing missing?
- **Edge cases:** Are null/undefined/empty inputs handled?
- **Security:** Any SQL injection, data leaks, unvalidated input?
- **Performance:** N+1 queries? Unindexed filters on hot paths?
- **Type safety:** No `any`, no unguarded `!`, no unsafe casts?
- **Dead code:** All declared variables used? All imports used?

**3. Act on findings:**
- Fix Critical issues immediately before moving on
- Fix Important issues before claiming task complete
- Note Minor issues for a follow-up pass

## Example

```
[Just completed Task 2: Add verification function]

You: Let me review before proceeding.

git diff HEAD~1 HEAD | head -200

[Read diff carefully]
[Self-review findings:]
  Spec compliance: ✅ verifyIndex() and repairIndex() both present
  Edge cases: ⚠️ Missing progress reporting (spec says "every 100 items")
  Security: ✅ No injection risks
  Types: ✅ All explicit
  Dead code: ⚠️ Magic number 100 — extract as constant

[Fix: add progress reporting, extract PROGRESS_INTERVAL constant]
[Continue to Task 3]
```

## Integration with Workflows

**Subagent-Driven Development:**
- Review after EACH task
- Catch issues before they compound
- Fix before moving to next task

**Executing Plans:**
- Review after each batch (3 tasks)
- Get feedback, apply, continue

**Ad-Hoc Development:**
- Review before merge
- Review when stuck

## Red Flags

**Never:**
- Skip review because "it's simple"
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback

**If reviewer wrong:**
- Push back with technical reasoning
- Show code/tests that prove it works
- Request clarification

See template at: requesting-code-review/code-reviewer.md
