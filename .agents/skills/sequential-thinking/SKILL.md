---
name: sequential-thinking
description: >
  Sử dụng skill này khi đối mặt với các vấn đề phức tạp cần suy luận đa bước, phân tích kiến trúc hoặc cân nhắc các đánh đổi (trade-offs) sâu sắc. Kích hoạt khi người dùng yêu cầu "mổ xẻ vấn đề", "lên phương án hệ thống", "đánh giá giải pháp" hoặc "kiểm tra logic". Tránh dùng cho các tác vụ đơn giản hoặc đã có quy trình rõ ràng (ưu tiên `executing-plans`). Nếu bài toán thuộc dạng truy tìm nguyên nhân lỗi, hãy ưu tiên `systematic-debugging`.
---

# Sequential Thinking

Work through problems step by step, with the ability to revise earlier steps, branch into alternatives, and synthesize a final answer. Every step is explicit and visible — thinking is the work, not a prelude to it.

---

## Core behavior

### Before the first step

Output this block exactly:

```
Goal: [what does a good final answer look like? Be specific about output type: decision, plan, diagnosis, analysis]
Task type: [design | debug | decision | analysis — if ambiguous, default to "analysis" and note mismatch in Open questions]
Abstract anchor: [Ask: "What is the more general form of this problem, and what does its answer tell me about the specific case?" Write 1–2 sentences. Calibrate to the task type: for debug → "What class of failure mode does this belong to?"; for design → "What general architectural pattern governs this?"; for decision → "What decision-theoretic principle applies?"; for analysis → "What category of system/behavior is being examined?"]
Estimated steps: ~[n — if > 8, split into two passes]
Missing info: [list unknowns, or "none"]
```

Rules for this block:
- **Goal** — be specific about the output type (decision, plan, diagnosis, analysis).
- **Task type** — determines Synthesis format AND calibrates the Abstract anchor. Must come before Abstract anchor.
- **Abstract anchor** *(Step-Back)* — calibrated to task type (see above). Every Step conclusion must be consistent with this anchor. If a conclusion contradicts it → flag `[uncertain]`.
- **Estimated steps** — rough count, adjust freely as you go. If estimate exceeds 8, consider splitting into two passes.
- **Missing info** — if something critical is unknown:
  - If a user is present → ask **one question** before proceeding. Wait for the answer.
  - If in an async/agent context with no user → assume the most critical unknown (mark `[assumption]`), list all remaining unknowns as `[assumption]` in Synthesis, and continue. If multiple unknowns are equally critical, assume the one with the widest downstream impact first.
  - If the missing info would make the entire chain invalid → mark `[blocked]`, write a Partial Synthesis (see below), and stop.

> **Step count guideline:** If the problem has ≤ 2 clearly bounded concerns, cap at 3 steps. If estimate exceeds 8 steps, the problem scope is too wide — split or narrow the goal.

### Each step

```
## Step [n] of ~[total]: [Short title]

**Scope:** [One sentence — what question does this step answer?]

[Reasoning — analyze, compare, or evaluate. Write only what is needed to
support the conclusion below. Stop when the conclusion is justified.]

**Conclusion:** [What this step establishes] [confidence label]
**Countercheck:** [Strongest objection to this conclusion] — [why it does not
invalidate the conclusion. If it does → mark [uncertain] on the Conclusion line,
correct the Conclusion in-place (same step, before writing Step [n+1]), and on
the next line immediately after the Countercheck write: "Revised: [new conclusion]"]
```

> **Countercheck in-place correction — format example:**
> ```
> **Conclusion:** Option A is faster. [uncertain]
> **Countercheck:** Benchmark data shows Option B is faster under load — this invalidates the conclusion.
> Revised: Option B is faster under production load. [verified — Step 2 benchmark]
> ```

> **Countercheck in-place vs Revision mechanic:** Countercheck in-place correction = fix a conclusion *within the step you are currently writing*, before moving on. The Revision mechanic = use when a *later* step discovers that an *earlier already-written* step was wrong — that creates a new numbered step with `— REVISES Step [x]`. These are two different situations; do not conflate them.

