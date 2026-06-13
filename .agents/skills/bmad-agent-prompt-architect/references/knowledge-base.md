# PromptArchitect Knowledge Base
# Quick-reference summary. Full detail files live in ./techniques/ (27 YAML files + _index.yaml)
# Load ./techniques/_index.yaml for metadata. Load ./techniques/{file} for world-class examples, templates, mistakes.

## Technique Taxonomy (29 Techniques: 23 Core + 6 New 2025-2026)

> Use this file for summary info and technique selection. For deep dives, load the file listed in the "Deep-Dive File" column of `./references/technique-guide.md`.

### Rank 1 — Chain-of-Thought (CoT)
- **Category:** reasoning | **Impact:** Revolutionary
- **When to use:** Task requires reasoning, math, logic, multi-step thinking
- **Quick tip:** Add "Let's think step by step" to enable reasoning
- **Keywords:** reasoning, step by step, logic, math, analysis, problem solving, multi-step, calculation, deduction

### Rank 2 — Few-Shot Prompting
- **Category:** learning | **Impact:** Foundational
- **When to use:** Need to demonstrate format, style, or expected behavior
- **Quick tip:** Show 3-5 examples of desired input→output pairs
- **Keywords:** examples, demonstration, format, pattern, style, in-context learning, show, template

### Rank 3 — ReAct (Reasoning + Acting)
- **Category:** agents | **Impact:** Transformative
- **When to use:** Agent design, tool use, external actions needed
- **Quick tip:** Interleave Thought → Action → Observation → repeat
- **Keywords:** agent, tool, action, external, api, search, execute, interact, workflow

### Rank 4 — Self-Consistency
- **Category:** accuracy | **Impact:** Significant
- **When to use:** Accuracy critical, want to reduce variance
- **Quick tip:** Generate 5+ solutions, vote for most common answer
- **Keywords:** accuracy, reliable, verify, multiple, vote, ensemble, confidence, critical

### Rank 5 — Role/Persona Prompting
- **Category:** identity | **Impact:** Fundamental
- **When to use:** Need specialized expertise, specific tone, or character
- **Quick tip:** Define specific role with expertise, experience, and communication style
- **Keywords:** role, persona, expert, character, identity, act as, professional, specialist

### Rank 6 — Tree of Thoughts (ToT)
- **Category:** reasoning | **Impact:** Breakthrough
- **When to use:** Complex problems with multiple solution paths
- **Quick tip:** Generate multiple approaches, evaluate each, explore best branches
- **Keywords:** complex, explore, alternatives, branches, planning, puzzle, backtrack, multiple paths

### Rank 7 — Structured Output Prompting
- **Category:** format | **Impact:** Essential
- **When to use:** Need parseable output, API integration
- **Quick tip:** Use XML tags for Claude, JSON schema for OpenAI
- **Keywords:** json, xml, format, schema, parse, structured, api, extract, template

### Rank 8 — Generated Knowledge Prompting
- **Category:** knowledge | **Impact:** Significant
- **When to use:** Knowledge-intensive questions, reduce hallucination
- **Quick tip:** Ask model to generate relevant facts BEFORE answering
- **Keywords:** knowledge, facts, context, background, research, information, detailed, comprehensive

### Rank 9 — Self-Refine
- **Category:** quality | **Impact:** Major
- **When to use:** Want iterative quality improvement
- **Quick tip:** Generate → Critique → Refine → Repeat until satisfied
- **Keywords:** improve, refine, critique, iterate, draft, polish, edit, better, quality

### Rank 10 — Meta-Prompting
- **Category:** automation | **Impact:** Multiplicative
- **When to use:** Need to auto-generate or optimize prompts
- **Quick tip:** Use LLM to generate/optimize prompts for other tasks
- **Keywords:** generate prompt, optimize prompt, dspy, automatic, prompt engineering, improve prompt, create prompt

### Rank 11 — Context Engineering (2025+)
- **Category:** advanced | **Impact:** Paradigm Shift
- **When to use:** Building production systems, managing long conversations, optimizing costs
- **Quick tip:** Treat context as precious resource — load just-in-time, prune regularly
- **Keywords:** context, information flow, memory, loading, efficiency, token, optimize, management, tiered, lazy loading

### Rank 12 — DSPy Framework (2024+)
- **Category:** advanced | **Impact:** Revolutionary
- **When to use:** Production systems needing systematic optimization, large-scale prompt management
- **Quick tip:** Define signatures (what), let optimizer find prompts (how)
- **Keywords:** dspy, programming, signature, module, optimizer, compile, automatic, framework, stanford

