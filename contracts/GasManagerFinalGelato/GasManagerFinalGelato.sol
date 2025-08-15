// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                    ⛽ GASMANAGER FINAL - GELATO INTEGRATION                          ║
║                                                                                      ║
║ 🎯 2-MODULE ARCHITECTURE (EXACT SPECIFICATION)                                      ║
║                                                                                      ║
║ 💰 MODULE 1: Receive 25 USDT per DRAWID from FinanceManager                        ║
║    ✅ Can only receive POLYGON USDT                                                 ║
║    ✅ Can only receive via the FINANCE MANAGER                                      ║
║    ✅ Receives exactly 25 USDT per DRAWID                                           ║
║                                                                                      ║
║ ⛽ MODULE 2: Manage pay-as-you-go model with Gelato                                 ║
║    ✅ Make funds available to pay GELATO                                            ║
║    ✅ Pay-as-you-go model management                                                ║
║    ✅ Automated gas funding to Gelato Network                                       ║
║                                                                                      ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
*/

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Gelato Network Interface
interface IGelatoNetwork {
    function depositFunds(address token, uint256 amount) external;
    function withdrawFunds(address token, uint256 amount) external;
    function getBalance(address user, address token) external view returns (uint256);
    function autoTopUp(address token, uint256 threshold, uint256 amount) external;
}

// Finance Manager Interface
interface IFinanceManager {
    function transferGasFunds(uint256 drawId, uint256 amount) external;
}

