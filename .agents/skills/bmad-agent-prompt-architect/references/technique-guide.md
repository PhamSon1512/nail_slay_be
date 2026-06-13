# Technique Guide — Reference Guide
# Source: workflows/technique-lookup.yaml + technique-recommend.yaml (migrated, no external dependency)
# Full technique detail files: ./techniques/01-chain-of-thought.yaml ... ./techniques/27-skeleton-plan-and-solve.yaml
# Index: ./techniques/_index.yaml

## Workflow: technique-lookup | technique-recommend

---

## technique-lookup

**Trigger:** `technique-lookup {technique_id_or_name}`

Explain the requested technique in depth. Load the corresponding YAML from `./techniques/` for full detail (world-class examples, advanced patterns, tips, mistakes). Quick-reference metadata is in `./techniques/_index.yaml`. Then format the response with:

### Deep-Dive Template

```markdown
# 🔍 {Technique Name}

## What It Is
{1-2 sentence definition}

## Why It Works
{underlying mechanism — why does this work cognitively/architecturally?}

## When to Use
- ✅ {use_case_1}
- ✅ {use_case_2}

## When NOT to Use
- ❌ {anti_case_1}

## Quick Template
```
{minimal_working_template}
```

## Real-World Example

**Task:** {example_task}

**Without technique:**
```
{naive_prompt}
```

**With technique:**
```
{technique_applied_prompt}
```

**Why it's better:** {explanation}

## Combine With
- {technique_A}: {synergy_reason}
- {technique_B}: {synergy_reason}

## Common Mistakes
1. {mistake}: {fix}
2. {mistake}: {fix}
```

---

## technique-recommend

**Trigger:** `technique-recommend` | **Input:** use case description

### Matching Algorithm

1. Extract keywords from user's description
2. Match against technique keywords in `./knowledge-base.md`
3. Score by: keyword match count × technique rank (higher rank = more impactful)
4. Return top 3-5 with explanations and a proven combination

### Use Case → Technique Mapping

| Use Case Keywords | Primary Techniques | Advanced |
|------------------|--------------------|---------|
| reasoning, math, logic, analysis | Chain-of-Thought (R1) | Tree of Thoughts (R6), AGoT (R25) |
| code, programming, debug | CoT (R1), Plan-and-Solve (R29) | Self-Debugging, Skeleton-of-Thought |
| write, content, blog, creative | Role Prompting (R5) | Self-Refine (R9), Few-Shot (R2) |
| question, answer, knowledge, fact | Generated Knowledge (R8) | Chain of Verification, RAG (R16) |
| agent, tool, api, workflow | ReAct (R3), Operational Policy (R28) | Reflexion (R17), MRKL |
| accurate, verify, critical, reliable | Self-Consistency (R4) | Chain of Verification, Self-Calibration |
| format, json, xml, schema, parse | Structured Output (R7), Few-Shot | Template Pattern, Chain-of-Table |
| efficient, fast, cheap, token | Chain of Draft (R20) | Skeleton-of-Thought (R29), Context Engineering (R11) |
| complex, explore, strategy, decision | AGoT (R25), Tree of Thoughts (R6) | GoT (R15), CAD (R26) |
| chat, interactive, conversation, guide | Flipped Interaction | Menu Actions, Ask-for-Input |
| improve, refine, iterate, quality | Self-Refine (R9) | RSIP (R27), Cumulative Reasoning |
| teach, tutor, coach, learn | Guided Learning (R23) | Role Prompting (R5), Few-Shot |
| image, vision, multimodal, ocr | Multimodal Prompting (R18) | — |
| optimize prompt, generate prompt | Meta-Prompting (R10) | APE, OPRO (R13), DSPy (R12) |
| business, strategy, swot, porter | RLM Frameworks (R21) | GoT (R15) |
| thinking model, budget, o1, o3 | Extended Thinking (R24) | Self-Consistency (R4) |
| system design, architecture, dependencies | CAD (R26) | AGoT (R25), GoT (R15) |
| production agent, escalation, policy | Operational Policy (R28) | ReAct (R3), Reflexion (R17) |
| long-form, document, report, outline | Skeleton of Thoughts (R29) | RSIP (R27), Structured Output (R7) |
| multi-dimension quality, technical precision | RSIP (R27) | Self-Refine (R9), Extended Thinking (R24) |

### Output Format

