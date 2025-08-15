# Builder-AI Mission Brief – GasManagerFinalGelato.sol

## 0) Context & Authority
- **Contract role:** Gas treasury and automation hub. Receives **25 USDT per draw** from FinanceManager, maintains a reserve, and powers **Gelato pay‑as‑you‑go** operations to keep the lottery’s automated actions running without user gas.
- **Core mandate:** Optimize gas use, guarantee automated execution, and prevent outages from low relay balance—while remaining resistant to griefing and misuse.
- **Authority granted to Builder‑AI:**
  - Run **all tests** in the embedded checklist (187 total) and **extend coverage** for edge cases, concurrency, and failure recovery.
  - **Repair brittle tests** where the test is wrong; **patch contract** only to improve robustness, security, clarity, or gas—**without** changing business constants (25 USDT/draw, thresholds) or introducing admin backdoors.
  - Keep **marketing/discovery metadata** at the end of the file, **after** code is green.

---

## 1) Non‑Negotiable Invariants
1. **Exact Funding:** Only FinanceManager may deposit **exactly 25.000000 USDT (6 decimals)** per `drawId`. Duplicate funding for a draw is forbidden.
2. **Reserve Accounting:** `currentGasReserve` increases by 25 USDT on valid receipt and is source‑of‑truth for relay refills/payments.
3. **Gelato Safety:** Refills/payments can only interact with the **immutable** Gelato endpoint; approvals are **minimal and scoped**.
4. **Auto‑Refill Discipline:** Auto‑refill triggers **only** when Gelato balance is **below threshold** **and** reserve ≥ **auto‑refill amount**. No partial/over‑refill.
5. **Authorization:** Owner‑only for manual refill/payment/toggles; FinanceManager‑only for draw funding. No external callers can drain USDT.
6. **Reentrancy & Pause:** All external state‑changing functions are **nonReentrant** and **blocked when paused**.
7. **Auditability:** All movements (fund receipt, allocation, refill, payment) **emit events** with precise amounts and identifiers.
8. **Funds Conservation:** Sum of allocations, refills, and payments **never exceeds** the total USDT received minus emergency withdrawals explicitly logged.

---

## 2) Systems Under Test
- **Funding Path:** `receiveFundsFromFinanceManager(drawId, amount)` → updates mappings/counters/reserve and emits `GasFundsReceived`, `DrawGasAllocated`.
- **Reserve & Accounting:** `totalUSDTReceived`, `totalDrawsProcessed`, `drawFundsReceived[drawId]`, `drawGasAllocated[drawId]`, timestamps.
- **Gelato Integration:** `fundGelatoOperations(amount)`, `payGelatoOperation(amount, operationTag)`, `manualGelatoRefill()` and the internal `_checkAndRefillGelato()`.
- **Configuration & Controls:** `setAutoRefill(bool)`, pause/unpause, emergency withdrawal (owner‑only), immutable addresses/constants.
- **Views:** `hasReceivedFunds(drawId)`, `getDrawGasAllocation(drawId)`, `getGelatoBalance()`, plus any health/status getters.

---

## 3) Test Plan — What to Run, Then What to Add

### A) Execute the embedded modules (baseline)
- **Module 1 (45 tests):** FinanceManager integration — exact 25 USDT draw funding, duplicate prevention, sender checks, mapping and counter updates, events, throughput scenarios.
- **Module 2 (58 tests):** Gelato pay‑as‑you‑go — deposit/withdraw/payment flows, thresholding, auto‑refill enable/disable, reserve checks, event accuracy.
- **Security (34 tests):** Reentrancy, access control, SafeERC20, input validation, MEV/front‑running resistance, gas‑limit griefing.
- **Integration (32 tests):** Full system wiring with FinanceManager/Entry/Prize/Draw/Registry; end‑to‑end fund conservation and operational continuity.
- **Views (18 tests):** Accuracy, consistency, and gas profile of read paths.

> If a baseline test is incorrect or brittle, **fix the test** and document the reason. Only patch code when a genuine defect is exposed.

### B) Add high‑value targeted tests (Builder‑AI must author & run)

