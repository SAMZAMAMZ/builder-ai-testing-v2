# Builder‑AI Mission Brief – OverheadManagerFinal.sol

## 0) Context & Authority
- **Contract role:** Operational overhead & maintenance coordinator for 1800‑Lottery. Receives the **remainder** of each draw’s funds from FinanceManager, accounts for spend categories, schedules maintenance windows, publishes performance/health signals, and integrates with monitoring.
- **Authority granted to Builder‑AI:**
  - Execute the **embedded checklist** in this folder and **generate any missing tests** to reach full coverage across objectives and security priorities.
  - **Repair brittle tests** when test logic (not contract logic) is at fault.
  - **Patch the contract** only to improve robustness, security, clarity, or gas‑efficiency **without** altering business rules (token, acceptance source, accounting invariants, maintenance semantics).
  - Append marketing/discovery metadata at EOF **after** all tests pass.

---

## 1) Non‑Negotiable Invariants
1. **Authorized Funding Only:** Overhead funds are accepted **only** from FinanceManager; any other sender reverts. Token is **immutable USDT** via SafeERC20.
2. **Exact Accounting:** For each draw, `overheadReceived[drawId]` is recorded once; global totals and per‑category ledgers must conserve value (no phantom gains/losses).
3. **Spend Discipline:** Outflows **cannot exceed** cumulative overhead received minus prior outflows; category budgets cannot go negative; attempts revert with clear reasons.
4. **Maintenance Controls:** Scheduling/activation of maintenance follows defined roles; while maintenance is active, protected functions that could affect system availability are gated.
5. **Data Integrity & Auditability:** Every money movement, maintenance change, budget allocation, and KPI update emits a precise event with identifiers and amounts; read‑only views reflect on‑chain state consistently.
6. **Emergency Safety:** Contract is Pausable; external state‑changing calls are nonReentrant; no delegatecall/upgrade backdoors; owner/role boundaries are minimal and specific.

---

## 2) Systems Under Test (SUT)
> Names are illustrative; map to actual symbols in code during test scaffolding.

- **Funding Path:** `receiveOverhead(drawId, amount)` — accepts remainder from FinanceManager, updates per‑draw & global accounting, emits `OverheadReceived`.
- **Budgeting & Allocation:** `allocateBudget(category, amount)`, `spend(category, payee, amount, memo)` — category balance checks, spend execution, events, conservation proofs.
- **Maintenance Lifecycle:** `scheduleMaintenance(start, end, reason)`, `activateMaintenance()`, `completeMaintenance()` — time‑window validation, gating of protected ops, event trail.
- **Performance & Health Telemetry:** `recordMetric(key, value)`, `setHealth(status, memo)` — bounded data sizes, protected access, event emission, retrieval views.
- **Views & Reports:** Totals by draw/category, current maintenance window, health status, last N spends, configuration constants.

---

## 3) Test Plan — Execute Embedded Checklist & Extend

### A) Execute Objective‑Based Modules (baseline)
- **Operational cost tracking & allocation** — ledgers, events, conservation, negative‑balance prevention. (≥5 tests)
- **Maintenance scheduling & execution** — window math, overlaps, gating, completion, forced cancel. (≥5 tests)
- **Performance monitoring & optimization** — metric writes, bounds, retrieval, gas limits. (≥5 tests)
- **Resource allocation & budgeting** — category caps, reallocation, multi‑category spend, partial fills. (≥5 tests)
- **System health & uptime mgmt** — status transitions, alerts/events, consumer views. (≥5 tests)

### B) Execute Security Modules (must pass 100%)
- **Maintenance authorization controls** — only authorized roles may schedule/activate/complete; no bypass during pause.
- **Cost data integrity** — double‑funding prevention per draw; no ledger drift across long sequences.
- **Performance data protection** — bounded payloads; reject malicious encodings; view‑only cannot mutate.
- **Budget manipulation prevention** — overflow/underflow, front‑running, reentrancy, replay on spend approvals.
- **System access during maintenance** — protected functions revert; allowed read paths unaffected.

### C) Add High‑Value Targeted Tests
1. **Conservation Invariants (Property‑Based):** For any sequence of (receive, allocate, spend), prove `totalInflows − totalOutflows == currentBalance` globally and per category; per‑draw amounts never change after set.
2. **Double‑Funding & Idempotency:** Re‑submit `receiveOverhead` for same `drawId` → revert; retry with same tx hash simulated (idempotent guard).
3. **Time‑Window Edge Cases:** Overlapping maintenance windows; activation before `start`; completion before `start`; completion after `end` grace; all revert paths verified.
4. **Event Completeness:** Emit & assert all fields (drawId, category, payee, amount, reason, timestamps). Build a mirror ledger from events and compare to storage.
5. **Integration Hooks:** Simulate FinanceManager sending remainder; verify totals match `netAmount − prize − gas`; confirm no effect if token is not USDT.
6. **Stress & Soak:** 200 draws with random allocations/spends & periodic maintenance → no drift, no OOG, views performant.

---

## 4) Metrics & Acceptance Targets
- **Security:** 100% pass on CRITICAL categories; no reentrancy/overflow/auth bypass.
- **Objective Compliance:** ≥95% pass across primary objectives.
- **Business Logic Accuracy:** 100% compliance with cost allocation, maintenance semantics, and health reporting.
- **Integration Reliability:** ≥95% success in end‑to‑end tests with FinanceManager.
- **Gas Profile:** Publish median/95p gas for receive/allocate/spend/maintenance ops; identify hotspots with suggested micro‑optimizations.

---

## 5) Patch & Improvement Policy
**Allowed:**
- Tighten `require` guards; clearer revert strings; CEI ordering before external calls.
- Gas optimizations: cache immutables, struct packing, minimize SLOADs, event topic rationalization.
- Event enrichment (additional fields) to improve audit trails.
- Safer accounting patterns (checked arithmetic with explicit bounds).

**Not Allowed (without sign‑off):**
- Changing token, widening authorized senders beyond FinanceManager.
- Introducing broad admin spending powers that bypass category/budget controls.
- Removing maintenance gating on protected functions.

---

## 6) Reporting Requirements
1. **Checklist coverage map** (objective & security categories) with pass/fail/flaky and reasons.
2. **Conservation proofs** (tables/plots) across stress sequences.
3. **Gas/perf table** for key functions; before/after for any patches.
4. **Security posture**: SECURE / NEEDS_REVIEW / VULNERABLE with evidence.
5. **Patch log**: precise diffs (tests/contracts), rationale, and impact.
6. **Go/No‑Go**: GREEN only when all CRITICAL security tests pass and conservation invariants hold in soak.

---

## 7) Builder‑AI Hints
- Use **event‑sourced mirroring** in tests to independently reconstruct balances; compare to storage after every op.
- Model time with a controllable clock; assert window math and gating invariants at boundaries (t==start−1, start, end, end+1).
- Mock FinanceManager & USDT for sender/token assertions; include a malicious token to exercise SafeERC20 wrappers.
- Include **fuzz tests** for category mix, spend order, and maintenance overlaps.

---

## 8) Alignment with 1800‑Lottery Goals
- Enables **transparent, auditable overhead management** without human intervention.
- Protects uptime via enforceable **maintenance windows** and health signaling.
- Provides strong **ledger integrity** and **objective‑driven testing** to satisfy autonomous, perpetual operation requirements.