### Rank 13 — Advanced Meta-Prompting / APE / OPRO (2024+)
- **Category:** advanced | **Impact:** Multiplicative
- **When to use:** Have evaluation data, want systematic prompt improvement
- **Quick tip:** Generate candidates → Evaluate → Use LLM to propose better ones → Repeat
- **Keywords:** ape, opro, evolution, breeding, self-optimization, automatic, improve, generate, candidates

### Rank 14 — Prompt Chaining (2023+)
- **Category:** workflow | **Impact:** Essential
- **When to use:** Complex multi-step tasks, need control over intermediate outputs
- **Quick tip:** Break complex task into steps, output of step N → input of step N+1
- **Keywords:** chain, pipeline, sequence, multi-step, workflow, break down, complex task

### Rank 15 — Graph of Thoughts (GoT) (2023+)
- **Category:** reasoning | **Impact:** Advanced
- **When to use:** Complex problems where insights need to be combined from multiple paths
- **Quick tip:** Model reasoning as graph — nodes (thoughts) + edges (connections), can merge paths
- **Keywords:** graph, network, non-linear, merge, combine, complex reasoning, interconnected

### Rank 16 — RAG Prompting (2023+)
- **Category:** knowledge | **Impact:** Critical
- **When to use:** Need current info, reduce hallucination, provide citations
- **Quick tip:** Retrieve relevant docs → Include in context → Generate grounded answer
- **Keywords:** rag, retrieval, knowledge base, documents, search, citations, grounded, vector

### Rank 17 — Reflexion (2023+)
- **Category:** agents | **Impact:** Major
- **When to use:** Agents that need to learn from failures across attempts
- **Quick tip:** On failure: Reflect on what went wrong → Store lesson → Retry with memory
- **Keywords:** reflection, learn, mistake, memory, agent, retry, improve, failure

### Rank 18 — Multimodal Prompting (2024+)
- **Category:** multimodal | **Impact:** High
- **When to use:** Tasks with visual input, document processing, image analysis
- **Quick tip:** Show image + give specific instructions about what to extract/analyze
- **Keywords:** image, vision, multimodal, picture, photo, screenshot, document, ocr, visual

### Rank 19 — Output Primers (2023+)
- **Category:** format | **Impact:** Moderate
- **When to use:** Need specific output format, JSON/code generation
- **Quick tip:** End prompt with the beginning of desired output: `Explanation:` or `{`
- **Keywords:** primer, start output, begin with, format, prefix

### Rank 20 — Chain of Draft / CoD (2025+)
- **Category:** reasoning | **Impact:** Major
- **Core benefit:** ~7.6% tokens of CoT while maintaining same accuracy
- **When to use:** Token-sensitive production, high-volume APIs, fast reasoning tasks
- **Quick tip:** Think step by step, but only keep a minimum draft for each thinking step, with 5 words at most. Return the answer after separator ####.
- **Keywords:** efficient, token, minimal, draft, short, fast, cost, reasoning, step by step, cod

### Rank 21 — RLM Framework Templates (2024+)
- **Category:** reasoning | **Impact:** High
- **Core benefit:** 10 templates combining AI reasoning with business frameworks
- **When to use:** Complex business analysis, strategic decisions with RLMs (Claude 3.5+, o1, o3, DeepSeek R1)
- **Quick tip:** Use `<reasoning>` + `<task>` tags with business frameworks for RLMs
- **Included:** MCTS + Porter's Five Forces, Decision Tree + SWOT, Beam Search + Kotter's 8-Step, *and 7 more*
- **Keywords:** rlm, reasoning model, mcts, beam search, swot, porter, business model, strategy, framework, blue ocean

### Rank 22 — Long Chain-of-Thought / Long CoT (2024+)
- **Category:** reasoning | **Impact:** High
- **Six principles:** Structured Reasoning, Depth-Efficiency Balance, Contextual Anchoring, Error Correction & Backtracking, Hybrid Prompting, Optimization
- **When to use:** Complex multi-step problems, critical decisions needing audit trail
- **Quick tip:** Use numbered steps, contextual anchoring, backtracking, and validation
- **Keywords:** long cot, extended reasoning, multi-step, backtracking, error correction, complex problem

