# Create Prompt — Reference Guide
# Source: workflows/prompt-creation.yaml (migrated, no external dependency)

## Workflow: create-prompt | use-template

**Trigger:** `create-prompt` or `use-template` | **Mode:** Interactive (4 phases)

---

## Phase 0 — THINK FIRST

Before starting, classify the request:

- **Build request** (create-prompt) → Full Discovery → Architecture → Implementation flow
- **Template selection** (use-template) → Jump to Template Library at bottom, skip Discovery
- **User is vague** → Ask ONE scoping question before starting

---

## Phase 1 — DISCOVERY

Goal: Understand what the user actually needs. Gather conversationally — adapt to what they share, don't feel like a form.

**Required:**
- What is the AI's role / purpose?
- Who is the target user (persona, skill level, context)?
- What are the key tasks the AI must perform?
- What tone/style is expected?
- What should the AI NOT do (constraints, hard refusals)?
- What is the output format?

**Optional but valuable:**
- Target platform / model? (Claude, GPT-4, Gemini, local?)
- Any existing prompt to build on?
- Examples of ideal vs bad outputs?
- Token budget constraints?

**Exit condition:** Once you have role, tasks, constraints, and format — proceed to Architecture.

---

## Phase 2 — ARCHITECTURE

> Decide structure before writing. Never skip this phase — even for simple prompts.

### Step 2.1 — Choose Prompt Structure

| Complexity | Condition | Structure |
|------------|-----------|-----------|
| Simple | Single-purpose, clear output | Identity → Mission → Behavior → Format |
| Complex | Multi-step reasoning required | + Thinking Approach + Examples |
| Agent | Tool use, multi-capability | + Tools + Workflows + Memory |
| Multi-agent | Multiple AI components | + Orchestrator + Sub-agents + Coordination |

### Step 2.2 — Select Techniques

From `./references/knowledge-base.md` or `./techniques/`:

- If reasoning required → **CoT** (Rank 1), optionally **ToT** (Rank 6) for complex paths
- If workflow with steps → **Prompt Chaining** (Rank 14) + numbered phases
- If output must be parsed → **Structured Output** (Rank 7) with schema
- If strong persona → **Role Prompting** (Rank 5) anchor
- If accuracy is critical → **Self-Consistency** (Rank 4) or Chain of Verification
- If tool use → **ReAct** (Rank 3)
- If improving existing prompt → **Self-Refine** (Rank 9)

### Step 2.3 — Choose Format

| Format | Best For |
|--------|---------|
| XML | Claude models, complex nested structure |
| Markdown | Portability, human-readable |
| Plain Text | Simple models, lightweight tasks |

### Step 2.4 — Plan Safety Layer

- Ethical guidelines  
- Allowed/forbidden content policy  
- Refusal handling (how to say no gracefully)  
- Uncertainty handling (what to do when unsure)

### Step 2.5 — Token Budget

- Estimate total prompt tokens  
- Identify what can be lazy-loaded vs always present  
- If heading over 800 tokens → restructure with progressive disclosure  
- Flag any section that could be moved to a reference file

---

## Phase 3 — IMPLEMENTATION

Write the prompt following the structure selected in Phase 2.

### U-Shape Attention Rule

LLMs pay disproportionate attention to the **beginning and end** of prompts. For high-stakes constraints (safety rules, format mandates, refusal conditions) — double-anchor: place at BOTH beginning and end.

```
[CRITICAL INSTRUCTION — beginning]
...
[Main content body]
...
[REMINDER of critical instruction — end]
```

### Core Sections Reference

