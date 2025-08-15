# Builder-AI Mission Brief – PrizeManagerFinal-Secured.sol

## 0) Context & Authority
- **Contract role:** Manages prize pool reception, winner selection, secure prize distribution (pull-over-push), unclaimed prize rollover, and purge coordination.
- **Security status:** DoS vulnerability eliminated via pull-over-push pattern; dual reentrancy guard and enhanced access control implemented.
- **Authority granted:**
  - Run **all** 293 checklist tests + 8 security validation tests.
  - Add extra stress/edge-case tests for winner claiming, malicious interactions, and purge flows.
  - Repair brittle tests; patch contract only for security/gas clarity—no change to prize amount, claiming logic, or integration sequence.
  - Append marketing/discovery metadata at EOF after all tests pass.

## 1) Non-Negotiable Invariants
1. **Exact Prize Reception:** Only FinanceManager can send exactly 800 USDT per draw.
2. **Winner Selection Trigger:** Initiated after funds reception; must integrate with DrawManager.
3. **Secure Prize Distribution:** Pull-over-push pattern only; no automatic transfers.
4. **Claim Restrictions:** Only designated winner can claim; single claim per draw.
5. **Double-Spend Prevention:** prizesClaimed[drawId] = true before transfer.
6. **Reentrancy Resistance:** nonReentrant on all external functions.
7. **Unclaimed Handling:** Rollover to next prize pool or retained until claimable.
8. **Purge Coordination:** Notify EntryManager, FinanceManager, and other modules post-completion.

## 2) Systems Under Test
- **Module 1:** Fund reception & prize record init
- **Module 2:** Winner selection initiation
- **Module 3:** claimPrize() secure claiming flow
- **Module 4:** System purge and cross-contract notifications
- **Security Layers:** Pull-over-push, dual reentrancy guard, pausable, input validation
- **Integration Points:** FinanceManager, DrawManager, EntryManager, Registry

## 3) Test Plan — What to Run, Then What to Add

### A) Run all embedded modules/tests
- **Module 1:** 70 tests — reception, struct init, metrics, integration.
- **Module 2:** 65 tests — winner selection call, DrawManager comms, events.
- **Module 3:** 88 tests — claimPrize access control, state flow, event emissions, DoS protection.
- **Module 4:** 70 tests — purge sequencing, EM/FM notifications, finalization.
- **Security Tests:** 8/8 for DoS, reentrancy, access control, emergency functions.
- **Performance Tests:** Gas usage, scalability, concurrent claims.

### B) Add targeted robustness tests

#### 1) Malicious Winner Interaction
- Claim attempt from contract with revert() in fallback — must not block other draws.
- Gas griefing simulation on claimPrize.

#### 2) Claim Edge Cases
- Claim by zero address (reject).
- Duplicate claim attempt — revert.
- Claim after timeout / when prize rolled over.

#### 3) Cross-Contract Failures
- DrawManager fails during winner selection — ensure recovery.
- EntryManager purge fails — ensure safe retry.

#### 4) Purge Timing & Order
- Ensure purge triggered only after claim or rollover decision.
- Verify all purge messages sent exactly once.

#### 5) High-Volume Simulation
- 100+ draws processed sequentially; ensure no state corruption.
- Concurrent claims for different draws in the same block.

## 4) Metrics & Acceptance Targets
- **Security:** 100% pass rate for all critical tests.
- **Business Logic:** 100% compliance — correct amounts, sequence, and authorized actors only.
- **Integration Reliability:** ≥ 95% success in cross-contract comms.
- **Performance:** claimPrize gas within expected bound; purge within acceptable gas limits.
- **Event Completeness:** All major state changes emitted with correct params.

## 5) Patch & Improvement Policy
**Allowed:**
- Extra parameter checks; revert reason clarity.
- Gas optimizations without altering logic.
- Stronger failure handling for purge and cross-contract calls.
- Logging enhancements for audits.

**Not Allowed:**
- Change 800 USDT prize amount.
- Switch from pull-over-push to push-based.
- Alter authorized roles for core flows.

## 6) Reporting Requirements
1. Pass/fail coverage for all 293 + 8 tests.
2. Security posture: SECURE/NEEDS_REVIEW/VULNERABLE.
3. Gas metrics for claimPrize, purge, and fund reception.
4. Incident report for any failed/missing invariants.
5. Change log for test or code adjustments.

## 7) Builder-AI Hints
- Use mocks for malicious winner, failing purge targets.
- Check CEI pattern enforcement: state change before transfer.
- Validate event correctness against actual state changes.
- Run stress tests for concurrent claims and purge signals.