### Rank 23 — Guided Learning / Constructivist Tutoring (2024+)
- **Category:** interaction/education | **Impact:** High
- **Source:** Gemini LearnLM (Google DeepMind)
- **Core principle:** Guide, don't tell — Facilitate learning through dialogue, not answers
- **Five principles:** Guide Don't Tell, Adapt to User, Progress Over Purity, Maintain Context, Spark Curiosity
- **Query types:** Convergent (step-by-step), Divergent (overview + entry points), Simple Recall (quick + invite), Other (flexible)
- **Keywords:** teach, tutor, guide, learn, coach, explain, education, socratic, constructivist, mentor

---

## 2025-2026 Techniques

### Rank 24 — Extended Thinking & Inference-Time Scaling (2025+) ⭐ Paradigm Shift
- **Category:** reasoning | **Impact:** Paradigm Shift
- **Core:** In thinking-capable models (Claude 3.7+, o1/o3, Gemini Flash Thinking), set a thinking **budget** and define **success criteria** — not reasoning steps
- **Budget Forcing:** Match compute to complexity. Simple→0, Medium→2-5k tokens, Hard→10-20k tokens
- **Debugging:** Read thinking traces to identify where logic drifted — then add constraints at that point
- **Modern note:** "Let's think step by step" is obsolete for thinking models — they do this natively
- **Keywords:** thinking, extended thinking, reasoning model, budget, inference time, o1, o3, claude thinking
- **Deep-Dive:** `./techniques/22-extended-thinking.yaml`

### Rank 25 — Adaptive Graph of Thoughts / AGoT (2025+)
- **Category:** reasoning | **Impact:** Advanced
- **Core:** Decompose into components, rate each as Simple/Medium/Complex, expand **only** Complex ones — avoids wasted compute from brute-force ToT
- **vs ToT:** ToT explores all branches equally (expensive). AGoT selects adaptively (efficient)
- **When to use:** Problems with uneven difficulty across sub-components
- **Keywords:** agot, adaptive, dag, dynamic decomposition, selective expansion, uneven complexity
- **Deep-Dive:** `./techniques/23-adaptive-graph-of-thoughts.yaml`

### Rank 26 — Context-Aware Decomposition / CAD (2025+)
- **Category:** reasoning | **Impact:** High
- **Core:** Break into 3-5 components BUT for each: (a) explain its role in the system, (b) solve in isolation, (c) note interactions with other parts — prevents tunnel vision
- **Key step:** Final Integration must resolve tensions explicitly
- **When to use:** Architecture design, business strategy, any system with cross-dependencies
- **Keywords:** decomposition, systems thinking, interdependencies, global context, integration, architecture
- **Deep-Dive:** `./techniques/24-context-aware-decomposition.yaml`

### Rank 27 — Recursive Self-Improvement Prompting / RSIP (2025+)
- **Category:** quality | **Impact:** Major
- **Core:** Multiple critique rounds, each targeting ONE dimension: logic → completeness → clarity → verify convergence before stop
- **vs Self-Refine:** Self-Refine (R9) = single cycle. RSIP = multiple cycles with convergence check
- **When to use:** Technical docs, analysis where quality on multiple dimensions matters simultaneously
- **Keywords:** rsip, recursive, multi-round, iterative critique, dimensions, convergence, metacognition
- **Deep-Dive:** `./techniques/25-recursive-self-improvement.yaml`

### Rank 28 — Agentic Operational Policy Design (2025+) ⭐ Production Standard
- **Category:** agents | **Impact:** Transformative
- **Core:** System prompt as governance document — 4 domains: **Scope** (what it handles), **Tool Selection** (when to use what), **Error Handling** (fail→retry or escalate), **Escalation Paths** (autonomous vs human)
- **Why:** Agents fail from unclear decision policies, not from lack of capability
- **When to use:** Any production agent with tool access or autonomous actions
- **Keywords:** agentic policy, escalation, tool selection, scope, error handling, governance, production agent
- **Deep-Dive:** `./techniques/26-agentic-operational-policy.yaml`

### Rank 29 — Skeleton of Thoughts + Plan and Solve (2023+, standardized 2025)
- **Category:** reasoning | **Impact:** High
- **SoT:** Outline (skeleton) → fill each section → coherence check. Best for long-form structured content
- **PS / PS+:** Plan (identify sub-goals) → Solve (execute each). PS+ adds variable extraction for math
- **When to use:** SoT=documents/reports. PS=math/algorithms/multi-step procedures
- **Keywords:** skeleton, outline, plan, solve, two-phase, structured generation, long form, ps+
- **Deep-Dive:** `./techniques/27-skeleton-plan-and-solve.yaml`

## Proven Combination Patterns