#### 1) Threshold & Auto‑Refill Discipline
- **Below threshold, sufficient reserve:** auto‑refill fires exactly once, refills **autoRefillAmount**, and updates `lastGelatoRefill`.
- **Below threshold, insufficient reserve:** no refill; emits diagnostic event; state unchanged.
- **Above threshold:** no refill even if reserve is large.
- **Rapid succession:** multiple funding events → no duplicate auto‑refills within the same block/condition window.

#### 2) Accounting & Conservation
- Long‑run sequence: process **100 draws** and multiple Gelato operations; prove:
  - `totalUSDTReceived == 25 USDT × drawsProcessed`  
  - `currentGasReserve` evolves exactly with receipts − deposits − payments  
  - No negative or overflow states under uint256 boundaries.

#### 3) Security & Abuse Resistance
- **Malicious caller** attempts to trigger refill/payment → revert with precise reason.
- **Malicious Gelato** mock returns unexpected values/behaviors → contract rejects state changes and preserves balances.
- **Reentrancy** via token callbacks on approval/transfer (use a mock USDT) → blocked.

#### 4) Performance & Gas
- Record gas for funding/refill/payment under typical conditions; assert under target ceilings (e.g., `receiveFunds` ≤ 150k; refill/payment minimal overhead).
- Measure auto‑refill loop cost and confirm absence of unbounded iteration.

#### 5) Integration Stress
- With EntryGate/EntryManager/FinanceManager active, run **soak tests** of 50 draws: ensure Gelato balance never falls below threshold for more than 1 block when auto‑refill enabled.

---

## 4) Metrics & Acceptance Targets
- **Security:** 100% pass on CRITICAL security tests; no reentrancy or unauthorized state changes.
- **Objective Compliance:** 100% of primary objectives verified (optimization, automation, Gelato, fee mgmt, queue/scheduling behaviors as implemented).
- **Reliability:** ≥95% success rate for integration tests; zero inconsistent accounting across 100‑draw soak.
- **Gas Targets:** Publish median/95p gas for funding, refill, and payment; identify/justify any hot spots.
- **Events:** 100% emission with correct params for all monetary operations.

---

## 5) Patch & Improvement Policy
**Allowed:**
- Strengthen `require` guards, revert reasons, and state‑before‑effect ordering.
- Scope USDT approvals to exact amounts; revoke/zero approvals when safe.
- Cache immutable addresses, pack storage, reduce redundant SLOADs, and minimize event topics if audit still satisfied.
- Improve auto‑refill hysteresis to prevent oscillation (e.g., small buffer) if logic remains equivalent.

**Not Allowed (without explicit sign‑off):**
- Changing **25 USDT per draw**, thresholds, or auto‑refill constants declared as fixed requirements.
- Introducing owner/admin paths that could drain or bypass allocation policy.
- Altering visibility/authority semantics for FinanceManager or widening external call surface.

---

## 6) Reporting Requirements
1. **Checklist coverage map**: pass/fail/flaky by test ID; reasons and fixes.
2. **Conservation proofs**: tabulation of reserve math across scenarios.
3. **Gas/perf table**: median/95p for key functions; trend across soak.
4. **Security posture**: SECURE / NEEDS_REVIEW / VULNERABLE with evidence.
5. **Patch log**: exact diffs (tests/contracts), rationale, risk analysis, outcomes.
6. **Operational readiness**: GREEN only when auto‑refill discipline, accounting, and integration stress all pass.

---

## 7) Builder‑AI Hints
- Prefer **CEI** (checks‑effects‑interactions) everywhere funds move; set state before external calls.
- Use **mock USDT** that can simulate non‑standard returns to validate SafeERC20 wrapping.
- Implement a **MockGelato** with configurable balances and error modes to exercise refill/payment paths.
- Add **property‑based tests** asserting “no unauthorized caller can reduce reserve” and “refill fires iff (below threshold ∧ reserve ≥ amount)”.

---

## 8) Alignment with 1800‑Lottery Goals
- Ensures **gasless, autonomous UX** and **high‑uptime automation**.
- Hardens the treasury and relay flows against **griefing** and **unexpected external behavior**.
- Produces auditable, deterministic accounting suitable for on‑chain verification and monitoring.

