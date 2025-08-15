# 🧪 Custom Test List for EntryGateFinal

**Instructions**: Develop your specific test requirements below. Builder-AI will read this file and generate tests based on your specifications combined with the contract objectives.

---

## 🎯 PRIMARY TEST CATEGORIES (Based on Contract Objectives)

### Security Testing (CRITICAL Priority)
- [ ] Reentrancy protection on all state changes
- [ ] Input validation for all addresses  
- [ ] Proper USDT allowance and transfer validation
- [ ] Batch overflow prevention
- [ ] Emergency pause capability

### Functionality Testing (HIGH Priority)  
- [ ] Secure and validated entry processing
- [ ] Affiliate/referral system management
- [ ] Batch size and timing control
- [ ] USDT payment processing and validation
- [ ] Entry state tracking and transparency

### Business Logic Testing (HIGH Priority)
- [ ] Entry Fee: 10 USDT per entry validation
- [ ] Max Players Per Batch: TIER_2_MAX_PLAYERS compliance
- [ ] Affiliate System: Required for all entries
- [ ] Self Referral: ALLOWED by design (promotional strategy)
- [ ] Pause Capability: Emergency stop functionality

---

## 📋 YOUR SPECIFIC TEST REQUIREMENTS

### Test Category 1: Entry Validation & Processing
**Priority**: CRITICAL
**Focus**: Comprehensive entry validation and secure processing
**Requirements**:
- [ ] Validate entry fee amount (exactly 10 USDT)
- [ ] Verify USDT balance before entry
- [ ] Check USDT allowance approval
- [ ] Validate affiliate address requirements
- [ ] Test self-referral allowance (should SUCCEED)
- [ ] Verify batch capacity limits
- [ ] Test entry state transitions
- [ ] Validate entry event emissions

### Test Category 2: Payment & Financial Flow
**Priority**: HIGH
**Focus**: USDT payment processing and financial integrity
**Requirements**:
- [ ] USDT transfer execution verification
- [ ] Affiliate fee calculation and distribution
- [ ] Entry fee collection accuracy
- [ ] Failed payment handling
- [ ] Insufficient balance scenarios
- [ ] Allowance edge cases
- [ ] Gas fee considerations

### Test Category 3: Batch Management
**Priority**: HIGH
**Focus**: Batch lifecycle and capacity management
**Requirements**:
- [ ] Batch creation and initialization
- [ ] Player count tracking accuracy
- [ ] Batch capacity enforcement
- [ ] Batch completion triggers
- [ ] Multi-batch coordination
- [ ] Batch state consistency

### Test Category 4: Affiliate System
**Priority**: MEDIUM
**Focus**: Referral system functionality and rewards
**Requirements**:
- [ ] Affiliate address validation
- [ ] Self-referral success (by design)
- [ ] Affiliate fee calculation
- [ ] Affiliate reward distribution
- [ ] Invalid affiliate handling
- [ ] Zero address prevention

### Test Category 5: Security & Access Control
**Priority**: CRITICAL
**Focus**: Security mechanisms and access controls
**Requirements**:
- [ ] Reentrancy attack prevention
- [ ] Pause functionality testing
- [ ] Owner-only function protection
- [ ] Input sanitization
- [ ] Edge case attack vectors
- [ ] Emergency scenarios

### Test Category 6: Integration Testing
**Priority**: MEDIUM
**Focus**: External contract interactions
**Requirements**:
- [ ] USDT contract integration
- [ ] Lottery registry communication
- [ ] Event emission verification
- [ ] External call handling
- [ ] Mock contract interactions

---

## 🔧 CUSTOM TESTING INSTRUCTIONS

### Special Requirements
- [ ] Test with improved contract (getTotalEntries function added)
- [ ] Validate pause functionality implementation
- [ ] Test EntryCreated event emission (newly added)
- [ ] Verify getBatchInfo function works correctly
- [ ] Test contract after recent improvements

### Testing Approach
- [ ] Use Hardhat testing framework
- [ ] Mock USDT token for testing
- [ ] Mock lottery registry interface
- [ ] Test both happy path and edge cases
- [ ] Include gas usage optimization tests

### Coverage Requirements
- [ ] 100% function coverage
- [ ] 100% branch coverage
- [ ] All revert conditions tested
- [ ] All events tested
- [ ] All state changes verified

### Success Criteria
- **Minimum Pass Rate**: 95%
- **Critical Security Tests Must Pass**: 100%
- **Business Logic Tests Must Pass**: 100%
- **Custom Success Metrics**: 
  - Self-referral tests should PASS (allowed by design)
  - New functions (getTotalEntries, getBatchInfo) must work
  - Pause functionality must work correctly
  - EntryCreated event must emit properly

---

## 🎯 BUILDER-AI INSTRUCTIONS

**When Builder-AI reads this file, it should**:
1. Prioritize CRITICAL and HIGH priority test categories
2. Generate comprehensive tests for each requirement
3. Follow the custom testing instructions above
4. Validate against the success criteria specified
5. Consider the recent contract improvements (pause, getTotalEntries, EntryCreated event)

**Special Focus Areas**:
- Self-referral should be ALLOWED and tested as success case
- Recent contract improvements must be thoroughly tested
- USDT payment flow is critical for business functionality
- Batch management affects entire lottery operation
- Security tests are non-negotiable (100% pass required)

**Expected Test Structure**:
```javascript
describe("EntryGateFinal - Comprehensive Testing", function() {
  describe("Category 1: Entry Validation & Processing", function() {
    // Tests for entry validation requirements
  });
  
  describe("Category 2: Payment & Financial Flow", function() {
    // Tests for payment processing requirements  
  });
  
  // ... other categories
});
```

---

## 📊 EXPECTED OUTCOMES

### Test Coverage Targets
- **Total Tests**: 50-60 comprehensive tests
- **Security Tests**: 15-20 tests (100% pass required)
- **Functionality Tests**: 20-25 tests (95%+ pass required)
- **Business Logic Tests**: 10-15 tests (100% pass required)
- **Integration Tests**: 5-10 tests (90%+ pass required)

### Quality Indicators
- All contract objectives validated through tests
- All business logic specifications verified
- All security priorities have dedicated test coverage
- Recent contract improvements thoroughly tested
- Edge cases and error conditions covered

---

*Once you complete this test list, Builder-AI will read it and generate objective-driven tests based on your specifications combined with the contract objectives and embedded checklist.*

**READY FOR YOUR CUSTOMIZATION**: Edit the requirements above to match your specific testing needs!
