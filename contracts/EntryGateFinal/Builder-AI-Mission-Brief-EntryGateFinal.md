# Builder‑AI Mission Brief — EntryGateFinal.sol (HV Entries • Affiliate Security • Batch Correctness • Token Eligibility)

## 0) Context & Authority
- **Contract role:** player onboarding + entry validation + fee handling + batch transmission to EntryManager (Tier‑2 flow).
- **Reference testbed:** Railway‑AI‑Lighthouse enhanced pipeline (use it as the primary harness).
- **Authority granted:**  
  - Run **all** tests in the suite, cross‑check every checklist item, and **add tests** where coverage is thin.  
  - **Repair failing tests** when they’re incorrect or brittle.  
  - **Patch the contract** if changes clearly improve robustness/security/clarity/gas and **do not change business logic** (entry fee, affiliate fee, batch size, net transfer policy) or violate instant affiliate payout objectives.  
  - Append marketing/discovery metadata **below the code** after functional work is green.

## 1) Non‑Negotiable Invariants (tie every test to these)
1. **Throughput:** must reliably process large, concurrent bursts without state corruption or dropped events. Target: ≥100 entries/min sustained; no race conditions.  
2. **Affiliate payout security:** affiliate fee must be paid **exactly once per valid entry**, with **no reentrancy** and no path to over‑/under‑payment.  
3. **Batch correctness:** exactly **TIER_2_MAX_PLAYERS** entries close a batch; **netAmount** = sum(entry fees) − sum(affiliate fees); **netAmount** is **transferred to EntryManager** and **the same value** is passed to `receiveRegistryBatch`. The registry array must contain **exactly the batch’s players** with correct player numbers and affiliate amounts.  
4. **Token eligibility:** only **immutable POLYGON_USDT** is accepted; no native MATIC or alternate ERC‑20 paths; payments use **SafeERC20**; attempts to fund with any other token never satisfy entry.

## 2) Systems Under Test (SUT) & Cross‑Contract Edges
- **EntryGateFinal** public entry (`enterLottery`) → internal `_processEntry` sequence:  
  `validate → USDT safeTransferFrom(player→this) → _payAffiliate → _addToRegistry → _updateBatchFinancials → (close+_transmitBatch when full)`  
  (Payout via `safeTransfer(affiliate, TIER_2_AFFILIATE_FEE)`. Net funds to EntryManager inside `_transmitBatch`.)
- **Interfaces:** `ILotteryRegistry.entryManager()` must be non‑zero; `IEntryManager.receiveRegistryBatch(batch, entries, netAmount)` must be called **after** token transfer of the same `netAmount`.  
- **Security scaffolding:** ReentrancyGuard on entry; (ensure OZ Pausable/Ownable are properly wired if used by modifiers).

## 3) Test Plan — What to Run, Then What to Add

### A) Run all relevant modules from your checklist first
- **Core Entry (Module 1):** registration/entry acceptance/limits/deadlines/events (01–45).  
- **Security & Access (Module 2):** roles, reentrancy, overflow, emergency stops (46–80).  
- **Payment Integration (Module 4):** USDT validations, FinanceManager/registry coordination, replay/double‑pay protections (111–135).  
- **Event Logging & Monitoring (Module 5):** exhaustively assert event payloads (136–155).  
- **Performance & Scalability (Module 6):** gas/throughput/load (156–175).  
- **Integration (Module 7):** registry resolution, cross‑contract state sync, end‑to‑end (176–189).

> If any test is flaky or incorrectly specified, **repair the test**, not the code, unless the finding exposes a true defect.

### B) Add the following targeted tests (Builder‑AI must author & run)

#### 1) High‑Volume / Concurrency
- **Burst storm:** 1,000 sequential entries; then 1,000 entries from 50 distinct addresses in interleaved order; assert no duplicate player numbers, no mis‑ordered registry rows, no missed events.  
- **Batch rollover race:** fill to `TIER_2_MAX_PLAYERS − 1`, then fire 2–4 simultaneous entries; assert **exactly one** batch closes, transmit occurs once, next batch starts at player #1.  
- **Long‑run soak:** 10,000 entries across 100 batches; snapshot gas/latency and assert no state growth anomalies (mappings cleared/purged as designed).