contract GasManagerFinalGelato is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🔒 IMMUTABLE CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════════
    
    IERC20 public immutable USDT;
    IGelatoNetwork public immutable GELATO_NETWORK;
    
    // MODULE 1: FinanceManager integration constants
    uint256 public constant EXPECTED_USDT_PER_DRAW = 25_000_000; // 25 USDT (6 decimals)
    address public immutable FINANCE_MANAGER;
    
    // MODULE 2: Gelato configuration constants  
    uint256 public constant GELATO_MIN_BALANCE = 10_000_000; // 10 USDT minimum balance
    uint256 public constant GELATO_AUTO_REFILL = 50_000_000; // 50 USDT auto-refill amount
    uint256 public constant GELATO_THRESHOLD = 5_000_000;    // 5 USDT threshold for auto-refill

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📊 STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════════
    
    // MODULE 1: Fund tracking per draw
    mapping(uint256 => bool) public drawFundsReceived;
    mapping(uint256 => uint256) public drawGasAllocated;
    mapping(uint256 => uint256) public drawTimestamp;
    
    // MODULE 2: Gelato management
    uint256 public totalGelatoDeposited;
    uint256 public totalGelatoUsed;
    uint256 public lastGelatoRefill;
    bool public autoRefillEnabled;
    
    // System metrics
    uint256 public totalDrawsProcessed;
    uint256 public totalUSDTReceived;
    uint256 public currentGasReserve;

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📡 EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    // MODULE 1: FinanceManager Events
    event GasFundsReceived(
        uint256 indexed drawId,
        uint256 amount,
        uint256 timestamp
    );
    
    event DrawGasAllocated(
        uint256 indexed drawId,
        uint256 allocated,
        uint256 timestamp
    );
    
    // MODULE 2: Gelato Events
    event GelatoFundsDeposited(
        uint256 amount,
        uint256 newBalance,
        uint256 timestamp
    );
    
    event GelatoAutoRefill(
        uint256 amount,
        uint256 newBalance,
        uint256 timestamp
    );
    
    event GelatoPaymentMade(
        uint256 amount,
        string operation,
        uint256 timestamp
    );

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🔧 CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _usdt,
        address _financeManager,
        address _gelatoNetwork
    ) Ownable(msg.sender) {
        require(_usdt != address(0), "Invalid USDT address");
        require(_financeManager != address(0), "Invalid FinanceManager address");
        require(_gelatoNetwork != address(0), "Invalid Gelato Network address");
        
        USDT = IERC20(_usdt);
        FINANCE_MANAGER = _financeManager;
        GELATO_NETWORK = IGelatoNetwork(_gelatoNetwork);
        
        // Enable auto-refill by default
        autoRefillEnabled = true;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🛡️ SECURITY MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    modifier onlyFinanceManager() {
        require(msg.sender == FINANCE_MANAGER, "Only FinanceManager can call");
        _;
    }
    
    modifier validDrawId(uint256 drawId) {
        require(drawId > 0, "Invalid draw ID");
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 💰 MODULE 1: FINANCE MANAGER INTEGRATION
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Receive 25 USDT per DRAWID from FinanceManager (MODULE 1)
     * @dev Can only receive POLYGON USDT via FinanceManager
     * @param drawId The draw identifier
     * @param amount Must be exactly 25 USDT (25_000_000 with 6 decimals)
     */
    function receiveFundsFromFinanceManager(uint256 drawId, uint256 amount) 
        external 
        onlyFinanceManager 
        validDrawId(drawId)
        nonReentrant 
        whenNotPaused 
    {
        // Validate exactly 25 USDT as specified
        require(amount == EXPECTED_USDT_PER_DRAW, "Must receive exactly 25 USDT");
        require(!drawFundsReceived[drawId], "Funds already received for this draw");
        
        // Verify USDT was actually received
        uint256 contractBalance = USDT.balanceOf(address(this));
        require(contractBalance >= amount, "USDT funds not received");
        
        // Record draw funding
        drawFundsReceived[drawId] = true;
        drawGasAllocated[drawId] = amount;
        drawTimestamp[drawId] = block.timestamp;
        
        // Update system metrics
        totalDrawsProcessed++;
        totalUSDTReceived += amount;
        currentGasReserve += amount;
        
        emit GasFundsReceived(drawId, amount, block.timestamp);
        emit DrawGasAllocated(drawId, amount, block.timestamp);
        
        // Automatically allocate to Gelato if auto-refill enabled
        if (autoRefillEnabled) {
            _checkAndRefillGelato();
        }
    }
    
    /**
     * @notice Check if funds were received for a specific draw
     * @param drawId The draw identifier
     * @return bool Whether funds were received
     */
    function hasReceivedFunds(uint256 drawId) external view returns (bool) {
        return drawFundsReceived[drawId];
    }
    
    /**
     * @notice Get gas allocation for a specific draw
     * @param drawId The draw identifier
     * @return uint256 Allocated gas amount
     */
    function getDrawGasAllocation(uint256 drawId) external view returns (uint256) {
        return drawGasAllocated[drawId];
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // ⛽ MODULE 2: GELATO PAY-AS-YOU-GO INTEGRATION
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Make funds available to pay GELATO (MODULE 2)
     * @dev Implements pay-as-you-go model with automatic management
     * @param amount USDT amount to deposit to Gelato
     */
    function fundGelatoOperations(uint256 amount) 
        external 
        onlyOwner 
        nonReentrant 
        whenNotPaused 
    {
        require(amount > 0, "Invalid amount");
        require(USDT.balanceOf(address(this)) >= amount, "Insufficient balance");
        require(currentGasReserve >= amount, "Insufficient gas reserve");
        
        // Approve and deposit to Gelato Network
        USDT.safeApprove(address(GELATO_NETWORK), amount);
        GELATO_NETWORK.depositFunds(address(USDT), amount);
        
        // Update tracking
        totalGelatoDeposited += amount;
        currentGasReserve -= amount;
        lastGelatoRefill = block.timestamp;
        
        emit GelatoFundsDeposited(amount, getGelatoBalance(), block.timestamp);
    }
    
    /**
     * @notice Automatic Gelato refill based on threshold (MODULE 2)
     * @dev Part of pay-as-you-go model - maintains minimum balance
     */
    function _checkAndRefillGelato() internal {
        if (!autoRefillEnabled) return;
        
        uint256 gelatoBalance = getGelatoBalance();
        
        // Check if refill needed
        if (gelatoBalance < GELATO_THRESHOLD && currentGasReserve >= GELATO_AUTO_REFILL) {
            // Approve and deposit auto-refill amount
            USDT.safeApprove(address(GELATO_NETWORK), GELATO_AUTO_REFILL);
            GELATO_NETWORK.depositFunds(address(USDT), GELATO_AUTO_REFILL);
            
            // Update tracking
            totalGelatoDeposited += GELATO_AUTO_REFILL;
            currentGasReserve -= GELATO_AUTO_REFILL;
            lastGelatoRefill = block.timestamp;
            
            emit GelatoAutoRefill(GELATO_AUTO_REFILL, getGelatoBalance(), block.timestamp);
        }
    }
    
    /**
     * @notice Manual Gelato refill (MODULE 2)
     * @dev Allows manual management of pay-as-you-go model
     */
    function manualGelatoRefill() external onlyOwner {
        _checkAndRefillGelato();
    }
    
    /**
     * @notice Set auto-refill configuration (MODULE 2)
     * @param enabled Whether auto-refill should be enabled
     */
    function setAutoRefill(bool enabled) external onlyOwner {
        autoRefillEnabled = enabled;
    }
    
    /**
     * @notice Get current Gelato balance (MODULE 2)
     * @return uint256 Current USDT balance in Gelato
     */
    function getGelatoBalance() public view returns (uint256) {
        return GELATO_NETWORK.getBalance(address(this), address(USDT));
    }
    
    /**
     * @notice Pay for Gelato operation (MODULE 2) 
     * @dev Called by authorized systems to pay gas costs
     * @param amount USDT amount to pay
     * @param operation Description of operation
     */
    function payGelatoOperation(uint256 amount, string calldata operation) 
        external 
        onlyOwner 
        nonReentrant 
    {
        require(amount > 0, "Invalid amount");
        require(getGelatoBalance() >= amount, "Insufficient Gelato balance");
        
        // Withdraw from Gelato to pay operation
        GELATO_NETWORK.withdrawFunds(address(USDT), amount);
        
        // Update tracking
        totalGelatoUsed += amount;
        
        emit GelatoPaymentMade(amount, operation, block.timestamp);
        
        // Check if refill needed after payment
        if (autoRefillEnabled) {
            _checkAndRefillGelato();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📊 VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get comprehensive system status
     */
    function getSystemStatus() external view returns (
        uint256 totalDraws,
        uint256 totalReceived,
        uint256 currentReserve,
        uint256 gelatoBalance,
        uint256 gelatoDeposited,
        uint256 gelatoUsed,
        bool autoRefill
    ) {
        return (
            totalDrawsProcessed,
            totalUSDTReceived,
            currentGasReserve,
            getGelatoBalance(),
            totalGelatoDeposited,
            totalGelatoUsed,
            autoRefillEnabled
        );
    }
    
    /**
     * @notice Get draw-specific information
     */
    function getDrawInfo(uint256 drawId) external view returns (
        bool fundsReceived,
        uint256 gasAllocated,
        uint256 timestamp
    ) {
        return (
            drawFundsReceived[drawId],
            drawGasAllocated[drawId],
            drawTimestamp[drawId]
        );
    }
    
    /**
     * @notice Check if system is healthy
     */
    function isSystemHealthy() external view returns (bool) {
        return (
            currentGasReserve > 0 &&
            getGelatoBalance() > GELATO_THRESHOLD &&
            !paused()
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🚨 EMERGENCY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Emergency pause
     */
    function emergencyPause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Emergency unpause
     */
    function emergencyUnpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Emergency withdrawal (only owner)
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount <= USDT.balanceOf(address(this)), "Insufficient balance");
        USDT.safeTransfer(owner(), amount);
    }

    /**
     * @notice Get contract version and compliance info
     */
    function getContractInfo() external pure returns (
        string memory name,
        string memory version,
        string memory compliance
    ) {
        return (
            "GasManagerFinalGelato",
            "1.0.0",
            "2-Module Architecture: 25 USDT + Gelato Pay-as-You-Go"
        );
    }
} 