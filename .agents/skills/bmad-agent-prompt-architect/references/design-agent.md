# Design Agent — Reference Guide
# Source: workflows/agent-design.yaml + multi-agent-design.yaml (migrated, no external dependency)

## Workflow: design-agent | multi-agent

**Trigger:** `design-agent` or `multi-agent` | **Mode:** Interactive (discovery → blueprint)

---

## Single Agent Design (design-agent)

### Phase 1 — Agent Discovery

Gather through conversation:

| Question | Purpose |
|----------|---------|
| What does this agent do? | Core mission |
| Who is the primary user? | Audience + tone |
| What workflows/commands does it need? | Capability scope |
| What should it never do? | Hard constraints |
| What persona/name/style? | Identity |
| What triggers activation? | Interaction model |
| What output format? | Output spec |

### Phase 2 — Persona Architecture

Build the identity layer using these components:

```
Role:        [Job title/function — be specific]
Name:        [Optional human name adds personality]
Expertise:   [Domain knowledge + years of experience]
Style:       [Communication register: formal/casual/expert/coach]
Principles:  [2-4 non-negotiable behaviors]
```

**Persona quality criteria:**
- Expert identity (not "helpful assistant")
- Distinct voice that fits the use case
- Specific domain knowledge
- Clear principles that guide edge-case behavior

### Phase 3 — Capability Mapping

For each capability, define:

```
Name:        [Command name, e.g. "analyze-contract"]
Trigger:     [How user invokes it]
Input:       [What the agent needs from user]
Process:     [What the agent does — which technique]
Output:      [Format and structure of result]
Reference:   [optional: ./references/{file}.md]
```

### Phase 4 — Agent Blueprint Output

Deliver a complete blueprint in this format:

**Header:**
```
# 🤖 Agent Design: {Agent Name}
```

**Sections to include:**

| Section | Content |
|---------|---------|
| Identity | Role, Name, Expertise, Communication Style |
| Mission | 1-3 sentences stating core purpose |
| Capabilities | Table: Command / Description / Technique |
| Constraints | Can / Cannot lists |
| Interaction Model | Greeting, input handling, escalation |
| Output Format | Default output structure |
| Safety | Ethical guidelines, refusals |

**Deliverable:** Full system prompt in XML, ready to deploy, appended after the blueprint sections.

```xml
<!-- System prompt template -->
<system_prompt>
  <identity>...</identity>
  <mission>...</mission>
  <capabilities><can>...</can><cannot>...</cannot></capabilities>
  <behavior>...</behavior>
  <output_format>...</output_format>
  <safety>...</safety>
</system_prompt>
```

---

## Multi-Agent System Design (multi-agent)

### Architecture Patterns

| Pattern | Structure | Best For |
|---------|-----------|---------|
| **Hub & Spoke** | Central orchestrator → specialized agents | Clear task delegation, independent sub-tasks |
| **Pipeline** | Agent A → Agent B → Agent C → Output | Sequential processing, content transformation |
| **Collaborative** | Agents share state, peer-to-peer | Complex problem solving, consensus |
| **Hierarchical** | Master Orchestrator → Sub-Orchestrators → Agents | Large systems, enterprise scale |
| **Debate** | Agent A (Pro) vs Agent B (Con) → Judge | Decisions, risk assessment, ethical review |

### Design Process (5 Phases)

**Phase 1 — System Analysis**
- What is the end-to-end workflow?
- What are the main task categories?
- Where are the decision points?
- What information flows between stages?
- What are the failure modes?

**Phase 2 — Architecture Selection**
Use the pattern table above. Match system requirements to pattern best-fit.

**Phase 3 — Agent Specification**

For the Orchestrator:
- Receives and analyzes requests
- Decomposes tasks
- Routes to appropriate agents
- Aggregates results
- Handles failures and escalations

For each Specialist Agent:
- Define clear single responsibility
- Specify input/output format
- Define reasoning approach (which technique)
- Set quality criteria
- Define handoff conditions

**Phase 4 — Communication Design**

Message format between agents:
```xml
<message>
  <from>{sender_agent}</from>
  <to>{receiver_agent}</to>
  <type>request|response|broadcast</type>
  <task_id>{unique_id}</task_id>
  <content>{message_content}</content>
  <context>{shared_context}</context>
</message>
```

Handoff protocol:
1. Sender completes task
2. Sender formats output for receiver
3. Orchestrator routes message
4. Receiver acknowledges
5. Receiver processes and responds

Error scenarios to handle: agent timeout, invalid response, conflicting outputs, escalation needed.

**Phase 5 — Integration Testing**

Test scenarios:
- Happy path: standard successful workflow
- Agent failure: one agent fails, system recovers
- Conflicting outputs: agents produce contradictory results
- Cascade effect: error in one stage propagates
- Edge cases: unusual inputs and corner cases

### Orchestrator Prompt Template

```xml
<orchestrator>
  <identity>
    You are the Master Orchestrator for the {system_name} system.
    You coordinate the following specialized agents:
    {agent_list}
  </identity>

  <responsibilities>
    1. Analyze incoming requests
    2. Decompose into sub-tasks
    3. Route to appropriate agents
    4. Aggregate and validate results
    5. Handle errors and escalations
  </responsibilities>

  <agent_capabilities>
    {agent_capabilities_matrix}
  </agent_capabilities>

  <routing_rules>
    {routing_logic}
  </routing_rules>

  <aggregation_rules>
    {how_to_combine_results}
  </aggregation_rules>

  <error_handling>
    {error_handlers}
  </error_handling>
</orchestrator>
```

### Multi-Agent Output Format

```markdown
# 🔗 Multi-Agent System: {system_name}

## Overview
| Aspect | Value |
|--------|-------|
| Purpose | {purpose} |
| Architecture | {pattern} |
| Total Agents | {count} |
| Complexity | {low/medium/high} |

## Architecture Diagram
```
{ascii_diagram}
```

## Orchestrator
{orchestrator_spec}

## Specialist Agents
{agent_1_spec}
{agent_2_spec}
[...]

## Communication Protocol
{message_format + handoff_rules}

## Main Workflow
{step_by_step_flow}

## Prompts
### Orchestrator
```xml
{orchestrator_prompt}
```

### Agent Prompts
{individual_agent_prompts}

## Next Steps
- Implement individual agents
- Test each agent independently
- Integration testing
- Monitor and optimize
```
