# Builder-AI Mission Brief – DrawManagerFinal.sol

## 0) Context & Authority
- **Contract role:** Manages VRF randomness requests, winner selection, prize delivery, and lifecycle purging.
- **Security level:** Production-ready with Module 5 purge enhancements; full Chainlink VRF v2 integration.
- **Authority granted:**
  - Run **all 252 checklist tests** across 5 modules.
  - Add edge-case/stress tests for VRF, batch purge, and cross-contract failure recovery.
  - Repair brittle tests; patch contract only for security, gas efficiency, or clarity—without altering business rules (VRF params, selection logic, purge delay).
  - Append marketing/discovery metadata at EOF after tests pass.

## 1) Non-Negotiable Invariants
1. **VRF Security:** Only Chainlink VRF Coordinator can fulfill requests; params match immutable config.
2. **Fair Selection:** `_selectWinnerFromSeed()` must be uniformly random, using modulo on player count.
3. **Access Control:** Only PrizeManager can trigger `selectWinner()`.
4. **Result Immutability:** Once selected, winner cannot be changed.
5. **Multi-Tier Support:** DrawManager must handle multiple prize tiers if configured.
6. **Result Transparency:** All events emitted with correct, indexed data for on-chain verification.
7. **Purge Safety:** Module 5 purge requires PrizeManager confirmation + 24-hour delay; preserves audit trail.
8. **Cross-Contract Integrity:** Registry-resolved addresses for PrizeManager, EntryManager are current and non-zero.

## 2) Systems Under Test
- **Module 1:** PrizeManager activation & access control
- **Module 2:** EntryManager integration for registry/player data
- **Module 3:** VRF request, fulfillment, and randomness handling
- **Module 4:** Winner delivery to PrizeManager
- **Module 5:** Purging draw records with delay & selective cleanup
- **Security Layers:** Reentrancy guard, pause control, multi-level auth
- **Integration Points:** VRF Coordinator, PrizeManager, EntryManager, Registry

## 3) Test Plan — What to Run, Then What to Add

### A) Run all embedded modules/tests
- **Module 1:** 45 items — PrizeManager activation, auth, events.
- **Module 2:** 52 items — EntryManager registry, player validation, sequence access.
- **Module 3:** 65 items — VRF setup, request, fulfillment security.
- **Module 4:** 47 items — Winner selection logic, delivery, state tracking.
- **Module 5:** 38 items — Purge design, cleanup, coordination.
- **Security & Perf:** 28 + 18 items — Attack resistance, gas optimization.
- **Integration:** 15 items — Cross-contract tests.
- **View & Pause:** 17 + 9 items — Data retrieval and emergency controls.

### B) Add targeted robustness tests

#### 1) VRF Edge Cases
- Multiple concurrent VRF requests — ensure mapping integrity.
- Fulfillment with malformed/late data — must revert or ignore.

#### 2) Winner Selection Validation
- Test extreme player counts (1, max limit) for modulo correctness.
- Verify selection uniformity with fuzz/randomness analysis.

#### 3) Purge Delay Enforcement
- Attempt purge before 24-hour delay — must revert.
- Emergency purge path — only owner or authorized.

#### 4) Cross-Contract Failure Recovery
- PrizeManager unreachable — ensure retry or graceful fail.
- EntryManager registry data corrupted — must reject and log.

#### 5) Performance & Stress
- Process 100+ draws sequentially with purge.
- Simulate network congestion in VRF requests.

## 4) Metrics & Acceptance Targets
- **Security:** 100% pass for all CRITICAL tests.
- **Business Logic:** 100% compliance — correct VRF params, selection, delivery, purge sequence.
- **Integration Reliability:** ≥95% success in PrizeManager/EntryManager/VRF calls.
- **Performance:** VRF request/fulfillment gas within limits; purge batch gas optimized.
- **Event Completeness:** All lifecycle changes emitted with correct params.

## 5) Patch & Improvement Policy
**Allowed:**
- Harden parameter checks, add missing revert reasons.
- Optimize gas in loops, purge batch ops.
- Improve error handling for VRF or cross-contract failures.
- Enhance event detail for audits.

**Not Allowed:**
- Change VRF constants or subscription logic.
- Alter winner selection algorithm.
- Reduce purge delay or bypass confirmation.

## 6) Reporting Requirements
1. Pass/fail map for all 252 items + added tests.
2. Security posture: SECURE/NEEDS_REVIEW/VULNERABLE.
3. Gas usage table for selectWinner, VRF callback, purge.
4. Performance stats for sequential draws + purge cycles.
5. Patch/change log with justifications.

## 7) Builder-AI Hints
- Mock VRF Coordinator for controlled randomness.
- Fuzz winner index calculations to check uniformity.
- Use mocks to simulate PrizeManager confirmPayout and EntryManager failures.
- Validate purge preserves audit trail and required mappings.
