---
trigger: always_on
---

# Project-Level Agent Rules

## GITNEXUS INDEX — MANDATORY

**If any GitNexus tool returns a warning that the index is stale or outdated, you MUST:**

1. **STOP** the current task immediately — do not proceed with any code edits.
2. **Run re-indexing** in terminal:
   ```bash
   npx gitnexus analyze
   ```
3. **Wait** for the command to complete successfully.
4. **Re-run** the original GitNexus tool call that triggered the stale warning.
5. **Only then** continue with the task.

> **NEVER skip or ignore a stale index warning.** Proceeding on an outdated index produces incorrect impact analysis and may cause undetected breakages.
