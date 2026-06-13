# Evaluate Prompt — Reference Guide
# Source: workflows/prompt-evaluation.yaml (migrated, no external dependency)

## Workflow: evaluate-prompt | checklist

**Trigger:** `evaluate-prompt` or `checklist` | **Mode:** Scoring → Report

---

## Input Required

Ask user to provide the prompt to evaluate. Optionally ask:
- What is this prompt supposed to do?
- Known issues they suspect?

---

## 12-Point Scoring Rubric

Score each criterion 0–10. **Final score = (sum of all 12 scores) / 120 × 100** = 0–100.

### Criterion 1 — Identity Clarity (weight: high)
| Score | Description |
|-------|-------------|
| 9-10 | Expert identity with specific expertise, domain, years of experience |
| 7-8 | Clear role with some specificity |
| 5-6 | Generic role ("You are an assistant") |
| 0-4 | No identity defined |

### Criterion 2 — Mission Precision (weight: high)
| Score | Description |
|-------|-------------|
| 9-10 | Clear, specific, single mission statement |
| 7-8 | Clear mission, slightly broad |
| 5-6 | Vague or compound mission |
| 0-4 | No mission or contradictory goals |

### Criterion 3 — Capability Definition (weight: medium)
| Score | Description |
|-------|-------------|
| 9-10 | Explicit CAN and CANNOT lists |
| 7-8 | Has capabilities but missing constraints |
| 5-6 | Partial — either CAN or CANNOT |
| 0-4 | No capability definition |

### Criterion 4 — Behavior & Process (weight: high)
| Score | Description |
|-------|-------------|
| 9-10 | Clear step-by-step workflow with numbered phases |
| 7-8 | Process described but not structured |
| 5-6 | Implicit process only |
| 0-4 | No process guidance |

### Criterion 5 — Output Format (weight: high)
| Score | Description |
|-------|-------------|
| 9-10 | Explicit format with schema/template/example |
| 7-8 | Format described but no schema |
| 5-6 | Output mentioned but not specified |
| 0-4 | No output format |

### Criterion 6 — Technique Application (weight: medium)
| Score | Description |
|-------|-------------|
| 9-10 | 3+ techniques applied appropriately |
| 7-8 | 1-2 techniques present |
| 5-6 | Implicit technique use |
| 0-4 | No recognized technique |

### Criterion 7 — Tone & Style (weight: medium)
| Score | Description |
|-------|-------------|
| 9-10 | Explicit tone with examples of good/bad language |
| 7-8 | Tone defined, no examples |
| 5-6 | Implicit tone only |
| 0-4 | No tone guidance |

### Criterion 8 — Edge Case Handling (weight: medium)
| Score | Description |
|-------|-------------|
| 9-10 | Covers uncertainty, off-topic, and ambiguous inputs |
| 7-8 | Covers 1-2 edge cases |
| 5-6 | Partial coverage |
| 0-4 | No edge case handling |

### Criterion 9 — Safety & Ethics (weight: high)
| Score | Description |
|-------|-------------|
| 9-10 | Explicit refusal conditions + ethical guidelines |
| 7-8 | Basic safety rules present |
| 5-6 | Implicit limits only |
| 0-4 | No safety guardrails |

### Criterion 10 — Token Efficiency (weight: low)
| Score | Description |
|-------|-------------|
| 9-10 | Tight, no redundancy, no filler words |
| 7-8 | Minor redundancy |
| 5-6 | Moderate padding |
| 0-4 | Heavy redundancy or verbose filler |

### Criterion 11 — Structure & Readability (weight: medium)
| Score | Description |
|-------|-------------|
| 9-10 | Clear hierarchy with sections, proper delimiters |
| 7-8 | Some structure, could be better organized |
| 5-6 | Minimal structure |
| 0-4 | Wall of text, no structure |

### Criterion 12 — Testability (weight: medium)
| Score | Description |
|-------|-------------|
| 9-10 | Can write 5 test cases immediately from reading the prompt |
| 7-8 | 3-4 test cases obvious |
| 5-6 | 1-2 test cases clear |
| 0-4 | Untestable — too vague to validate |

---

## Score Interpretation

| Score | Grade | Action |
|-------|-------|--------|
| 90-100 | 🟢 **Excellent** | Production-ready — no action needed |
| 75-89 | 🔵 **Good** | Run `quick-fix` on top 1-2 issues |
| 60-74 | 🟡 **Fair** | Run `optimize-prompt` for targeted rewrite |
| 40-59 | 🟠 **Poor** | Run `optimize-prompt` — major revision required |
| 0-39 | 🔴 **Critical** | Rebuild from scratch using `create-prompt` |

---

## Output Format

```markdown
# 📊 Prompt Evaluation Report

## Summary
**Score: {score}/100** — {grade}

| Criterion | Score | Notes |
|-----------|-------|-------|
| 1. Identity Clarity | {n}/10 | {note} |
| 2. Mission Precision | {n}/10 | {note} |
| 3. Capability Definition | {n}/10 | {note} |
| 4. Behavior & Process | {n}/10 | {note} |
| 5. Output Format | {n}/10 | {note} |
| 6. Technique Application | {n}/10 | {note} |
| 7. Tone & Style | {n}/10 | {note} |
| 8. Edge Case Handling | {n}/10 | {note} |
| 9. Safety & Ethics | {n}/10 | {note} |
| 10. Token Efficiency | {n}/10 | {note} |
| 11. Structure & Readability | {n}/10 | {note} |
| 12. Testability | {n}/10 | {note} |

---

## 🔺 Top Issues to Fix

1. **{criterion}** (Score: {n}/10)
   - Problem: {description}
   - Fix: {recommendation}

[... top 3 issues ...]

---

## 💡 Recommended Techniques

{technique_recommendations_from_knowledge-base}

---

**Next:** Run `optimize-prompt` to apply fixes, or `quick-fix` for targeted repairs.
```

---

## Checklist Mode (fast)

When triggered as `checklist`, skip scoring detail — just run binary ✅/❌ checks:

```markdown
# ✅ Prompt Quality Checklist

- [ ] Identity defined and specific
- [ ] Mission statement present
- [ ] Can/Cannot constraints listed
- [ ] Process/workflow structured
- [ ] Output format specified
- [ ] At least 1 technique applied
- [ ] Tone defined
- [ ] Edge cases handled
- [ ] Safety guardrails included
- [ ] No redundant instructions
- [ ] Clear section structure
- [ ] Testable behaviors

**Result:** {N}/12 checks passed
```