Rules per step:
- The `**Scope:**` line is mandatory. It enforces one concern per step.
- Reasoning must link directly back to the goal defined before Step 1. If a step cannot justify its relevance to the goal, cut it.
- Never fake confidence. If uncertain, label it `[assumption]`.
- Branch A / Branch B do **not** each consume a separate step number. Only the **Converge** step advances the counter.
- Revisions do not get a separate step number — they carry the next natural number and mark `— REVISES Step [x]` in the title.
- **No steps after Synthesis.** Once the Synthesis block is written, the chain is closed.
- **Step validity check:** Before writing each step's reasoning, ask: *"If this step were removed, would the Synthesis change?"* If the answer is no — cut the step. Steps that only restate prior conclusions or pad context without advancing the chain are forbidden.

### Synthesis

Choose the format that matches the task type identified before Step 1.

> **Ordering rule:** Write a draft Synthesis first, then run the Verification pass. Only close (finalize) after the Verification pass completes without triggering a revision.

**Design / Plan:**
```
## Synthesis [Design]

**Architecture / Solution:**
[Write this fully — no placeholders or ellipses]

**Key decisions made:**
- ...

**Open questions / assumptions:**
- ...

**Next steps** (dependency-ordered — each item unblocks the next):
1. ...
2. ...
```

**Debug:**
```
## Synthesis [Debug]

**Root cause:** [Why the problem occurs] [confidence label — e.g. [verified — Step 3] or [assumption]]

**Fix:** [confidence inherits from Root cause — if Root cause is [assumption], this Fix is also [assumption] and must be verified before applying]
[Minimal, targeted change to resolve it]

**Prevention:**
[How to prevent recurrence]

**Open questions / assumptions:**
- ...
```

**Decision:**
```
## Synthesis [Decision]

**Chosen option:** [Name]
**Rationale:** [Why this over the alternatives]

**Reversibility:** [If the key assumption is wrong, what is the cost to reverse this decision? Low / Medium / High — with one sentence of justification]

**Rejected options:**
- [Option A] — [reason rejected]
- [Option B] — [reason rejected]

**Open questions / assumptions:**
- ...
```

**Analysis:**
```
## Synthesis [Analysis]

**Findings** (ranked by impact):
1. [Finding] — [severity / impact]
2. ...

**Root patterns:**
- ...

**Recommended actions:**
- ...

**Open questions / assumptions:**
- ...

**Next steps** (dependency-ordered — each item unblocks the next):
1. ...
2. ...
```

**Verification pass (mandatory — write draft Synthesis first, then run this, then finalize):**
```
## Verification pass

Q1: Nội dung Synthesis có nhất quán và được suy diễn logic từ luồng lập luận phía trên không?
      Nêu rõ (các) bước xác lập cho từng khẳng định chính.
A1: [Bước N → khẳng định X | Bước M → khẳng định Y]
    / [Phát hiện hổng logic → điều chỉnh Synthesis trước khi hoàn tất]

Q2: Luận điểm phản biện sắc bén nhất đối với Synthesis này là gì?
      Liệu nó có đủ sức làm thay đổi kết luận cuối cùng không?
A2: [Nêu rõ ý kiến phản biện. Nếu làm thay đổi kết quả → sửa lại Synthesis.
    Nếu không → giải thích ngắn gọn lý do tại sao.]

Q3: Các giả định [assumption] và điểm còn nghi vấn [uncertain] đã được nêu rõ trong phần Câu hỏi mở chưa?
A3: [Liệt kê các giả định hoặc điểm chưa chắc chắn chưa được chuyển vào Open questions.
    Nếu đã đầy đủ → viết "Tất cả các giả định và điểm chưa rõ đã được minh bạch hóa."]

Q4: Kết luận cuối cùng có bám sát mỏ neo tư duy (Abstract anchor) đã xác lập ban đầu không?
A4: [Nhắc lại mỏ neo tư duy trong một câu. Xác nhận Synthesis tuân thủ định hướng đó, hoặc điều chỉnh nếu phát hiện dấu hiệu "lệch pha".]
```
Only close the chain after all four questions are answered without triggering a revision.

**Partial Synthesis (chain interrupted by `[blocked]`):**
```
## Synthesis [Partial — Blocked]

**Blocked on:** [Specific information or decision required to continue]

**Progress so far:**
- Step 1: [conclusion]
- Step 2: [conclusion]
- Step [n]: BLOCKED — [what is unknown]

**To resume:**
1. Resolve: [exact question to answer]
2. Return from Step [n]
```

