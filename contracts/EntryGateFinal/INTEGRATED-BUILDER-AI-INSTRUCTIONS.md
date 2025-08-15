# 🎯 Integrated Builder-AI Instructions for EntryGateFinal

## 📋 MISSION BRIEF REQUIREMENTS (Non-Negotiable)

### Critical Invariants (100% Compliance Required)
1. **Throughput:**: must reliably process large, concurrent bursts without state corruption or dropped events. Target: ≥100 entries/min sustained; no race conditions.
2. **Affiliate payout security:**: affiliate fee must be paid **exactly once per valid entry**, with **no reentrancy** and no path to over‑/under‑payment.
3. **Batch correctness:**: exactly **TIER_2_MAX_PLAYERS** entries close a batch; **netAmount** = sum(entry fees) − sum(affiliate fees); **netAmount** is **transferred to EntryManager** and **the same value** is passed to `receiveRegistryBatch`. The registry array must contain **exactly the batch’s players** with correct player numbers and affiliate amounts.
4. **Token eligibility:**: only **immutable POLYGON_USDT** is accepted; no native MATIC or alternate ERC‑20 paths; payments use **SafeERC20**; attempts to fund with any other token never satisfy entry.

### Test Plan Execution
**Existing Modules to Run:**
- **Core Entry (Module 1)**: registration/entry acceptance/limits/deadlines/events (01–45).
- **Security & Access (Module 2)**: roles, reentrancy, overflow, emergency stops (46–80).
- **Payment Integration (Module 4)**: USDT validations, FinanceManager/registry coordination, replay/double‑pay protections (111–135).
- **Event Logging & Monitoring (Module 5)**: exhaustively assert event payloads (136–155).
- **Performance & Scalability (Module 6)**: gas/throughput/load (156–175).

**Additional Tests to Add:**
- **High‑Volume / Concurrency**: 3 targeted tests
- **Affiliate Payout Security**: 3 targeted tests
- **Batch Correctness to EntryManager**: 3 targeted tests

### Performance Targets
- **Throughput**: ≥100 entries/min sustained; no missed close/transmit; 0 race defects.
- **Gas (Tier‑2)**: Entry ≤150k; queries ≤50k; batch transmit amortized cost recorded and trended.
- **Events**: 100% emission + payload correctness for `EntryCreated/EntrySuccessful/AffiliatePayment/BatchClosed/RegistryTransmitted` etc.
- **Invariants**: All conservation equations and cardinality checks hold across 10k‑entry soak.

## 🎯 CONTRACT OBJECTIVES (From Context System)

### Primary Objectives
- Secure and validated entry processing
- Affiliate/referral system management
- Batch size and timing control
- USDT payment processing and validation
- Entry state tracking and transparency

### Security Priorities  
- Reentrancy protection on all state changes
- Input validation for all addresses
- Proper USDT allowance and transfer validation
- Batch overflow prevention
- Emergency pause capability

## 🧪 INTEGRATED TESTING STRATEGY

mission-brief + objectives + checklist

**Priority Order:**
1. Non-negotiable invariants (100% compliance)
2. Mission brief test plan (all modules)
3. Contract objectives validation
4. Performance targets achievement

**Test Categories:**
- **Throughput:** (critical) [mission-brief-invariant]
- **Affiliate payout security:** (critical) [mission-brief-invariant]
- **Batch correctness:** (critical) [mission-brief-invariant]
- **Token eligibility:** (critical) [mission-brief-invariant]
- **High‑Volume / Concurrency** (high) [mission-brief-additional]
- **Affiliate Payout Security** (high) [mission-brief-additional]
- **Batch Correctness to EntryManager** (high) [mission-brief-additional]
- **Secure and validated entry processing** (high) [contract-objective]
- **Affiliate/referral system management** (high) [contract-objective]
- **Batch size and timing control** (high) [contract-objective]
- **USDT payment processing and validation** (high) [contract-objective]
- **Entry state tracking and transparency** (high) [contract-objective]
- **Reentrancy protection on all state changes** (critical) [contract-security]
- **Input validation for all addresses** (critical) [contract-security]
- **Proper USDT allowance and transfer validation** (critical) [contract-security]
- **Batch overflow prevention** (critical) [contract-security]
- **Emergency pause capability** (critical) [contract-security]
- **1. Secure and validated entry processing** (high) [embedded-checklist]
- **2. Affiliate/referral system management** (high) [embedded-checklist]
- **3. Batch size and timing control** (high) [embedded-checklist]
- **4. USDT payment processing and validation** (high) [embedded-checklist]
- **5. Entry state tracking and transparency** (high) [embedded-checklist]

## 🔧 PATCH POLICY (What Builder-AI Can/Cannot Change)

**ALLOWED:**


**NOT ALLOWED:**


## 📊 REPORTING REQUIREMENTS



## 💡 IMPLEMENTATION HINTS

- Use **property‑based testing** to prove: “one entry ⇒ one affiliate payment”, “N entries ⇒ N registry rows”, and “batch close ⇒ single transmit with exact netAmount”.
- Simulate **concurrent submissions** with scripted wallets to model race windows right at `TIER_2_MAX_PLAYERS − 1`.
- Include **malicious affiliate** and **non‑standard USDT** mocks to validate SafeERC20 paths and reentrancy guard.
- Validate **Registry.entryManager()** non‑zero before first transmit; add a pre‑flight health check.
- Keep **marketing/discovery metadata at EOF** in comments/immutables **after** tests are green.

## ✅ SUCCESS CRITERIA

- All non-negotiable invariants validated (100%)
- All existing modules executed successfully
- All additional tests implemented and passing
- Performance targets achieved
- Reporting requirements fulfilled

---

**🎯 Builder-AI: Follow this integrated guide that combines mission brief requirements with contract objectives and embedded checklists.**