| Combination | Techniques | Use Case |
|---|---|---|
| High-Accuracy Reasoning | CoT + Self-Consistency | Critical decisions |
| Expert Assistant | Role + Few-Shot + Structured Output | Domain specialist |
| AI Agent | ReAct + Role + Structured Output | Autonomous tool agent |
| Learning Agent | ReAct + Reflexion + Prompt Chaining | Self-improving agent |
| Quality Writer | Role + Self-Refine + Few-Shot | High-quality content |
| Complex Problem Solver | GoT + CoT + Self-Consistency | Difficult multi-factor problems |
| Knowledge Assistant | RAG + Role + Structured Output | Citation-grounded answers |
| Production-Ready System | Context Engineering + Structured Output + DSPy | Scalable deployment |
| Token-Efficient Reasoning | Chain of Draft + Structured Output | Cost-effective reasoning |
| High-Volume Production | CoD + Context Engineering + Structured Output | Max token savings |
| Strategic Business Analysis | RLM Frameworks + Structured Output | Business analysis |
| Expert Tutor | Guided Learning + Role + Few-Shot | Teaching with expertise |
| **Deep Reasoning Pipeline** | **Extended Thinking + Self-Consistency** | **Hard problems, max accuracy** |
| **Adaptive Complex Solver** | **AGoT + Extended Thinking + CAD** | **Multi-dimension uneven problems** |
| **Production Agent System** | **Operational Policy + ReAct + Reflexion** | **Enterprise autonomous agent** |
| **Multi-Dimension Quality** | **RSIP + Skeleton of Thoughts** | **Long-form technical precision** |

---

## ATLAS 26 Principles (arXiv:2312.16171)

Core selection — apply these when constructing any production prompt:

1. **Specificity** — Be precise; avoid vague instructions
2. **Persona Assignment** — Define who the AI is before what it does
3. **Delimiters** — Use clear separators (XML tags, `---`, `###`) to separate sections
4. **Output Format** — Specify format explicitly; never assume
5. **Context Provision** — Give necessary background; AI has no implicit knowledge
6. **Constraint Framing** — State what NOT to do, not just what to do
7. **Few-Shot Demonstration** — Show before telling when format matters
8. **Step-by-step Instructions** — Break complex tasks into ordered steps
9. **Self-Evaluation Prompt** — Ask AI to review its own output
10. **Iterative Refinement** — Build in critique-and-improve loops
11. **Role Escalation** — Establish credibility before asking for expert output
12. **Tone Anchoring** — Define communication style explicitly
13. **Length Control** — Set expected output length; longer ≠ better
14. **Negative Examples** — Show what bad output looks like
15. **Chain-of-Thought Trigger** — "Think step by step" before complex answers
16. **Modality Alignment** — Match prompt structure to model's training
17. **Fallback Handling** — Define what to do when uncertain or insufficient data
18. **Task Decomposition** — Split compound prompts into atomic instructions
19. **Grounding** — Anchor claims to provided context, not memory
20. **Output Primers** — Begin the model's answer with a starter phrase
21. **Escape Hatch** — Allow graceful "I don't know" responses
22. **Verification Loop** — Ask model to double-check critical facts
23. **Temperature Guidance** — Signal desired creativity vs precision
24. **Safety Guardrails** — Include explicit refusal conditions
25. **Token Budget Awareness** — Trim instructions without losing precision
26. **Meta-Instructions** — Tell the model how to interpret the prompt itself

---

## Quick Technique Selector

**Task involves reasoning/math →** CoT → if complex: ToT / GoT / AGoT (R25) → if token-limited: CoD
**Task involves thinking models →** Extended Thinking (R24) — set budget + constraints, not steps
**Task involves format output →** Structured Output + Output Primers
**Task involves agents/tools →** ReAct + Operational Policy (R28) + Reflexion
**Task involves accuracy →** Self-Consistency + Chain of Verification
**Task involves content creation →** Role Prompting + Self-Refine + Few-Shot
**Task involves knowledge retrieval →** RAG + Generated Knowledge
**Task involves teaching →** Guided Learning + Role Prompting
**Task involves production scale →** Context Engineering + DSPy + CoD
**Task involves prompt optimization →** Meta-Prompting / APE / OPRO
**Task involves business analysis →** RLM Frameworks + GoT + Structured Output
**Task involves long-form structured doc →** Skeleton of Thoughts (R29) + RSIP (R27)
**Task involves system design →** CAD (R26) + AGoT (R25)
**Task involves multi-dimension quality →** RSIP (R27) + Self-Refine
**Task involves production agent →** Operational Policy (R28) + ReAct + Reflexion