```markdown
# 💡 Technique Recommendations

**Use Case:** {use_case}
**Keywords Detected:** {keywords}

---

## 🎯 Top Recommendations

| # | Technique | Why This Works | Impact |
|---|-----------|----------------|--------|
| 1 | {technique} | {reason} | {impact} |
| 2 | {technique} | {reason} | {impact} |
| 3 | {technique} | {reason} | {impact} |

---

## ⭐ Top Pick: `{technique_name}`

**Quick Tip:** {quick_tip}

**Template:**
```
{template}
```

---

## 🔗 Recommended Combination

**{combination_name}:** {techniques}
**Why:** {reason}

---

**Next:** Use `technique-lookup {id}` for deep-dive examples and templates.
```

---

## All 29 Techniques — Quick Reference

> 💡 Deep-dive files are in `./techniques/`. Load the corresponding file when user asks for detailed explanation, examples, or templates.

| Rank | ID | Name | Category | Deep-Dive File |
|------|----|------|----------|----------------|
| 1 | `chain_of_thought` | Chain-of-Thought (CoT) | reasoning | `./techniques/01-chain-of-thought.yaml` |
| 2 | `few_shot` | Few-Shot Prompting | learning | `./techniques/02-few-shot-prompting.yaml` |
| 3 | `react` | ReAct | agents | `./techniques/03-react.yaml` |
| 4 | `self_consistency` | Self-Consistency | accuracy | `./techniques/04-self-consistency.yaml` |
| 5 | `role_prompting` | Role/Persona Prompting | identity | `./techniques/05-role-prompting.yaml` |
| 6 | `tree_of_thoughts` | Tree of Thoughts (ToT) | reasoning | `./techniques/06-tree-of-thoughts.yaml` |
| 7 | `structured_output` | Structured Output | format | `./techniques/07-structured-output.yaml` |
| 8 | `generated_knowledge` | Generated Knowledge | knowledge | `./techniques/08-generated-knowledge.yaml` |
| 9 | `self_refine` | Self-Refine | quality | `./techniques/09-self-refine.yaml` |
| 10 | `meta_prompting` | Meta-Prompting | automation | `./techniques/10-meta-prompting.yaml` |
| 11 | `context_engineering` | Context Engineering | advanced | `./techniques/11-context-engineering.yaml` |
| 12 | `dspy_framework` | DSPy Framework | advanced | `./techniques/12-dspy-framework.yaml` |
| 13 | `advanced_meta_prompting` | APE / OPRO | advanced | `./techniques/13-advanced-meta-prompting.yaml` |
| 14 | `prompt_chaining` | Prompt Chaining | workflow | `./techniques/14-prompt-chaining.yaml` |
| 15 | `graph_of_thoughts` | Graph of Thoughts (GoT) | reasoning | `./techniques/15-graph-of-thoughts.yaml` |
| 16 | `rag_prompting` | RAG Prompting | knowledge | `./techniques/16-rag-prompting.yaml` |
| 17 | `reflexion` | Reflexion | agents | `./techniques/17-reflexion.yaml` |
| 18 | `multimodal_prompting` | Multimodal Prompting | multimodal | `./techniques/18-multimodal-prompting.yaml` |
| 19 | `output_primers` | Output Primers | format | *(inline — no separate file)* |
| 20 | `chain_of_draft` | Chain of Draft (CoD) | reasoning | `./techniques/19-chain-of-draft.yaml` |
| 21 | `rlm_framework_templates` | RLM Framework Templates | reasoning | `./techniques/20-rlm-framework-templates.yaml` |
| 22 | `long_chain_of_thought` | Long Chain-of-Thought | reasoning | `./techniques/21-long-chain-of-thought.yaml` |
| 23 | `guided_learning` | Guided Learning (LearnLM) | interaction | *(see knowledge-base.md)* |
| **24** | `extended_thinking` | **Extended Thinking & Inference-Time Scaling** | reasoning | `./techniques/22-extended-thinking.yaml` |
| **25** | `adaptive_graph_of_thoughts` | **Adaptive Graph of Thoughts (AGoT)** | reasoning | `./techniques/23-adaptive-graph-of-thoughts.yaml` |
| **26** | `context_aware_decomposition` | **Context-Aware Decomposition (CAD)** | reasoning | `./techniques/24-context-aware-decomposition.yaml` |
| **27** | `recursive_self_improvement` | **Recursive Self-Improvement (RSIP)** | quality | `./techniques/25-recursive-self-improvement.yaml` |
| **28** | `agentic_operational_policy` | **Agentic Operational Policy Design** | agents | `./techniques/26-agentic-operational-policy.yaml` |
| **29** | `skeleton_plan_and_solve` | **Skeleton of Thoughts + Plan and Solve** | reasoning | `./techniques/27-skeleton-plan-and-solve.yaml` |