---

## Special mechanics

### Revision

When a later step contradicts, significantly changes, or *refines by new information* an earlier conclusion (e.g., the earlier conclusion was not wrong but is now incomplete given what a later step discovered):

```
## Step [n] of ~[total]: [Title] — REVISES Step [x]

**Scope:** [What question this revision answers]

Prior conclusion in step [x] was: "..."
This is now incorrect / incomplete because: [reason]

**Conclusion:** [Updated conclusion] [confidence label]
**Countercheck:** [Is this revision itself correct, or is it an overreaction to a weak signal?] — [justify why the revision is warranted]
```

Continue from the updated state. Do not delete the original step — the REVISES annotation is the audit trail.

**Revision limit:** If the same step is revised more than twice, the problem is under-constrained. Stop, write a Partial Synthesis, mark the ambiguity as `[blocked]`, and do not proceed.

**Revisions inside branches:** Reference the branch explicitly in the title: `— REVISES Step [n] Branch A`. The two-revision limit applies per branch label independently, not per step number.

### Branching

When two or more approaches diverge meaningfully on trade-offs, risk, or architecture:

```
## Step [n] of ~[total]: [Title of the choice being made]

**Scope:** [Why branching is needed — what cannot be decided without exploration]

[1–2 sentences framing the decision space and why both paths are viable]

> ⚠️ Branch framing step: this step intentionally has NO Conclusion and NO Countercheck.
> The conclusion is deferred to the Converge step (Step [n+1]). Writing a Conclusion here
> defeats the purpose of the branch — if you already know the answer, skip branching entirely.

## Step [n] — Branch A: [Label]
[Reasoning for this path]
**Conclusion:** ... [confidence label]
**Countercheck:** [Strongest objection to Branch A's conclusion] — [why it does or does not invalidate it]

## Step [n] — Branch B: [Label]
[Reasoning for this path]
**Conclusion:** ... [confidence label]
**Countercheck:** [Strongest objection to Branch B's conclusion] — [why it does or does not invalidate it]

## Step [n+1] of ~[total]: Converge

**Scope:** [Which path wins and why — resolving the trade-off raised in Step [n]]

[Compare Branch A and B directly on the axis that matters most to the goal]

**Conclusion:** [Chosen path: A / B / hybrid] because [reason] [confidence label]
**Countercheck:** [Could the rejected path actually be better given a different assumption?] — [address explicitly]
```

**Branch only when paths diverge on a meaningful axis** — architecture, trade-offs, risk profile, or resource constraints.

Do NOT branch on:
- Implementation details (variable naming, file structure, minor style)
- Matters decidable without trade-off analysis

**All branches MUST converge.** An open branch is a reasoning error.

### Confidence labels

Use inline when a conclusion is not fully certain:

- `[assumption]` — reasonable guess, needs confirmation
- `[uncertain]` — multiple valid interpretations exist
- `[verified — Step N]` or `[verified — stated in requirements]` — follows directly from a named prior step or stated fact; always cite the source
- `[blocked]` — cannot proceed without external input; triggers Partial Synthesis

---

## Output example

