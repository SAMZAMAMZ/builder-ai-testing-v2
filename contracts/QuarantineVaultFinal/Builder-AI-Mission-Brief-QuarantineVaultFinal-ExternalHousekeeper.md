# Builder‑AI Mission Brief – QuarantineVaultFinal‑ExternalHousekeeper.sol

## 0) Context & Authority
- **Contract role:** Security quarantine for **all non‑USDT assets** touching the 1800‑Lottery system. Receives/holds suspect tokens, coordinates *external housekeeper* triggers for hoovering/sweeping, stores & classifies assets, and manages **burn/withdraw** actions under strict policy.
- **Architecture target:** **3‑Module Token Hoover System** → (1) Hoover, (2) Store & Sort, (3) Burn/Withdraw — with audit‑grade events, pause/recovery, and health telemetry.
- **Authority granted to Builder‑AI:**
  - Execute the **embedded checklist** and **add tests** to fully cover objectives, security, edges, and performance.
  - **Repair brittle tests** when test logic is at fault; **patch contract** to improve security/robustness/gas **without** violating objectives (immutable USDT rules; quarantine policy; access control; autonomy).
  - Keep any marketing/discovery metadata **at EOF** after code is green.

---

## 1) Non‑Negotiable Invariants
1. **Only non‑USDT tokens** can be quarantined/managed; USDT must never be affected by this contract.
2. **Authorized flows only:** Hoover/trigger functions callable **only by allowlisted “housekeeper” agents** (EOA/bot/Defender task) or system modules per registry; all others revert.
3. **No drains/no leaks:** The sum of quarantined token balances equals prior balance + validated inflows − validated outflows; no phantom deltas across sequences.
4. **Reentrancy & Pause:** All external state‑changers are **nonReentrant**; circuit breaker **pause** gates hoover & management ops.
5. **Event completeness:** Every hoover, classification write, burn, withdraw emits events with `{token, amount, from, to, reason, txRef}` to reconstruct state off‑chain.
6. **Burn/Withdraw policy:** Only via approved flows:
   - **Burn:** send to dead address or token’s `burn` interface where supported.
   - **Withdraw:** send to **designated sink** (e.g., OverheadManager or compliance wallet);
   - Never to arbitrary callers; enforce role/registry checks and optional timelock if configured.
7. **Safety with weird tokens:** Must gracefully handle fee‑on‑transfer, deflationary/rebasing tokens, and revert‑on‑transfer behaviors without state desync.
8. **Registry truth:** System addresses (Entry/Finance/Prize/Draw/Gas/Overhead) are resolved via Registry; hoover must not target unknown or unpermitted contracts.

---

## 2) Systems Under Test (map names to the concrete symbols in code)
### Module 1 — **Hoover Engine**
- **Discovery:** enumerate target contracts via Registry; list non‑USDT ERC‑20 balances > threshold.
- **Extraction:** pull non‑USDT balances into Quarantine (via sweep hooks/allowances/owned sweepers).
- **Triggers:** external housekeeper entrypoints (allowlisted); anti‑spam/rate‑limit; signature‑optional (EIP‑712) validator.
- **Job control:** progress tracking, batching, idempotency, and failure retry.

### Module 2 — **Store & Sort**
- **Inventory:** per‑token ledger (quantities, firstSeen, lastAction, flags).
- **Classification:** token standard & risk scoring (ERC20/721/1155/unknown; malicious flags).
- **Queries:** inventory summaries, token detail, category views.

### Module 3 — **Burn/Withdraw Management**
- **Burn:** supported when token exposes burn; else **dead‑send** pattern.
- **Withdraw:** policy‑driven sink(s) only (e.g., OverheadManager); optional timelock/2‑step confirm.
- **Accounting:** conservation proofs and exhaustively logged events.

### Security/Health Layer
- **Guards:** Reentrancy, Pause, access roles, CEI ordering.
- **Telemetry:** health check status, last hoover/burn/withdraw timestamps, error counters.

---

## 3) Test Plan — Run the Embedded Suite then Extend

