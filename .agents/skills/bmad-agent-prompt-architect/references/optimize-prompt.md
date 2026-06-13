# Optimize Prompt — Reference Guide
# Source: workflows/prompt-optimization.yaml (migrated, no external dependency)

## Workflow: optimize-prompt

**Trigger:** `optimize-prompt` | **Mode:** Analysis → Rewrite

---

## Input Required

Ask user to provide:
1. The existing prompt (paste it)
2. *(Optional)* What specific problem are they experiencing? (hallucinations, wrong tone, wrong format, etc.)
3. *(Optional)* Target model (Claude, GPT-4, Gemini, etc.)

---

## Phase 1 — DIAGNOSIS

Analyze the prompt against these 8 weakness categories:

### Weakness Checklist

| # | Issue | Symptom | Severity |
|---|-------|---------|----------|
| 1 | **Vague Identity** | "You are a helpful AI" — no expertise specified | High |
| 2 | **Missing Constraints** | No explicit "do not" rules → scope creep | High |
| 3 | **No Output Format** | AI decides format freely → inconsistent results | High |
| 4 | **Implicit Tone** | No communication style defined → random register | Medium |
| 5 | **Redundant Instructions** | Same idea repeated 3× → wastes tokens, may confuse | Medium |
| 6 | **Missing Fallback** | No guidance for uncertainty / edge cases | Medium |
| 7 | **Step Confusion** | Multi-step process but no clear ordering | Medium |
| 8 | **Token Waste** | Filler phrases ("Please kindly always ensure that…") | Low |
| 9 | **No Double-Anchoring** | Critical rules stated once in the middle — ignored | High |

For each issue found, mark and note a specific quote from the prompt.

---

## Phase 2 — TECHNIQUE RECOMMENDATIONS

After diagnosis, recommend 2-3 techniques from `./knowledge-base.md` that would most improve the prompt:

**Selection logic:**
- Vague identity → **Role Prompting** (Rank 5)
- No step structure → **Prompt Chaining** (Rank 14) or **Recipe Pattern**
- Inconsistent output → **Structured Output** (Rank 7)
- Accuracy issues → **Self-Consistency** (Rank 4) or **Chain of Verification**
- Content quality → **Self-Refine** (Rank 9)
- Agent behavior → **ReAct** (Rank 3)
- Critical rules ignored → **U-Shape Attention** (double-anchor at start + end)

> If score is 0–39 across multiple dimensions, skip optimization — recommend `create-prompt` rebuild instead.

---

## Phase 3 — REWRITE

Produce the optimized prompt. Structure:

```
## Original Prompt Issues Found
{numbered list of issues with quotes}

## Techniques Applied
{technique name + why it was applied}

## Optimized Prompt
{full rewritten prompt}

## Changes Summary
| Change | Reason |
|--------|--------|
| {what changed} | {why} |
```

---

## Phase 4 — DELTA ANALYSIS

After rewriting, show a before/after comparison:

```
| Metric | Before | After |
|--------|--------|-------|
| Issues found | N | 0 |
| Estimated tokens | N | N (-X%) |
| Techniques applied | 0 | N |
| Structure | {before_desc} | {after_desc} |
```

---

## Common Optimization Patterns

### Pattern: Strengthen Identity
```
BEFORE: "You are a helpful assistant."
AFTER:  "You are Alex, a senior business analyst with 10 years of experience
         in financial modeling and startup due diligence."
```

### Pattern: Add Output Schema
```
BEFORE: "Analyze the following text."
AFTER:  "Analyze the following text. Return ONLY a JSON object:
         { 'sentiment': 'positive|negative|neutral',
           'key_points': ['...'],
           'confidence': 0.0–1.0 }"
```

### Pattern: Replace Vague with Specific
```
BEFORE: "Be professional."
AFTER:  "Write in a direct, confident tone. Use short paragraphs.
         Avoid filler phrases like 'certainly', 'of course', 'great question'."
```

### Pattern: Add Fallback Handling
```
BEFORE: (nothing for edge cases)
AFTER:  "If the user's request is unclear, ask one clarifying question.
         If the topic is outside your scope, say so clearly and suggest
         what type of help you CAN provide."
```

### Pattern: Token Compression
```
BEFORE: "Please always make sure to carefully consider and think about
         the user's request before providing your thoughtful response."
AFTER:  "Think before responding."
```

---

## Output Format

```markdown
# 🔧 Prompt Optimization Report

## 📋 Issues Found ({N} total)

1. **{Issue Name}** — Severity: {High/Medium/Low}
   > Quote: "{problematic_text}"
   Fix: {what to do}

[... repeat for each issue ...]

---

## ⚡ Techniques Applied
- {Technique}: {reason}

---

## ✨ Optimized Prompt

```{format}
{rewritten_prompt}
```

---

## 📊 Before vs After

| Metric | Before | After |
|--------|--------|-------|
| Issues | {N} | 0 |
| Tokens (est.) | {N} | {N} |

**Next:** Run `evaluate-prompt` to score the optimized version.
```
