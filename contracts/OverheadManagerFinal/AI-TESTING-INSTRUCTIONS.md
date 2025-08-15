# 🤖 AI Testing Instructions for OverheadManagerFinal

**SYSTEM PROMPT FOR AI TESTING ENGINES**

---

## 📖 REQUIRED READING BEFORE TESTING

1. **CONTRACT-OBJECTIVES.md** - Understand the contract's purpose and priorities
2. **EMBEDDED-TESTING-CHECKLIST.md** - Follow the comprehensive test specification
3. **Contract source code** - Analyze implementation against objectives

---

## 🎯 TESTING STRATEGY

### Phase 1: Context Analysis (Required)
```
1. Read and parse CONTRACT-OBJECTIVES.md
2. Identify primary objectives and security priorities
3. Analyze business logic specifications
4. Map integration points and dependencies
5. Generate testing plan based on objectives
```

### Phase 2: Objective-Driven Testing
```
For each primary objective:
  1. Design tests to validate the objective
  2. Create positive and negative test cases
  3. Test edge cases and boundary conditions
  4. Verify error handling and recovery
  5. Measure objective completion percentage
```

### Phase 3: Security-Priority Testing
```
For each security priority:
  1. Design security-specific test cases
  2. Test for common vulnerabilities
  3. Validate access controls and permissions
  4. Test for reentrancy and overflow issues
  5. Verify emergency mechanisms work
```

### Phase 4: Business Logic Validation
```
For each business logic specification:
  1. Test exact compliance with specification
  2. Verify calculations and formulas
  3. Test state transitions and workflows
  4. Validate data integrity and consistency
  5. Test configuration and parameter handling
```

---

## 🔍 SPECIFIC FOCUS FOR OVERHEADMANAGERFINAL

### Critical Test Areas
- **Maintenance authorization controls**: Design comprehensive security tests
- **Cost data integrity**: Design comprehensive security tests
- **Performance data protection**: Design comprehensive security tests
- **Budget manipulation prevention**: Design comprehensive security tests
- **System access during maintenance**: Design comprehensive security tests

### Business Logic Validation
- **Cost Allocation**: Activity-based cost distribution
- **Maintenance Windows**: Scheduled system maintenance
- **Performance Metrics**: KPI tracking and reporting
- **Budget Management**: Expense prediction and control
- **Health Monitoring**: System status and alerts

### Integration Testing
- **All contract performance monitoring**: Create integration test scenarios
- **Finance manager cost reporting**: Create integration test scenarios
- **Gas manager optimization data**: Create integration test scenarios
- **External monitoring systems**: Create integration test scenarios

---

## 📊 SUCCESS METRICS

### Required Outcomes
- **Security Score**: 100% (all security priorities validated)
- **Objective Coverage**: 100% (all primary objectives tested)
- **Business Compliance**: 100% (exact specification adherence)
- **Integration Reliability**: 90%+ (all integration points tested)

### Quality Indicators
- Comprehensive test coverage for all objectives
- Security vulnerabilities identified and addressed
- Business logic compliance verified
- Integration points properly mocked and tested
- Performance and gas optimization validated

---

## 🚀 IMPLEMENTATION COMMANDS

### AI Testing Execution
```bash
# 1. Load contract context
cat CONTRACT-OBJECTIVES.md
cat EMBEDDED-TESTING-CHECKLIST.md

# 2. Analyze contract against objectives
# 3. Generate objective-driven test cases
# 4. Execute comprehensive testing
# 5. Validate against success criteria
```

### Builder-AI Integration
```javascript
// AI system should read context before testing
const objectives = await readContractObjectives(contractPath);
const checklist = await readEmbeddedChecklist(contractPath);
const testPlan = await generateObjectiveDrivenTests(objectives, checklist);
const results = await executeContextAwareTests(testPlan);
```

---

**🎯 CRITICAL**: AI systems must read and understand the contract objectives before generating or executing tests. Context-aware testing based on specific objectives and security priorities is essential for meaningful validation.

*These instructions ensure AI testing systems provide comprehensive, objective-driven validation of OverheadManagerFinal.*