### A) Baseline: execute all embedded modules
- **Module 1 (Hoover):** triggers, discovery, token enumeration, extraction, batching, audit events.
- **Module 2 (Store & Sort):** secure storage, classification, sorting, reporting.
- **Module 3 (Burn/Withdraw):** authorization, limits, failure handling, audit trail.
- **Security & Performance:** reentrancy, pause, anti‑MEV, health monitoring, gas profiling.

> If a baseline test is incorrect or brittle, **fix the test** and document why; only patch code for genuine defects.

### B) High‑Value Additional Tests (Builder‑AI must author & run)

#### 1) **Weird/Malicious Token Behaviors**
- Fee‑on‑transfer token: hoover N units → vault receives `< N`; assert conservation with event delta; no state drift.
- Deflationary/rebasing token: repeated inventory checks show consistent internal math.
- Token that reverts on `transfer` for specific amounts; ensure partial job rollback & retry without duplication.

#### 2) **Discovery/Trigger Safety**
- Unauthorized trigger caller → revert with reason; rate‑limit enforced under high‑frequency calls.
- Registry returns an unrecognized contract → discovery aborts safely; nothing swept.
- Signed trigger payload (if implemented EIP‑712) validates signer against allowlist; tampered signature rejected.

#### 3) **Conservation & Ledger Proofs (Property‑Based)**
- For random sequences of hoover/classify/burn/withdraw, assert:
  - Event‑sourced mirror balance == on‑chain inventory per token.
  - Global token count deltas reconcile across modules.

#### 4) **Management Policy Enforcement**
- Burn allowed only for tokens marked “burnable” or via dead‑send policy; otherwise revert.
- Withdraw only to approved sink(s); attempt to arbitrary address → revert.
- Optional timelock test: schedule → execute after delay; early execution reverts.

#### 5) **Stress & Soak**
- 200+ tokens across 6 categories; random hoover batches; ensure no OOG, no unbounded loops, and views remain performant.

---

## 4) Metrics & Acceptance Targets
- **Security:** 100% pass on CRITICAL tests (guards, auth, conservation, pause).
- **Objectives:** ≥95% pass across objective categories (detection/isolation, fund mgmt/recovery, risk, compliance, incident response).
- **Business Logic:** 100% compliance with Store & Sort and Burn/Withdraw semantics.
- **Performance:** Publish median/95p gas for hoover, classify, burn, withdraw; identify hotspots and safe micro‑opts.
- **Events:** 100% emission for state‑changing ops with complete parameters.

---

## 5) Patch & Improvement Policy
**Allowed:**
- Stronger `require` guards; richer revert reasons; CEI ordering; explicit overflow bounds.
- Scoped approvals, immediate approval‑zeroing; caching immutables; struct packing; reduced SLOADs.
- Event enrichment (IDs/refs) to improve auditability.
- Optional EIP‑712 signed trigger validation & hysteresis on rate‑limits.

**Not Allowed (without sign‑off):**
- Touching USDT balances; widening authority beyond allowlisted agents/registry roles.
- Adding owner/admin “escape hatches” that bypass quarantine policy.
- Any logic that could interfere with the core draw/prize/entry flows.

---

## 6) Reporting Requirements
1. **Checklist coverage map** (by module & security) with pass/fail/flaky + reasons.
2. **Conservation proofs**: per‑token tables across randomized sequences.
3. **Gas/perf table**: median/95p for hoover/classify/burn/withdraw.
4. **Security posture**: SECURE / NEEDS_REVIEW / VULNERABLE with evidence.
5. **Patch/change log**: precise diffs (tests/contracts), rationale, impact.
6. **Go/No‑Go**: GREEN only when CRITICAL security + conservation invariants pass.

---

## 7) Builder‑AI Hints
- Use a **MockRegistry** to drive discovery lists; include bad/unknown addresses.
- Implement **mock tokens**: standard, fee‑on‑transfer, deflationary/rebasing, revert‑on‑transfer.
- Build an **event‑sourced mirror** of balances in tests; compare after every op.
- Use **bounded batches** and **idempotent job IDs** to prevent double processing.

---

## 8) Alignment with 1800‑Lottery Goals
- Provides a **self‑healing perimeter** for foreign assets while keeping USDT flows untouchable.
- Delivers **audit‑grade** transparency and autonomous security operations.
- Ensures long‑run, human‑free operation via safe triggers, robust guards, and comprehensive tests.