```
Goal: Design an auth system for a multi-device web app — output is an architecture plan
Task type: design
Abstract anchor: The general form is "stateful identity management across multiple clients." This tells us revocation semantics must be first-class — not an afterthought bolted onto a stateless scheme.
Estimated steps: ~5
Missing info: Mobile app requirements not mentioned — assuming web-only [assumption]. All other constraints stated explicitly.

## Step 1 of ~5: Clarify requirements

**Scope:** What are the constraints that will drive architectural choices?

Users need email/password and OAuth (Google). Sessions must persist across
devices. No SSO requirement. Admin users have elevated permissions. No mention
of mobile apps — assumed web-only. [assumption]

**Conclusion:** Two login methods, persistent multi-device sessions, role-based
access (admin vs regular). Web-only scope. [assumption on mobile]
**Countercheck:** The system might need mobile support later — this constraint
shapes the entire token strategy. Acknowledged, but no evidence of mobile
requirement exists; flagged in Open questions rather than blocking design now.

## Step 2 of ~5: Identify session strategy

**Scope:** Which session mechanism best fits the multi-device logout requirement?

The core constraint is logout-everywhere across devices. Two approaches diverge
meaningfully on infra complexity vs. revocation control — branching warranted.

## Step 2 — Branch A: JWT (stateless)
Tokens stored client-side (httpOnly cookie). No server session store.
Revocation requires a denylist — which recreates a session store anyway.
**Conclusion:** Simple to scale, but revocation overhead negates the benefit. [verified — Step 1]
**Countercheck:** Short-lived JWTs (< 5 min) with refresh tokens avoid the denylist
problem — but then revocation still requires tracking refresh tokens server-side,
which is equivalent to a session store. The argument collapses under scrutiny.

## Step 2 — Branch B: Server sessions
Session stored in Redis. Revocation is a single key delete.
Requires Redis infra but provides strong logout-everywhere control.
**Conclusion:** Stronger revocation, minimal added complexity for this use case. [verified — Step 1]
**Countercheck:** Redis adds an infra dependency — if Redis is unavailable, all
sessions fail. Acceptable: Redis is standard infra with well-understood HA/sentinel
patterns; this is not a novel risk.

## Step 3 of ~5: Converge on session strategy

**Scope:** Which approach is correct given the logout-everywhere constraint established in Step 1?

JWT denylist recreates a session store — net zero benefit over server sessions.
Server sessions with Redis are simpler to reason about and easier to audit.

**Conclusion:** Chosen: Server sessions with Redis. [verified — Step 2 Branch B]
**Countercheck:** If the team has zero Redis experience, the operational risk might
outweigh the theoretical simplicity — but this is a staffing question, not an
architecture question; document as a risk, not a blocker.

## Step 4 of ~5: OAuth data model — REVISES Step 1

**Scope:** Does OAuth require changes to the data model assumed in Step 1?

Prior conclusion in step 1 was: "Two login methods — email/password and Google OAuth."
This is now incomplete because: OAuth users need a linked-accounts model.
A user who registers via Google must have a separate identity record, not just
a flag on the users table — otherwise linking a second provider later is
structurally impossible.

**Conclusion:** Introduce a `user_identities` table (provider, provider_id,
user_id FK). Core `users` table remains provider-agnostic. [verified — stated in requirements]
**Countercheck:** Is a separate table warranted now, or is this premature generalization
for a two-provider system? Warranted: the constraint is structural — a users-table
flag cannot accommodate a third provider without a schema migration. Better to pay
the cost once now than twice later.

## Step 5 of ~5: Security hardening

**Scope:** What security controls are needed before this system is production-safe?

- Rotate session token on login (prevents session fixation).
- httpOnly + Secure + SameSite=Lax on session cookie.
- Rate-limit /auth/login: 10 req/min per IP (reverse proxy level).
- `authenticate` middleware (session check) and `authorize` middleware (role
  check) are separate concerns — never combine them.
- Redis session TTL: 30 days with sliding expiry. [assumption — confirm with product]

**Conclusion:** Security baseline is sufficient for a standard web app at this scale. [verified — Steps 1–4]
**Countercheck:** CSRF is not mentioned — SameSite=Lax covers most CSRF vectors
for same-site forms, but cross-origin POST from third-party embeds still needs
a CSRF token. Add CSRF token middleware to the hardening list.

## Verification pass

Q1: Nội dung Synthesis có nhất quán và được suy diễn logic từ luồng lập luận phía trên không?
      Nêu rõ các bước xác lập cho từng khẳng định chính.
A1: Server sessions → Bước 3. Bảng `user_identities` → Bước 4. Tách biệt middleware và Redis TTL → Bước 5. Lập luận chặt chẽ, không có khoảng trống logic.

Q2: Luận điểm phản biện sắc bén nhất đối với Synthesis này là gì?
      Liệu nó có đủ sức làm thay đổi kết luận cuối cùng không?
A2: Một phương án tiềm năng là dùng JWT với token ngắn hạn kết hợp refresh token store. Tuy nhiên, phân tích tại Bước 2 Nhánh A đã chứng minh cách này vô hình trung tái lập logic của session-store, nên không mang lại lợi ích thực tế so với Server sessions. Kết luận không đổi.

Q3: Các giả định [assumption] và điểm còn nghi vấn [uncertain] đã được nêu rõ trong phần Câu hỏi mở chưa?
A3: Các yếu tố như phạm vi web-only (B1), mô hình liên kết tài khoản (B4), và cấu hình Redis (B5) đều đã được minh bạch hóa hoàn toàn.

Q4: Kết luận cuối cùng có bám sát mỏ neo tư duy (Abstract anchor) đã xác lập ban đầu không?
A4: Nhất quán. Lựa chọn Server sessions với Redis đáp ứng hoàn hảo mỏ neo tư duy về việc coi "cơ chế thu hồi session là ưu tiên hàng đầu".

## Synthesis [Design]

**Architecture / Solution:**
Session-based auth with Redis. OAuth via a `user_identities` table to support
linked accounts and future providers without schema changes. Passport.js for
strategy management (local + Google). Middleware is split: `authenticate`
(session present and valid) + `authorize` (role satisfies route requirement).
These are registered as separate middleware — not a single combined guard.
CSRF token middleware required for cross-origin POST protection.

**Key decisions made:**
- Server sessions over JWT — logout-everywhere control with no added complexity
- `user_identities` table — provider-agnostic user model, extensible
- Authorization separated from authentication — avoids fat guards

**Open questions / assumptions:**
- Web-only assumed — if mobile is added, JWT re-evaluation required [assumption]
- Redis persistence strategy (AOF vs RDB) not decided [assumption]
- Account linking UX (one Google account per user, or many?) unspecified [uncertain]
- Redis operational experience of the team — if low, add HA/sentinel runbook [assumption]

**Next steps** (dependency-ordered — each item unblocks the next):
1. Confirm Redis persistence strategy with infra team — blocks deployment design
2. Define account-linking rules in product spec — blocks `user_identities` schema finalization
3. Scaffold `user_identities` migration and Passport local + Google strategies
4. Implement `authenticate` and `authorize` middleware with CSRF token support
5. Implement rate-limiting at nginx/Cloudflare — not in app code
```

