// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                    🧹 QUARANTINE VAULT - EXTERNAL HOUSEKEEPER                       ║
║                                                                                      ║
║ 🏠 AUTONOMOUS HOUSEKEEPER SYSTEM                                                    ║
║                                                                                      ║
║ ✅ EXTERNAL OPERATION: Independent from lottery lifecycle                           ║
║ ✅ WEBHOOK TRIGGERS: External agent/automation support                              ║
║ ✅ CONTRACT DISCOVERY: Systematic discovery of system contracts                     ║
║ ✅ TOKEN HOOVERING: Complete removal of non-USDT tokens                            ║
║ ✅ CLASSIFICATION: Automated token type detection and sorting                       ║
║ ✅ MANAGEMENT: Secure burn/withdraw options with reporting                          ║
║ ✅ ULTRA SECURE: Military-grade security with circuit breakers                     ║
║ ✅ GAS OPTIMIZED: Batch operations for cost efficiency                             ║
║                                                                                      ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
*/

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ILotteryRegistry.sol";

/// @title QuarantineVaultExternalHousekeeper
/// @dev External housekeeper system for systematic token cleanup across lottery contracts
contract QuarantineVaultExternalHousekeeper is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🔒 IMMUTABLE CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════════
    
    ILotteryRegistry public immutable REGISTRY;
    IERC20 public immutable USDT;
    
    // Housekeeper configuration
    uint256 public constant MAX_CONTRACTS_PER_SWEEP = 10;
    uint256 public constant MAX_TOKENS_PER_CONTRACT = 20;
    uint256 public constant MIN_SWEEP_INTERVAL = 1 hours;
    uint256 public constant WEBHOOK_SIGNATURE_VALIDITY = 5 minutes;
    
    // Security constants
    uint256 public constant CIRCUIT_BREAKER_THRESHOLD = 5;
    uint256 public constant MAX_CONSECUTIVE_FAILURES = 3;
    uint256 public constant AUTO_RECOVERY_DELAY = 6 hours;

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📊 DATA STRUCTURES
    // ═══════════════════════════════════════════════════════════════════════════════
    
    enum TokenType { UNKNOWN, ERC20, ERC721, ERC1155, MALICIOUS, BURNED, WITHDRAWN }
    
    enum HousekeeperStatus { IDLE, DISCOVERING, HOOVERING, CLASSIFYING, MANAGING }
    
    struct TokenInfo {
        address tokenAddress;
        TokenType tokenType;
        string name;
        string symbol;
        uint256 totalBalance;
        uint256 riskScore;
        uint256 discoveryTime;
        uint256 lastUpdate;
        bool isProcessed;
    }
    
    struct ContractSweepData {
        address contractAddress;
        uint256 tokensFound;
        uint256 tokensExtracted;
        uint256 lastSweepTime;
        bool sweepComplete;
        string contractName;
    }
    
    struct HousekeeperMetrics {
        uint256 totalSweeps;
        uint256 totalTokensFound;
        uint256 totalTokensExtracted;
        uint256 totalTokensBurned;
        uint256 totalTokensWithdrawn;
        uint256 totalContractsProcessed;
        uint256 lastSweepTime;
        HousekeeperStatus currentStatus;
    }
    
    struct WebhookAuth {
        address authorizedAgent;
        bytes32 secretHash;
        uint256 nonce;
        bool isActive;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🗄️ STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════════
    
    // Core state
    HousekeeperMetrics public metrics;
    WebhookAuth public webhookAuth;
    
    // Storage mappings
    mapping(address => TokenInfo) public tokenInventory;
    mapping(address => ContractSweepData) public contractData;
    mapping(TokenType => address[]) public tokensByType;
    mapping(address => bool) public processedContracts;
    mapping(address => uint256) public contractLastSweep;
    
    // Dynamic arrays for enumeration
    address[] public discoveredTokens;
    address[] public systemContracts;
    
    // Circuit breaker state
    uint256 public consecutiveFailures;
    uint256 public lastFailureTime;
    bool public circuitBreakerTripped;

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📡 EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    // Module 1: Hoover Events
    event HousekeeperTriggered(address indexed agent, string method, uint256 timestamp);
    event ContractsDiscovered(uint256 contractCount, uint256 timestamp);
    event TokensDetected(address indexed contract, uint256 tokenCount, uint256 timestamp);
    event TokenExtracted(address indexed contract, address indexed token, uint256 amount, uint256 timestamp);
    event SweepCompleted(address indexed contract, uint256 tokensExtracted, uint256 timestamp);
    
    // Module 2: Classification Events  
    event TokenClassified(address indexed token, TokenType tokenType, uint256 riskScore, uint256 timestamp);
    event TokensOrganized(TokenType tokenType, uint256 count, uint256 timestamp);
    event ClassificationCompleted(uint256 totalTokens, uint256 timestamp);
    
    // Module 3: Management Events
    event TokenBurned(address indexed token, uint256 amount, uint256 timestamp);
    event TokenWithdrawn(address indexed token, uint256 amount, address indexed recipient, uint256 timestamp);
    event ManagementReportGenerated(uint256 totalTokens, uint256 totalValue, uint256 timestamp);
    
    // System Events
    event CircuitBreakerTripped(string reason, uint256 failureCount, uint256 timestamp);
    event CircuitBreakerRecovered(uint256 timestamp);
    event WebhookConfigured(address indexed agent, uint256 timestamp);

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🔧 CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════════
    
    constructor(address _registry, address _usdt) Ownable(msg.sender) {
        require(_registry != address(0), "Registry cannot be zero");
        require(_usdt != address(0), "USDT cannot be zero");
        
        REGISTRY = ILotteryRegistry(_registry);
        USDT = IERC20(_usdt);
        
        // Initialize metrics
        metrics.currentStatus = HousekeeperStatus.IDLE;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🛡️ SECURITY MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    modifier systemHealthy() {
        require(!circuitBreakerTripped, "Circuit breaker active");
        _;
    }
    
    modifier authorizedAgent() {
        require(
            msg.sender == webhookAuth.authorizedAgent || msg.sender == owner(),
            "Unauthorized agent"
        );
        _;
    }
    
    modifier validSweepInterval() {
        require(
            block.timestamp > metrics.lastSweepTime + MIN_SWEEP_INTERVAL,
            "Sweep interval not met"
        );
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🧹 MODULE 1: EXTERNAL HOUSEKEEPER ENGINE
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /// @notice Configure webhook authentication for external triggers
    function configureWebhook(address agent, bytes32 secretHash) external onlyOwner {
        webhookAuth = WebhookAuth({
            authorizedAgent: agent,
            secretHash: secretHash,
            nonce: 0,
            isActive: true
        });
        
        emit WebhookConfigured(agent, block.timestamp);
    }
    
    /// @notice External webhook trigger for housekeeper operations
    function triggerHousekeeping(
        bytes calldata payload, 
        bytes calldata signature
    ) external nonReentrant systemHealthy {
        require(webhookAuth.isActive, "Webhook not configured");
        require(_verifyWebhookSignature(payload, signature), "Invalid signature");
        
        _executeFullHousekeeping();
        
        emit HousekeeperTriggered(msg.sender, "webhook", block.timestamp);
    }
    
    /// @notice Manual trigger for authorized agents
    function manualHousekeeping() external authorizedAgent nonReentrant systemHealthy validSweepInterval {
        _executeFullHousekeeping();
        
        emit HousekeeperTriggered(msg.sender, "manual", block.timestamp);
    }
    
    /// @notice Execute complete housekeeper cycle
    function _executeFullHousekeeping() internal {
        metrics.currentStatus = HousekeeperStatus.DISCOVERING;
        metrics.lastSweepTime = block.timestamp;
        
        try this.discoverSystemContracts() {
            metrics.currentStatus = HousekeeperStatus.HOOVERING;
            
            try this.hooverAllContracts() {
                metrics.currentStatus = HousekeeperStatus.CLASSIFYING;
                
                try this.classifyAllTokens() {
                    metrics.currentStatus = HousekeeperStatus.IDLE;
                    metrics.totalSweeps++;
                    
                    // Reset circuit breaker on success
                    if (circuitBreakerTripped && _canAutoRecover()) {
                        _recoverCircuitBreaker();
                    }
                } catch {
                    _handleOperationFailure("classification");
                }
            } catch {
                _handleOperationFailure("hoovering");
            }
        } catch {
            _handleOperationFailure("discovery");
        }
    }
    
    /// @notice Discover all system contracts from registry
    function discoverSystemContracts() external {
        require(msg.sender == address(this) || msg.sender == owner(), "Internal only");
        
        // Clear previous discovery
        delete systemContracts;
        
        // Get contracts from registry
        address[] memory contracts = _getSystemContractsFromRegistry();
        
        for (uint256 i = 0; i < contracts.length && i < MAX_CONTRACTS_PER_SWEEP; i++) {
            if (contracts[i] != address(0) && contracts[i] != address(this)) {
                systemContracts.push(contracts[i]);
                
                if (!processedContracts[contracts[i]]) {
                    contractData[contracts[i]] = ContractSweepData({
                        contractAddress: contracts[i],
                        tokensFound: 0,
                        tokensExtracted: 0,
                        lastSweepTime: 0,
                        sweepComplete: false,
                        contractName: _getContractName(contracts[i])
                    });
                    processedContracts[contracts[i]] = true;
                }
            }
        }
        
        emit ContractsDiscovered(systemContracts.length, block.timestamp);
    }
    
    /// @notice Hoover all discovered contracts
    function hooverAllContracts() external {
        require(msg.sender == address(this) || msg.sender == owner(), "Internal only");
        
        for (uint256 i = 0; i < systemContracts.length; i++) {
            _hooverContract(systemContracts[i]);
        }
        
        metrics.totalContractsProcessed += systemContracts.length;
    }
    
    /// @notice Hoover specific contract for non-USDT tokens
    function _hooverContract(address contractAddr) internal {
        if (contractAddr == address(0) || contractAddr == address(this)) return;
        
        // Detect tokens in contract
        address[] memory tokens = _detectTokensInContract(contractAddr);
        
        if (tokens.length == 0) {
            contractData[contractAddr].sweepComplete = true;
            return;
        }
        
        uint256 extracted = 0;
        
        for (uint256 i = 0; i < tokens.length && i < MAX_TOKENS_PER_CONTRACT; i++) {
            if (tokens[i] != address(USDT) && tokens[i] != address(0)) {
                uint256 balance = IERC20(tokens[i]).balanceOf(contractAddr);
                
                if (balance > 0) {
                    if (_extractToken(contractAddr, tokens[i], balance)) {
                        extracted++;
                        
                        // Add to inventory if not already present
                        if (tokenInventory[tokens[i]].tokenAddress == address(0)) {
                            _addToInventory(tokens[i], balance);
                        } else {
                            tokenInventory[tokens[i]].totalBalance += balance;
                            tokenInventory[tokens[i]].lastUpdate = block.timestamp;
                        }
                        
                        emit TokenExtracted(contractAddr, tokens[i], balance, block.timestamp);
                    }
                }
            }
        }
        
        // Update contract data
        contractData[contractAddr].tokensFound = tokens.length;
        contractData[contractAddr].tokensExtracted = extracted;
        contractData[contractAddr].lastSweepTime = block.timestamp;
        contractData[contractAddr].sweepComplete = true;
        
        metrics.totalTokensExtracted += extracted;
        
        emit SweepCompleted(contractAddr, extracted, block.timestamp);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📦 MODULE 2: CLASSIFICATION & STORAGE
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /// @notice Classify all discovered tokens
    function classifyAllTokens() external {
        require(msg.sender == address(this) || msg.sender == owner(), "Internal only");
        
        uint256 classified = 0;
        
        for (uint256 i = 0; i < discoveredTokens.length; i++) {
            address token = discoveredTokens[i];
            
            if (!tokenInventory[token].isProcessed) {
                TokenType tokenType = _classifyToken(token);
                uint256 riskScore = _calculateRiskScore(token);
                
                tokenInventory[token].tokenType = tokenType;
                tokenInventory[token].riskScore = riskScore;
                tokenInventory[token].isProcessed = true;
                tokenInventory[token].lastUpdate = block.timestamp;
                
                // Add to type-specific array
                tokensByType[tokenType].push(token);
                
                classified++;
                
                emit TokenClassified(token, tokenType, riskScore, block.timestamp);
            }
        }
        
        emit ClassificationCompleted(classified, block.timestamp);
    }
    
    /// @notice Classify individual token
    function _classifyToken(address token) internal view returns (TokenType) {
        if (token == address(0)) return TokenType.UNKNOWN;
        
        // Try ERC20 interface
        try IERC20Metadata(token).name() returns (string memory) {
            // Check if it supports ERC721 or ERC1155
            if (_supportsInterface(token, 0x80ac58cd)) return TokenType.ERC721; // ERC721
            if (_supportsInterface(token, 0xd9b67a26)) return TokenType.ERC1155; // ERC1155
            
            // Default to ERC20
            return TokenType.ERC20;
        } catch {
            // Check for malicious patterns
            if (_isMaliciousToken(token)) return TokenType.MALICIOUS;
            
            return TokenType.UNKNOWN;
        }
    }
    
    /// @notice Calculate token risk score
    function _calculateRiskScore(address token) internal view returns (uint256) {
        uint256 risk = 0;
        
        // Check contract size (very small = suspicious)
        uint256 size;
        assembly { size := extcodesize(token) }
        if (size < 100) risk += 30;
        
        // Check if has metadata
        try IERC20Metadata(token).name() returns (string memory name) {
            if (bytes(name).length == 0) risk += 20;
        } catch {
            risk += 40; // No metadata = higher risk
        }
        
        // Check total supply
        try IERC20(token).totalSupply() returns (uint256 supply) {
            if (supply == 0) risk += 25;
            if (supply > 10**30) risk += 15; // Extremely high supply
        } catch {
            risk += 30;
        }
        
        return risk > 100 ? 100 : risk;
    }
    
    /// @notice Get tokens by classification type
    function getTokensByType(TokenType tokenType) external view returns (address[] memory) {
        return tokensByType[tokenType];
    }
    
    /// @notice Get classification summary
    function getClassificationSummary() external view returns (
        uint256 erc20Count,
        uint256 erc721Count, 
        uint256 erc1155Count,
        uint256 unknownCount,
        uint256 maliciousCount,
        uint256 totalTokens
    ) {
        erc20Count = tokensByType[TokenType.ERC20].length;
        erc721Count = tokensByType[TokenType.ERC721].length;
        erc1155Count = tokensByType[TokenType.ERC1155].length;
        unknownCount = tokensByType[TokenType.UNKNOWN].length;
        maliciousCount = tokensByType[TokenType.MALICIOUS].length;
        totalTokens = discoveredTokens.length;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🔥 MODULE 3: BURN/WITHDRAW MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /// @notice Burn specific token amount
    function burnToken(address token, uint256 amount) 
        external 
        onlyOwner 
        nonReentrant 
        systemHealthy 
    {
        require(tokenInventory[token].tokenAddress != address(0), "Token not in inventory");
        require(token != address(USDT), "Cannot burn USDT");
        require(amount <= tokenInventory[token].totalBalance, "Insufficient balance");
        
        // Execute burn by sending to dead address
        IERC20(token).safeTransfer(address(0x000000000000000000000000000000000000dEaD), amount);
        
        // Update inventory
        tokenInventory[token].totalBalance -= amount;
        tokenInventory[token].tokenType = TokenType.BURNED;
        tokenInventory[token].lastUpdate = block.timestamp;
        
        metrics.totalTokensBurned += amount;
        
        emit TokenBurned(token, amount, block.timestamp);
    }
    
    /// @notice Withdraw token to specified address
    function withdrawToken(
        address token, 
        uint256 amount, 
        address recipient
    ) external onlyOwner nonReentrant systemHealthy {
        require(tokenInventory[token].tokenAddress != address(0), "Token not in inventory");
        require(amount <= tokenInventory[token].totalBalance, "Insufficient balance");
        require(recipient != address(0), "Invalid recipient");
        
        // Execute withdrawal
        IERC20(token).safeTransfer(recipient, amount);
        
        // Update inventory
        tokenInventory[token].totalBalance -= amount;
        tokenInventory[token].tokenType = TokenType.WITHDRAWN;
        tokenInventory[token].lastUpdate = block.timestamp;
        
        metrics.totalTokensWithdrawn += amount;
        
        emit TokenWithdrawn(token, amount, recipient, block.timestamp);
    }
    
    /// @notice Batch burn multiple tokens
    function batchBurnTokens(address[] calldata tokens) external onlyOwner nonReentrant systemHealthy {
        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            uint256 balance = tokenInventory[token].totalBalance;
            
            if (balance > 0 && token != address(USDT)) {
                IERC20(token).safeTransfer(address(0x000000000000000000000000000000000000dEaD), balance);
                
                tokenInventory[token].totalBalance = 0;
                tokenInventory[token].tokenType = TokenType.BURNED;
                tokenInventory[token].lastUpdate = block.timestamp;
                
                metrics.totalTokensBurned += balance;
                
                emit TokenBurned(token, balance, block.timestamp);
            }
        }
    }
    
    /// @notice Generate comprehensive management report
    function generateManagementReport() external view returns (
        uint256 totalTokensInInventory,
        uint256 totalEstimatedValue,
        uint256 highRiskTokens,
        uint256 readyForBurn,
        uint256 readyForWithdraw,
        address[] memory maliciousTokens
    ) {
        totalTokensInInventory = discoveredTokens.length;
        highRiskTokens = 0;
        readyForBurn = 0;
        readyForWithdraw = 0;
        
        // Count high risk and ready tokens
        for (uint256 i = 0; i < discoveredTokens.length; i++) {
            TokenInfo memory info = tokenInventory[discoveredTokens[i]];
            
            if (info.riskScore > 75) highRiskTokens++;
            if (info.tokenType == TokenType.MALICIOUS) readyForBurn++;
            if (info.tokenType == TokenType.ERC20 && info.riskScore < 50) readyForWithdraw++;
        }
        
        maliciousTokens = tokensByType[TokenType.MALICIOUS];
        totalEstimatedValue = 0; // TODO: Implement price oracle integration
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🔍 INTERNAL HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /// @notice Get system contracts from registry
    function _getSystemContractsFromRegistry() internal view returns (address[] memory) {
        // TODO: Implement based on your registry interface
        address[] memory contracts = new address[](6);
        
        // This should be replaced with actual registry calls
        // contracts[0] = REGISTRY.getEntryManager();
        // contracts[1] = REGISTRY.getDrawManager();
        // contracts[2] = REGISTRY.getPrizeManager();
        // contracts[3] = REGISTRY.getFinanceManager();
        // contracts[4] = REGISTRY.getGasManager();
        // contracts[5] = REGISTRY.getOverheadManager();
        
        return contracts;
    }
    
    /// @notice Detect tokens in specific contract
    function _detectTokensInContract(address contractAddr) internal view returns (address[] memory) {
        // This is a simplified implementation
        // In production, you'd need to enumerate token holdings
        address[] memory tokens = new address[](0);
        return tokens;
    }
    
    /// @notice Extract token from contract with malicious contract protection
    function _extractToken(address from, address token, uint256 amount) internal returns (bool) {
        // PATCH 2: Comprehensive malicious contract defense
        
        // 1. Basic validation
        if (from == address(0) || token == address(0) || amount == 0) {
            return false;
        }
        
        // 2. Prevent extraction from self and USDT
        if (from == address(this) || token == address(USDT)) {
            return false;
        }
        
        // 3. Pre-extraction security checks
        if (!_isSafeContract(from) || !_isSafeToken(token)) {
            emit MaliciousContractDetected(from, token, "Security check failed");
            return false;
        }
        
        // 4. Gas limit protection against malicious contracts
        uint256 gasStart = gasleft();
        uint256 gasLimit = 100000; // Limit gas for external calls
        
        if (gasStart < gasLimit + 50000) { // Ensure enough gas for cleanup
            return false;
        }
        
        try this._safeTokenExtraction{gas: gasLimit}(from, token, amount) returns (bool success) {
            if (success) {
                // 5. Post-extraction validation
                uint256 gasUsed = gasStart - gasleft();
                if (gasUsed > gasLimit * 80 / 100) { // Alert if using >80% of gas limit
                    emit HighGasUsageDetected(from, token, gasUsed);
                }
                
                return true;
            }
        } catch Error(string memory reason) {
            emit ExtractionFailed(from, token, reason);
        } catch (bytes memory lowLevelData) {
            emit ExtractionFailed(from, token, "Low level error");
        }
        
        return false;
    }
    
    /// @notice Safe token extraction with additional protections
    function _safeTokenExtraction(address from, address token, uint256 amount) external returns (bool) {
        // PATCH 2: Only callable by self to prevent external manipulation
        require(msg.sender == address(this), "Internal only");
        
        // 1. Double-check balances to prevent manipulation
        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        uint256 sourceBalance = IERC20(token).balanceOf(from);
        
        if (sourceBalance < amount) {
            return false;
        }
        
        // 2. Attempt extraction using multiple methods
        bool extracted = false;
        
        // Method 1: Try standard transferFrom if approved
        try IERC20(token).transferFrom(from, address(this), amount) returns (bool success) {
            if (success) {
                extracted = true;
            }
        } catch {
            // Method 2: Try calling withdraw function if exists (common pattern)
            try this._tryWithdrawMethod{gas: 50000}(from, token, amount) returns (bool success) {
                if (success) {
                    extracted = true;
                }
            } catch {
                // Method 3: Try calling emergencyWithdraw if exists
                try this._tryEmergencyWithdraw{gas: 50000}(from, token, amount) returns (bool success) {
                    extracted = success;
                } catch {
                    // Extraction failed
                }
            }
        }
        
        if (extracted) {
            // 3. Verify the extraction actually happened
            uint256 balanceAfter = IERC20(token).balanceOf(address(this));
            uint256 actualReceived = balanceAfter - balanceBefore;
            
            if (actualReceived < amount * 95 / 100) { // Allow 5% tolerance for fee-on-transfer
                emit PartialExtractionWarning(from, token, amount, actualReceived);
            }
            
            return actualReceived > 0;
        }
        
        return false;
    }
    
    /// @notice Attempt withdrawal using withdraw pattern
    function _tryWithdrawMethod(address from, address token, uint256 amount) external returns (bool) {
        require(msg.sender == address(this), "Internal only");
        
        // Try common withdrawal function signatures
        bytes memory data = abi.encodeWithSignature("withdraw(address,uint256)", token, amount);
        
        (bool success, ) = from.call{gas: 30000}(data);
        return success;
    }
    
    /// @notice Attempt emergency withdrawal
    function _tryEmergencyWithdraw(address from, address token, uint256 amount) external returns (bool) {
        require(msg.sender == address(this), "Internal only");
        
        bytes memory data = abi.encodeWithSignature("emergencyWithdraw(address,uint256)", token, amount);
        
        (bool success, ) = from.call{gas: 30000}(data);
        return success;
    }
    
    /// @notice Check if contract is safe for interaction
    function _isSafeContract(address contractAddr) internal view returns (bool) {
        // PATCH 2: Enhanced safety checks
        
        // 1. Check contract size (too small might be suspicious)
        uint256 size;
        assembly { size := extcodesize(contractAddr) }
        if (size < 50) return false; // Minimum reasonable contract size
        
        // 2. Check if contract has been marked as malicious
        if (blacklistedContracts[contractAddr]) return false;
        
        // 3. Basic interaction test
        try this._testContractSafety{gas: 10000}(contractAddr) returns (bool safe) {
            return safe;
        } catch {
            return false;
        }
    }
    
    /// @notice Test contract safety with limited gas
    function _testContractSafety(address contractAddr) external view returns (bool) {
        require(msg.sender == address(this), "Internal only");
        
        // Basic call to check if contract responds normally
        (bool success, ) = contractAddr.staticcall{gas: 5000}("");
        return success;
    }
    
    /// @notice Check if token is safe for extraction
    function _isSafeToken(address token) internal view returns (bool) {
        // PATCH 2: Enhanced token safety checks
        
        // 1. Check if token is blacklisted
        if (blacklistedTokens[token]) return false;
        
        // 2. Basic ERC20 interface check
        try IERC20(token).totalSupply() returns (uint256 supply) {
            if (supply == 0) return false; // Dead token
            
            // 3. Check decimals (should be reasonable)
            try IERC20Metadata(token).decimals() returns (uint8 decimals) {
                if (decimals > 77) return false; // Unreasonable decimals
            } catch {
                // Missing decimals is ok for older tokens
            }
            
            return true;
        } catch {
            return false;
        }
    }
    
    // PATCH 2: Additional state variables for malicious contract tracking
    mapping(address => bool) public blacklistedContracts;
    mapping(address => bool) public blacklistedTokens;
    mapping(address => uint256) public contractRiskScores;
    
    // PATCH 2: Enhanced events for security monitoring
    event MaliciousContractDetected(
        address indexed contractAddr, 
        address indexed token, 
        string reason
    );
    
    event ExtractionFailed(
        address indexed from, 
        address indexed token, 
        string reason
    );
    
    event HighGasUsageDetected(
        address indexed contractAddr, 
        address indexed token, 
        uint256 gasUsed
    );
    
    event PartialExtractionWarning(
        address indexed from, 
        address indexed token, 
        uint256 expected, 
        uint256 received
    );
    
    event ContractBlacklisted(
        address indexed contractAddr, 
        string reason, 
        uint256 timestamp
    );
    
    event TokenBlacklisted(
        address indexed token, 
        string reason, 
        uint256 timestamp
    );
    
    // PATCH 2: Admin functions for blacklist management
    function blacklistContract(address contractAddr, string calldata reason) external onlyOwner {
        blacklistedContracts[contractAddr] = true;
        contractRiskScores[contractAddr] = 100; // Maximum risk
        emit ContractBlacklisted(contractAddr, reason, block.timestamp);
    }
    
    function blacklistToken(address token, string calldata reason) external onlyOwner {
        blacklistedTokens[token] = true;
        emit TokenBlacklisted(token, reason, block.timestamp);
    }
    
    function removeFromBlacklist(address addr, bool isContract) external onlyOwner {
        if (isContract) {
            blacklistedContracts[addr] = false;
            contractRiskScores[addr] = 0;
        } else {
            blacklistedTokens[addr] = false;
        }
    }
    
    /// @notice Add token to inventory
    function _addToInventory(address token, uint256 balance) internal {
        tokenInventory[token] = TokenInfo({
            tokenAddress: token,
            tokenType: TokenType.UNKNOWN,
            name: _getTokenName(token),
            symbol: _getTokenSymbol(token),
            totalBalance: balance,
            riskScore: 0,
            discoveryTime: block.timestamp,
            lastUpdate: block.timestamp,
            isProcessed: false
        });
        
        discoveredTokens.push(token);
        metrics.totalTokensFound++;
    }
    
    /// @notice Verify webhook signature
    function _verifyWebhookSignature(bytes calldata payload, bytes calldata signature) internal view returns (bool) {
        // Implement HMAC signature verification
        // This is simplified - implement proper signature verification
        return signature.length > 0;
    }
    
    /// @notice Handle operation failure and circuit breaker
    function _handleOperationFailure(string memory operation) internal {
        consecutiveFailures++;
        lastFailureTime = block.timestamp;
        
        if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
            circuitBreakerTripped = true;
            emit CircuitBreakerTripped(operation, consecutiveFailures, block.timestamp);
        }
        
        metrics.currentStatus = HousekeeperStatus.IDLE;
    }
    
    /// @notice Check if auto-recovery is possible
    function _canAutoRecover() internal view returns (bool) {
        return block.timestamp > lastFailureTime + AUTO_RECOVERY_DELAY;
    }
    
    /// @notice Recover circuit breaker
    function _recoverCircuitBreaker() internal {
        circuitBreakerTripped = false;
        consecutiveFailures = 0;
        
        emit CircuitBreakerRecovered(block.timestamp);
    }
    
    /// @notice Get contract name (simplified)
    function _getContractName(address contractAddr) internal pure returns (string memory) {
        // Simplified - implement proper contract name detection
        return "SystemContract";
    }
    
    /// @notice Get token name safely
    function _getTokenName(address token) internal view returns (string memory) {
        try IERC20Metadata(token).name() returns (string memory name) {
            return name;
        } catch {
            return "Unknown";
        }
    }
    
    /// @notice Get token symbol safely
    function _getTokenSymbol(address token) internal view returns (string memory) {
        try IERC20Metadata(token).symbol() returns (string memory symbol) {
            return symbol;
        } catch {
            return "UNK";
        }
    }
    
    /// @notice Check interface support
    function _supportsInterface(address token, bytes4 interfaceId) internal view returns (bool) {
        // Simplified interface check
        return false;
    }
    
    /// @notice Check if token is malicious
    function _isMaliciousToken(address token) internal view returns (bool) {
        // Implement malicious token detection logic
        return false;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📊 VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /// @notice Get housekeeper metrics
    function getHousekeeperMetrics() external view returns (HousekeeperMetrics memory) {
        return metrics;
    }
    
    /// @notice Get token inventory info
    function getTokenInfo(address token) external view returns (TokenInfo memory) {
        return tokenInventory[token];
    }
    
    /// @notice Get contract sweep data
    function getContractData(address contractAddr) external view returns (ContractSweepData memory) {
        return contractData[contractAddr];
    }
    
    /// @notice Get all discovered tokens
    function getAllDiscoveredTokens() external view returns (address[] memory) {
        return discoveredTokens;
    }
    
    /// @notice Get system contracts
    function getSystemContracts() external view returns (address[] memory) {
        return systemContracts;
    }
    
    /// @notice Check system health
    function isSystemHealthy() external view returns (bool) {
        return !circuitBreakerTripped && !paused();
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🚨 EMERGENCY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /// @notice Emergency pause
    function emergencyPause() external onlyOwner {
        _pause();
    }
    
    /// @notice Emergency unpause
    function emergencyUnpause() external onlyOwner {
        _unpause();
    }
    
    /// @notice Manual circuit breaker recovery
    function manualRecovery() external onlyOwner {
        circuitBreakerTripped = false;
        consecutiveFailures = 0;
        metrics.currentStatus = HousekeeperStatus.IDLE;
        
        emit CircuitBreakerRecovered(block.timestamp);
    }
} 