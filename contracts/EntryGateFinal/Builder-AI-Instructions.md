# 🚀 **Builder-AI Testing Instructions - EntryGateFinal**

## 📊 **Contract Overview**
- **Contract**: EntryGateFinal.sol
- **Purpose**: Tier 2 lottery entry system (10 USDT entry fee, 100 players per batch)
- **Test Suite**: 156 comprehensive tests across 9 modules
- **Architecture**: 8-module batch processing system
- **Security**: ReentrancyGuard, SafeERC20, custom errors

---

## 🎯 **Test Execution Parameters**

### **Lottery Configuration:**
```javascript
TIER_2_ENTRY_FEE = 10 * 10^6     // 10.000000 USDT (6 decimals)
TIER_2_MAX_PLAYERS = 100         // 100 players per batch  
TIER_2_AFFILIATE_FEE = 750000    // 0.750000 USDT (6 decimals)
MINIMUM_NET_TRANSFER = 900 * 10^6 // 900.000000 USDT minimum
TIER_NAME = "Tier-2-Entry-10-USDT"
```

### **Expected Financial Flow:**
- **Per Player Entry**: 10 USDT
- **Per Affiliate Payment**: 0.75 USDT
- **Net Per Entry**: 9.25 USDT
- **Full Batch (100 players)**:
  - Total Entry Fees: 1,000 USDT
  - Total Affiliate Paid: 75 USDT
  - Net Transfer to EntryManager: 925 USDT

---

## 🧪 **Test Suite Structure (156 Tests)**

### **Module 1: Entry Validation (18 tests)**
- Entry parameter validation (8 tests)
- Entry processing flow (10 tests)
- **Key Test**: Batch closure at exactly 100 players

### **Module 2: Registry Management (22 tests)**
- Registry entry creation (12 tests)
- Registry data retrieval (10 tests)
- **Key Test**: Sequential player numbering (1,2,3...100)

### **Module 3: Affiliate Payment System (16 tests)**
- Payment execution (10 tests)
- Payment events & tracking (6 tests)
- **Key Test**: Exact 0.75 USDT per affiliate payment

### **Module 4: Batch Management (24 tests)**
- Batch lifecycle (12 tests)
- Batch financial validation (12 tests)
- **Key Test**: Automatic batch closure and new batch creation

### **Module 5: Financial Calculation (14 tests)**
- Fee calculations (8 tests)
- Financial data access (6 tests)
- **Key Test**: Net amount = total - affiliate fees (precision)

### **Module 6: Registry Transmission (18 tests)**
- EntryManager integration (10 tests)
- Transmission events & validation (8 tests)
- **Key Test**: All 100 entries transmitted correctly

### **Module 7: Fund Transmission (12 tests)**
- USDT transfer validation (12 tests)
- **Key Test**: Exact 925 USDT transfer to EntryManager

### **Module 8: Purge Management (16 tests)**
- Purge authorization (8 tests)
- Purge execution (8 tests)
- **Key Test**: Complete batch data deletion (EntryManager-only)

### **Module 9: Configuration & Constants (16 tests)**
- Immutable constants (10 tests)
- Contract info functions (6 tests)
- **Key Test**: All constants immutability and consistency

---

## 🔥 **Critical Test Scenarios**

### **High-Priority Tests to Monitor:**

1. **Batch Closure Timing** (4.1.3)
   - Must trigger at exactly 100 players
   - Should start new batch automatically

2. **Financial Precision** (5.1.6)
   - All amounts must be precise to 6 decimals
   - No rounding errors

3. **Registry Transmission** (6.1.6)
   - All 100 entries must transmit correctly
   - No data loss during transmission

4. **Fund Transfer** (7.1.1)
   - Exact 925 USDT must transfer to EntryManager
   - No funds should remain in contract

5. **Purge Security** (8.1.2)
   - Only EntryManager can purge batches
   - Unauthorized attempts must be rejected

---

## ⚡ **Builder-AI Execution Commands**

### **Basic Test Execution:**
```bash
npm install
npm run test
```

### **Verbose Testing with Gas Reports:**
```bash
npm run test-verbose
npm run test-gas
```

### **Coverage Analysis:**
```bash
npm run coverage
```

### **Railway-Optimized Execution:**
```bash
# For Railway deployment testing
export NODE_ENV=production
export POLYGON_RPC_URL=https://polygon-rpc.com
npm test 2>&1 | tee test-results.log
```

---

## 📈 **Expected Success Metrics**

### **Test Results Targets:**
- **Pass Rate**: 100% (156/156 tests)
- **Gas Usage**: < 2M gas per batch operation
- **Execution Time**: < 10 minutes for full suite
- **Memory Usage**: < 4GB peak

### **Financial Validation Checkpoints:**
- ✅ Entry fees collected: 10 USDT × player count
- ✅ Affiliate payments: 0.75 USDT × player count  
- ✅ Net transfer: (Entry fees - Affiliate payments)
- ✅ Minimum met: Net transfer ≥ 900 USDT for full batch
- ✅ Contract balance: 0 USDT after transmission

---

## 🚨 **Failure Scenarios to Watch**

### **Critical Failures:**
1. **BatchFull** not triggered at 100 players
2. **Financial miscalculation** (rounding errors)
3. **Registry transmission failure** (data loss)
4. **Unauthorized purge access** (security breach)
5. **Fund transfer failure** (stuck USDT)

### **Warning Scenarios:**
1. **High gas usage** (> 3M gas per operation)
2. **Slow execution** (> 15 minutes total)
3. **Memory leaks** (> 6GB usage)
4. **Network timeout** (> 30s per test)

---

## 🔧 **Environment Setup**

### **Required Environment Variables:**
```bash
POLYGON_RPC_URL=https://polygon-rpc.com
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=0x... # For mainnet testing (optional)
REPORT_GAS=true # For gas reporting
```

### **Account Requirements:**
- **200 test accounts** (100 players + 100 affiliates)
- **10,000 ETH per account** for gas
- **1,000 USDT per account** for entry fees

---

## 📊 **Real-Time Monitoring**

### **Success Indicators:**
- ✅ **Module completion**: Each module shows 100% pass rate
- ✅ **Event emission**: All expected events fired correctly
- ✅ **State consistency**: Contract state matches expectations
- ✅ **Financial accuracy**: All USDT calculations precise

### **Performance Metrics:**
- **Test Duration**: Track per-module execution time
- **Gas Consumption**: Monitor gas usage patterns
- **Memory Usage**: Watch for memory leaks
- **Network Calls**: Monitor RPC call efficiency

---

## 🎉 **Success Completion**

When all 156 tests pass, EntryGateFinal is **READY FOR PRODUCTION DEPLOYMENT** on Polygon mainnet!

**Expected Final Output:**
```
✅ EntryGateFinal Test Suite: 156 tests passed
✅ Gas Usage: Optimal (< 2M gas per operation)
✅ Financial Validation: All calculations accurate
✅ Security Tests: All access controls working
✅ Performance: Execution completed in < 10 minutes

🚀 CONTRACT READY FOR THIRDWEB DEPLOYMENT!
```

---

## 🔗 **Next Steps After Success**

1. **Deploy to Polygon Amoy** (testnet validation)
2. **Deploy to Polygon Mainnet** (production)
3. **Register with ThirdWeb** (contract verification)
4. **Enable Builder-AI monitoring** (ongoing validation)

**Contract is 100% Builder-AI compatible for continuous testing on Railway!**