#### 2) Affiliate Payout Security
- **Single‑pay invariant:** per valid entry, `AffiliatePayment` emitted once; contract USDT delta equals exactly affiliate fee; reentrancy simulation (malicious affiliate contract) cannot re‑enter `enterLottery`.  
- **Edge cases:** affiliate==player (self referral), affiliate is a contract, affiliate is an EOA with no code; zero address **must** revert (as specified).  
- **Value conservation:** For each batch: `totalEntryFees = feePerEntry * count`; `totalAffiliatePaid = affFeePerEntry * count`; `netAmount = totalEntryFees − totalAffiliatePaid` — prove equalities with invariants per batch.

#### 3) Batch Correctness to EntryManager
- **Exact count:** At transmit, array length == batchRegistryCount; each `RegistryEntry.playerNumber` is 1…N with no gaps; affiliateAmount per row equals constant.  
- **Value match:** Transfer `netAmount` to EntryManager **before** calling `receiveRegistryBatch`; the **transferred** value equals the **argument** value; assert EntryManager balance delta matches.  
- **Min‑net policy:** If `netAmount < MINIMUM_NET_TRANSFER`, batch must **revert** transmission (and remain open or recover per design) — test happy/fail paths.

#### 4) Token Eligibility & Payment Hygiene
- **Only USDT path:** attempts to “approve” other ERC‑20s should have no effect; entries only succeed when `POLYGON_USDT.safeTransferFrom` succeeds for **exact fee**; direct MATIC/ETH transfers have no impact.  
- **USDT quirk defense:** simulate non‑standard ERC‑20 behavior (false return values); SafeERC20 should handle; assert failures revert cleanly with no partial state updates.  
- **No ghost acceptance:** sending USDT directly to the contract without calling entry must **not** create an entry; audit getters/registry state to confirm.

## 4) Metrics & Acceptance Targets (builder must collect/report)
- **Throughput:** ≥100 entries/min sustained; no missed close/transmit; 0 race defects.  
- **Gas (Tier‑2):** Entry ≤150k; queries ≤50k; batch transmit amortized cost recorded and trended.  
- **Events:** 100% emission + payload correctness for `EntryCreated/EntrySuccessful/AffiliatePayment/BatchClosed/RegistryTransmitted` etc.  
- **Invariants:** All conservation equations and cardinality checks hold across 10k‑entry soak.

## 5) Patch & Improvement Policy (what Builder‑AI may change)

**Allowed (when beneficial & non‑breaking):**
- Add/repair tests, tighten assertions, add property‑based/fuzz invariants.  
- Refactor internal functions for clarity; add explicit comments and NatSpec.  
- Harden checks (e.g., extra require statements) and **fix reentrancy/order‑of‑operations** if any edge is found.  
- Gas tweaks that don’t alter behavior (unchecked blocks with explicit bounds, memory‑copy optimizations for registry arrays, struct packing, caching `entryManagerAddress`, etc.).  
- Ensure OZ **imports/parents** match used modifiers (`whenNotPaused`, `onlyOwner`) — wire `Pausable/Ownable` correctly if referenced.  

**Not allowed (without explicit approval):**
- Changing economic constants (entry fee, affiliate fee, batch size, min net).  
- Converting **instant** affiliate payout into deferred settlement (conflicts with campaign objective of instant affiliate fees).  
- Any owner/admin backdoors; system must remain autonomous per project doctrine.

## 6) Reporting Format (deliver back after each run)
1. **Checklist coverage map**: which items (IDs) passed/failed/flaky with reasons.  
2. **Perf table**: median/95p gas & latency for entry, close, transmit; throughput under load.  
3. **Invariant proofs**: per‑batch conservation equations + event cardinalities.  
4. **Patch log**: exact diffs for tests/contracts; rationale; risk; result.  
5. **Open risks**: anything needing HQ‑AI review.  
6. **Green tag**: only when **all 189 tests** + added tests pass and soak test is clean.

## 7) Pointers for Builder‑AI (implementation hints)
- Use **property‑based testing** to prove: “one entry ⇒ one affiliate payment”, “N entries ⇒ N registry rows”, and “batch close ⇒ single transmit with exact netAmount”.  
- Simulate **concurrent submissions** with scripted wallets to model race windows right at `TIER_2_MAX_PLAYERS − 1`.  
- Include **malicious affiliate** and **non‑standard USDT** mocks to validate SafeERC20 paths and reentrancy guard.  
- Validate **Registry.entryManager()** non‑zero before first transmit; add a pre‑flight health check.  
- Keep **marketing/discovery metadata at EOF** in comments/immutables **after** tests are green.

## 8) Why this aligns with the program
- Focuses on the **AI‑driven test platform** and long‑run autonomy mandate.  
- Leverages your **comprehensive checklist** while adding the exact edge‑case tests that matter for scale, money movement, and correctness.