---

## Short example — Decision

```
Goal: Choose a deployment strategy for a Cloudflare Workers API
Task type: decision
Abstract anchor: The general form is "runtime environment selection under resource constraints." The decision-theoretic principle is: eliminate dominated options first (constraints), then evaluate remaining candidates on the axis that matters most to the stated goal.
Estimated steps: ~3
Missing info: Portability requirement not stated — assuming none [assumption]

## Step 1 of ~3: Map hard constraints

**Scope:** What constraints eliminate candidates before trade-off analysis?

Zero DevOps budget. All handlers < 50ms. No long-running processes. Edge latency
matters. No explicit portability requirement stated. [assumption]

**Conclusion:** Container/VM options require ops overhead — eliminated. Edge
runtimes are viable candidates. [verified — stated in requirements]
**Countercheck:** "Zero DevOps budget" might mean "minimal ops" rather than
"literally zero" — if so, lightweight container PaaS (Railway, Render) could
re-enter. No counter-evidence exists; assumption stands but is flagged.

## Step 2 of ~3: Evaluate remaining candidates

**Scope:** Which edge runtime best fits the constraints established in Step 1?

Cloudflare Workers: free baseline, zero cold starts, D1/KV co-location, broad
runtime support. Vercel Edge: React-biased, less runtime control. AWS Lambda@Edge:
ops complexity, unpredictable pricing.

**Conclusion:** Cloudflare Workers dominates on cost, latency, and ops simplicity. [verified — Step 1]
**Countercheck:** Vercel Edge functions now support non-React projects — but runtime
control (lack of TCP sockets, limited CPU) is still more constrained than Workers.
Does not change conclusion.

## Step 3 of ~3: Risk check

**Scope:** What could make this choice wrong later?

Vendor lock-in via D1/KV is real — migration cost if portability requirement emerges.
128MB memory cap and no native Node.js APIs must be verified against current codebase.

**Conclusion:** Acceptable trade-off given constraints; runtime compatibility must be confirmed. [assumption]
**Countercheck:** If the codebase uses Node.js-specific APIs (fs, child_process, etc.),
the 128MB / no-Node cap is a hard blocker, not a risk — verify before committing.
Added to Open questions.

## Verification pass

Q1: Nội dung Synthesis có nhất quán và được suy diễn logic từ luồng lập luận phía trên không?
      Nêu rõ các bước xác lập cho từng khẳng định chính.
A1: Cloudflare Workers được chọn dựa trên ưu thế tuyệt đối từ các ràng buộc ở Bước 1. Rủi ro lock-in và tính tương thích đã được thẩm định tại Bước 3. Luồng tư duy mạch lạc.

Q2: Luận điểm phản biện sắc bén nhất đối với Synthesis này là gì?
      Liệu nó có đủ sức làm thay đổi kết luận cuối cùng không?
A2: Rào cản lớn nhất là sự lệ thuộc vào Node.js API (nếu có). Đây là một rủi ro mang tính điều kiện — nó không đảo ngược Synthesis ngay lập tức, nhưng cần được kiểm tra khắt khe (pre-flight check) trước khi triển khai.

Q3: Các giả định [assumption] và điểm còn nghi vấn [uncertain] đã được nêu rõ trong phần Câu hỏi mở chưa?
A3: Đã liệt kê đầy đủ các giả định về tính di động và khả năng tương thích của runtime. Không còn điểm nghi vấn nào bị bỏ sót.

Q4: Kết luận cuối cùng có bám sát mỏ neo tư duy (Abstract anchor) đã xác lập ban đầu không?
A4: Nhất quán với nguyên tắc: "loại bỏ các lựa chọn yếu trước khi so sánh các ứng viên mạnh trên trục giá trị chính".

## Synthesis [Decision]

**Chosen option:** Cloudflare Workers
**Rationale:** Zero ops overhead, free tier, edge latency, and D1/KV co-location
eliminate all other options given the stated constraints.

**Reversibility:** Medium — D1/KV data must be migrated and Workers-specific API
patterns (fetch handler, env bindings) must be refactored if a runtime switch is
needed later. Estimated 2–4 engineering weeks depending on data volume.

**Rejected options:**
- Vercel Edge — React-ecosystem bias, less granular runtime control
- AWS Lambda@Edge — ops complexity, cost unpredictability
- Container/PaaS — eliminated by ops-budget constraint (Step 1)

**Open questions / assumptions:**
- No portability requirement assumed — if it emerges, migration cost is Medium [assumption]
- Runtime compatibility (memory cap, Node APIs) not yet verified — must confirm before commit [assumption]
```

