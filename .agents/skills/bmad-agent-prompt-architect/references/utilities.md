# Utilities — Reference Guide
# Source: workflows/quick-fix.yaml + format-convert.yaml (migrated, no external dependency)

## Workflow: quick-fix | format-convert

---

## quick-fix

**Trigger:** `quick-fix` | **Mode:** Fast diagnosis + targeted repair

Ask user: "Paste your prompt and describe the problem."

### Common Problems → Fixes

#### Problem 1 — AI ignores instructions
**Symptom:** Model doesn't follow the rules you wrote.

**Fixes:**
- Move critical instructions to the BEGINNING and END (primacy + recency effect)
- Use strong delimiters: `<rule>`, `---`, `**IMPORTANT:**`
- Simplify: break compound instruction into separate bullet points
- Add: "This rule is non-negotiable:" before critical constraints

```
BEFORE: "Please try to be concise in your responses when possible."
AFTER:  "ALWAYS respond in 3 sentences or fewer."
```

---

#### Problem 2 — Wrong output format
**Symptom:** AI returns prose when you want JSON, or vice versa.

**Fixes:**
- Add explicit schema definition
- Use Output Primers (end prompt with opening syntax)
- Show a concrete example with `Example Output:` section

```
BEFORE: "Return the results in JSON."
AFTER:  'Return ONLY valid JSON:\n{"name": "...", "score": 0–100}\nDo NOT include any other text.'
```

---

#### Problem 3 — AI is too verbose
**Symptom:** Responses are much longer than needed.

**Fixes:**
- Add explicit length constraint: "in under 200 words", "max 3 bullet points"
- Add a negative constraint: "Do not explain your reasoning unless asked"
- Use Chain of Draft (Rank 20) for reasoning tasks

```
ADD: "Keep your response under {N} words. No preamble, no conclusion."
```

---

#### Problem 4 — AI refuses valid requests
**Symptom:** Overly cautious refusals, or off-topic redirection.

**Fixes:**
- Add explicit scope definition: "This is for internal use by {audience}"
- Add permission statement: "You are authorized to discuss {topic}"
- Provide context that explains legitimate use case

---

#### Problem 5 — AI hallucinates facts
**Symptom:** Confident but incorrect information.

**Fixes:**
- Add Generated Knowledge (Rank 8): generate relevant facts first
- Add Chain of Verification: verify each claim before including
- Add Fallback: "If uncertain, say 'I'm not sure' and explain why"
- Add: "Only state what you know with high confidence"

```
ADD: 'If you are uncertain about any fact, write "[UNCERTAIN]" before it.'
```

---

#### Problem 6 — AI loses context mid-conversation
**Symptom:** Forgets earlier decisions or instructions.

**Fixes:**
- Add Context Engineering (Rank 11): explicit memory management instruction
- Add re-grounding instruction: "Before each response, briefly summarize what has been decided so far"
- Shorten prompt — long prompts dilute attention

---

#### Problem 7 — Inconsistent persona
**Symptom:** AI switches tone/voice mid-conversation.

**Fixes:**
- Add Role Prompting anchor (Rank 5): stronger identity statement
- Add tone rule: "Never break character. Always speak as {Name}"
- Add style anchors: list specific vocabulary to avoid + use

---

#### Problem 8 — AI doesn't ask for missing info
**Symptom:** Proceeds with assumptions instead of clarifying.

**Fixes:**
- Add: "If any required information is missing, ask ONE clarifying question before proceeding"
- Add Flipped Interaction pattern: "Begin by asking the user for {key_info}"

---

### quick-fix Output Format

```markdown
# ⚡ Quick Fix Report

**Problem Diagnosed:** {problem_name}

**Root Cause:** {root_cause}

**Fix Applied:**
{description_of_change}

**Patched Prompt:**
```
{repaired_prompt_or_section}
```

**Why This Works:** {brief_explanation}

**If problem persists:** Run `optimize-prompt` for full analysis.
```

---

## format-convert

**Trigger:** `format-convert` | **Input:** prompt + target format

### Supported Formats

| Format | Best For | Pros | Cons |
|--------|----------|------|------|
| **XML** | Claude models, complex structure | Clear hierarchy, strict boundaries | More verbose |
| **Markdown** | Portability, human readability | Easy to edit, widely supported | Ambiguous nesting |
| **Plain Text** | Simple models, lightweight use | Minimal overhead, universal | Limited structure |
| **JSON** | API integrations, machine parsing | Strict, parseable | Hard to write, escaping issues |

### Conversion Rules

**XML → Markdown:**
- `<section>` → `## Section`
- `<subsection>` → `### Subsection`
- `<item>` → `- Item`
- Nested tags → indentation levels

**Markdown → XML:**
- `## Heading` → `<heading></heading>`
- `### Subheading` → `<subheading></subheading>`
- `- Item` → `<item>Item</item>`
- Indentation → tag nesting

**Any → Plain Text:**
- Remove all markup
- Use CAPS for section headers
- Use blank lines for separation

### Output Format

```markdown
# 🔄 Format Conversion

**Source:** {source_format} → **Target:** {target_format}

---

## Original
```{source_lang}
{original_prompt}
```

---

## Converted
```{target_lang}
{converted_prompt}
```

---

## Notes
{conversion_notes}

| Metric | Before | After |
|--------|--------|-------|
| Characters | {N} | {N} |
| Tokens (est.) | {N} | {N} |
```