```xml
<system_prompt>
  <identity>
    <!-- Who the AI is — role, name, expertise -->
  </identity>

  <mission>
    <!-- Core purpose in 1-3 sentences -->
  </mission>

  <capabilities>
    <can>
      <!-- List of allowed/encouraged behaviors -->
    </can>
    <cannot>
      <!-- Hard limits and refusals -->
    </cannot>
  </capabilities>

  <behavior>
    <!-- Step-by-step process, interaction style, workflow -->
  </behavior>

  <output_format>
    <!-- Specify structure, length, schema if needed -->
  </output_format>

  <examples>
    <!-- 2-3 input→output examples if format matters -->
  </examples>

  <safety>
    <!-- Ethical guardrails, refusal handling, uncertainty fallback -->
  </safety>
</system_prompt>
```

**Anti-patterns to eliminate:**
- Vague identity ("You are a helpful assistant")
- Missing constraints → scope creep
- No output format → AI guesses
- Walls of text → hard to scan
- Redundant instructions → trust the model

---

## Phase 4 — REVIEW

Run this internal checklist before delivering. Fix any ❌ before output.

| # | Check |
|---|-------|
| 1 | Identity is specific and expert (not generic) |
| 2 | At least one technique applied and named |
| 3 | Output format explicitly defined |
| 4 | Constraints and refusals specified |
| 5 | Tone/style anchored |
| 6 | No redundant instructions |
| 7 | Edge cases and uncertainty handled |
| 8 | Token-lean (no padding, no filler) |
| 9 | Critical rules double-anchored (start + end) |

After delivering — follow **Post-Creation Iteration Protocol** (see SKILL.md).

---

## Template Library

### Template A — Expert Assistant (General Purpose)
```xml
<system_prompt>
  <identity>
    You are {Name}, a {role} specializing in {domain}.
    You have {N} years of experience in {specific area}.
  </identity>

  <mission>
    Help {target_user} achieve {outcome} by {method}.
  </mission>

  <capabilities>
    <can>
      - {capability_1}
      - {capability_2}
    </can>
    <cannot>
      - {constraint_1}
      - {constraint_2}
    </cannot>
  </capabilities>

  <behavior>
    1. {step_1}
    2. {step_2}
    3. {step_3}
  </behavior>

  <output_format>
    {format_specification}
  </output_format>
</system_prompt>
```

### Template B — Workflow Agent (Step-by-step Process)
```xml
<system_prompt>
  <identity>You are {Agent}, an AI that {purpose}.</identity>

  <workflow>
    <phase name="gather">
      Ask clarifying questions: {question_list}
    </phase>
    <phase name="process">
      {process_steps}
    </phase>
    <phase name="output">
      Deliver in format: {format}
    </phase>
  </workflow>

  <rules>
    - Always complete Phase 1 before Phase 2
    - {rule_2}
  </rules>
</system_prompt>
```

### Template C — Structured Output (API/Data)
```
You are {Name}, a {role}.

Task: {task_description}

Output ONLY valid JSON matching this schema:
{
  "field1": "<type> — description",
  "field2": "<type> — description"
}

Rules:
- {constraint_1}
- Return null for missing fields, never omit them
```

### Template D — Conversational (Chat / Coaching)
```
# Identity
You are {Name}, a {role}.

# Personality & Style
{tone}, {communication_style}. You {behavioral_trait}.

# Core Mission
{mission_statement}

# Interaction Rules
- Always {positive_rule}
- Never {negative_rule}
- If unsure: {fallback_behavior}

# Example Exchange
User: {example_input}
You: {example_response}
```

### Template E — Multi-task Router
```xml
<system_prompt>
  <identity>You are {Orchestrator}, responsible for {system_purpose}.</identity>

  <routing>
    When user asks about {topic_1} → handle with {approach_1}
    When user asks about {topic_2} → handle with {approach_2}
    Default → {default_behavior}
  </routing>

  <constraints>
    {shared_constraints}
  </constraints>
</system_prompt>
```

---

## Use-Template Mode

If triggered as `use-template`, present the 5 templates above with a 1-line description. Let user pick one. Guide them through filling each `{placeholder}` interactively. Show the final result with all placeholders replaced and confirm before delivering.


