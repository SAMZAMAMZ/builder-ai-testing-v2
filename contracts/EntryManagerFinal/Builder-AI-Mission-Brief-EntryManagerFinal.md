# Builder-AI Mission Brief – EntryManagerFinal.sol

## 0) Context & Authority
- **Contract role:** Receives funds and player registry batches from EntryGateFinal, assigns DrawIDs, coordinates with FinanceManager, holds registry for DrawManager, purges registry after PrizeManager payout.
- **Tier focus:** Tier 2 (10 USDT entry, 100 players, 0.75 USDT affiliate fee).
- **Authority granted:**  
  - Run **all** tests in `ENTRYMANAGERFINAL-COMPREHENSIVE-TESTING-CHECKLIST.md`.  
  - Cross-check **every checklist item** and **add new tests** for high-volume scenarios, concurrency, and data consistency.  
  - **Repair failing/brittle tests** when they’re wrong.  
  - **Patch contract** only to improve robustness, gas efficiency, and security — without altering economic constants, payout logic, or player count rules.  
  - Append marketing/discovery metadata at EOF after passing tests.

## 1) Non-Negotiable Invariants
1. **Minimum Net Amount:** Must enforce ≥900 USDT per batch — unskippable.
2. **Exact Player Count:** Exactly 100 players per batch; no more, no less.
3. **Funds/Registry Linkage:** `netAmount`, `batchNumber`, and `DrawID` must match between funds received and registry batch.
4. **Sequential DrawIDs:** Incremented exactly once per completed draw; no gaps or repeats.
5. **Financial Integrity:** Funds sent to FinanceManager exactly match `netAmount` stored for that batch; no over/under transfer.
6. **Token Restriction:** Only immutable POLYGON_USDT accepted; no other tokens or native MATIC.
7. **Access Control:** `receiveFunds` & `receiveRegistryBatch` only callable by EntryGate; `purgeDrawRegistry` only by PrizeManager.
8. **Purge Safety:** Purge only after confirmed PrizeManager payout; cleans storage completely.

## 2) Systems Under Test
- **Funds Reception:** `receiveFunds(batchNumber, netAmount)`  
- **Registry Reception:** `receiveRegistryBatch(batchNumber, entries[], netAmount)`  
- **Finance Manager Coordination:** `_sendToFinanceManager`  
- **Purge Logic:** `purgeDrawRegistry(drawId)`  
- **Registry Access:** `getPlayerRegistry`, `getPlayerByIndex`, `getDrawDetails`  
- **Integration Hooks:** FinanceManager, PrizeManager, DrawManager, EntryGate purge.

## 3) Test Plan — What to Run, Then What to Add

### A) Run all relevant checklist modules
- **Module 1:** Funds reception & validation (min amount, correct sender).  
- **Module 2:** Registry reception, player count validation, 5-field registry integrity.  
- **Module 3:** Funds forwarding to FinanceManager, purge trigger, batch consistency.  
- **Module 4:** Registry access for DrawManager.  
- **Module 5:** Purge control, event logging, storage cleanup.  
- **Modules 6–8:** End-to-end workflow, access control, performance, scalability.  

### B) Add high-value targeted tests

#### 1) High-Volume & Concurrency
- Process 1,000 sequential batches without memory/storage growth beyond expected.
- Concurrent send of funds & registry from multiple batches; confirm no cross-contamination.
- Burst test: two batches reaching completion within the same block — verify correct DrawIDs and FinanceManager transfers.

#### 2) Funds & Registry Matching
- Mismatched `netAmount` or `batchNumber` between funds and registry must revert.
- Fuzz test for small rounding discrepancies — ensure no bypass of min 900 USDT check.

#### 3) FinanceManager Coordination
- Mock FinanceManager to fail mid-transfer; assert state not corrupted, retry works.
- Verify `netAmount` transferred equals stored `netAmount` to the unit.

#### 4) Purge Logic
- PrizeManager triggers purge only after fundsSent flag is true.
- Post-purge: registry arrays empty, accessors revert or return empty sets.

#### 5) Token Eligibility
- Attempt `receiveFunds` with alternate ERC-20 — should revert or fail validation.
- Attempt with direct USDT transfer (no function call) — no registry or state change.

## 4) Metrics & Acceptance Targets
- **Throughput:** Capable of processing ≥10 consecutive batches without lag or state errors.
- **Gas:**  
  - `receiveFunds` < 200k gas  
  - `receiveRegistryBatch` optimized for 100 players  
  - Purge operations minimal gas
- **Data Integrity:** 100% event accuracy for FundsReceived, RegistryReceived, FundsSentToFinanceManager, DrawRegistryPurged.

## 5) Patch & Improvement Policy
**Allowed:**  
- Strengthen validation (amounts, counts, sender checks).  
- Improve gas via caching constants, struct packing, memory ops.  
- Add missing event fields if needed for auditing.  
- Harden reentrancy and state sequencing.  

**Not Allowed:**  
- Change constants: `MINIMUM_FUND_THRESHOLD`, `TIER_2_MAX_PLAYERS`.  
- Alter affiliate payout timing or amount.  
- Add admin paths that bypass core workflow.

## 6) Reporting Requirements
1. Pass/fail map for all 118 checklist items + added tests.  
2. Gas & performance metrics table.  
3. State diagrams before/after batch completion.  
4. Patch/change log with justifications.  
5. Security posture: SECURE/NEEDS_REVIEW/VULNERABLE.

## 7) Builder-AI Hints
- Simulate correct EntryGate calls in sequence: funds → registry → finance → purge.  
- Test invalid ordering (registry before funds) — must revert.  
- Confirm draw advancement only after both funds & registry complete.  
- Validate batch number continuity from EntryGate to FinanceManager to purge.
