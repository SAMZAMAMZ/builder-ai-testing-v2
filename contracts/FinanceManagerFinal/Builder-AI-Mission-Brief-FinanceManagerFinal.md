# Builder-AI Mission Brief – FinanceManagerFinal.sol

## 0) Context & Authority
- **Contract role:** Central treasury & distribution hub — receives net draw funds from EntryManager, splits into Prize, Gas, and Overhead allocations, enforces thresholds, and guarantees atomic execution.
- **Authority granted:**  
  - Run **all** tests in the embedded checklist (215 items).  
  - Cross-check every checklist item and **add edge-case tests** for unusual fund flows, cross-contract failures, and reentrancy scenarios.  
  - Repair brittle/failing tests when incorrect.  
  - Patch contract **only** to improve robustness, gas efficiency, and security — without changing fixed payout amounts, min threshold, or allocation formula.  
  - Append marketing/discovery metadata at EOF only after contract is fully green.

## 1) Non-Negotiable Invariants
1. **Minimum Fund Threshold:** ≥ 860 USDT net per draw; enforced before any processing.
2. **Exact Payout Split:**  
   - 800 USDT → PrizeManager  
   - 25 USDT → GasManager  
   - Remainder → OverheadManager  
3. **Zero Balance Guarantee:** Contract balance is 0 after successful distribution.
4. **Atomic Operation:** All-or-nothing distribution; no partial sends.
5. **Access Control:** Only EntryManager can trigger fund reception.
6. **Dual Reentrancy Protection:** OpenZeppelin + custom guard both active.
7. **Cross-Contract Consistency:** DrawID and batchNumber consistent across PrizeManager, GasManager, and OverheadManager calls.
8. **Mathematical Integrity:** DistributionIntegrityValidated event proves total distributed == total received.

## 2) Systems Under Test
- **Fund Reception:** `receiveDrawFunds(drawId, batchNumber, netAmount)`
- **Prize Payment:** Transfer to PrizeManager + interface call
- **Gas Payment:** Transfer to GasManager + interface call
- **Overhead Sweep:** Remaining balance to OverheadManager
- **Security Layers:** Dual reentrancy guard, enhanced input validation
- **Monitoring:** Performance metrics, security status, health checks
- **Integration Points:** EntryManager, PrizeManager, GasManager, OverheadManager, Registry

## 3) Test Plan — What to Run, Then What to Add

### A) Run all embedded modules
- **Module 1:** Fund reception, validation, state tracking  
- **Module 2:** Prize payment execution & event emission  
- **Module 3:** Gas payment execution & event emission  
- **Module 4:** Overhead sweep, integrity validation  
- **Security Suite:** Reentrancy, input validation, performance monitoring  
- **Integration Tests:** All cross-contract flows  
- **View Functions:** Data retrieval, business rule validation  
- **Performance:** Gas optimization, scalability

### B) Add targeted robustness tests

#### 1) Cross-Contract Failure Simulation
- PrizeManager revert: assert funds not sent to Gas/Overhead, state rollback.
- GasManager revert: assert Overhead not swept, state rollback.
- OverheadManager revert: assert distribution stops, state rollback.

#### 2) Reentrancy Stress
- Attempt reentrancy via PrizeManager, GasManager, OverheadManager mock contracts; confirm dual guard blocks all.

#### 3) Threshold Edge Cases
- Test exactly 860 USDT (pass), 859.999999 USDT (fail), very large amounts under MAX_FUND_AMOUNT.
- Verify rounding correctness for large values.

#### 4) Integrity Checks
- Fuzz netAmount input to confirm total payout sum matches exactly, no dust amounts remain.

#### 5) Performance Degradation Alerts
- Simulate >100 draws processed sequentially; confirm metrics log each draw and no slowdowns.

## 4) Metrics & Acceptance Targets
- **Security Tests:** 100% pass rate — no exceptions.
- **Business Logic Tests:** 100% compliance — exact amounts, order, and recipients.
- **Integration Reliability:** ≥ 95% success rate in cross-contract test harness.
- **Gas Efficiency:** Minimal external calls; no excess storage writes.
- **Audit Events:** All funds movement logged with correct drawId, batchNumber, and amount.

## 5) Patch & Improvement Policy
**Allowed:**  
- Strengthen parameter checks, add missing revert reasons.
- Optimize gas usage in loops or repeated storage reads.
- Add event fields for traceability.
- Improve error recovery flows for failed external calls.

**Not Allowed:**  
- Change prize, gas, or min threshold amounts.
- Alter distribution sequence or atomicity.
- Introduce admin override for distributions.

## 6) Reporting Requirements
1. Full pass/fail map for all 215 embedded tests + any additional tests.
2. Security rating: SECURE/NEEDS_REVIEW/VULNERABLE.
3. Gas usage table for each main function.
4. Performance metrics from sequential draw runs.
5. Patch/change log with reasons and risk assessments.

## 7) Builder-AI Hints
- Always verify state before and after each transfer to maintain zero-balance guarantee.
- Use mocks to simulate dependent contract failures.
- Keep enhancedValidation and performanceMonitored modifiers in all external flows.
- Confirm DistributionIntegrityValidated always matches actual on-chain math.