---

## Do not

- Omit the `**Scope:**` line — it is the only thing preventing step drift
- Omit the `**Countercheck:**` line on any step, branch, or revision — it is the only per-step guard against confirmation bias
- Write a dismissive or generic Countercheck (e.g. *"One could argue X — but X doesn't apply here"*) — name the strongest specific objection and engage it directly, or it does not count
- Close any Synthesis without completing the Verification pass
- Finalize (close) a Synthesis before running the Verification pass — write draft first, verify, then finalize
- Skip the Abstract anchor — problem framing errors propagate through every downstream step
- Write the Abstract anchor before the Task type — the anchor must be calibrated to the task type
- Quote the Abstract anchor verbatim at each step as a compliance ritual — use it as a live constraint (if the conclusion contradicts it, flag it; otherwise let it work silently)
- Use `[verified]` without citing the source — always write `[verified — Step N]` or `[verified — stated in requirements]`
- Silently change a prior conclusion — always mark it with `— REVISES Step [x]`
- Use the Revision mechanic (new numbered step) to fix a conclusion within the step you are still writing — that is a Countercheck in-place correction, not a Revision
- Leave a branch without a Converge step
- Omit `**Countercheck:**` from Branch A/B sub-steps — branches are exactly where commitment is highest and scrutiny must be strongest
- Write anything after the Synthesis block
- Revise the same step more than twice without stopping to surface the ambiguity
- Write a `**Conclusion:**` or `**Countercheck:**` in a branch framing step — the framing step has no conclusion by design; the conclusion belongs in the Converge step
- Surface `[assumption]` labels in Open questions but omit `[uncertain]` labels — both must be surfaced
- Skip Q4 of the Verification pass — Synthesis can drift from the Abstract anchor during summarization; Q4 is the only guard
