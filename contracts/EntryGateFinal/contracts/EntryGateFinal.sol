// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./registry/ILotteryRegistry.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                              🎯 ENTRYGATEFINAL                              ║
 * ║                      THE DEFINITIVE TIER 2 ENTRY CONTRACT                   ║
 * ║                           *** PRODUCTION READY ***                          ║
 * ║                                                                              ║
 * ║  🔒 ULTRA-HARDENED SECURITY | 💰 EXACT FINANCIAL PRECISION                  ║
 * ║  🎯 TIER 2: 10 USDT ENTRY   | 🎁 0.75 USDT AFFILIATE FEE                  ║
 * ║  👥 100 PLAYERS PER BATCH   | 🚀 AUTONOMOUS OPERATION                       ║
 * ║  💡 SELF-REFERRAL ALLOWED   | 💸 900 USDT MINIMUM NET TRANSFER             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

interface IEntryManager {
    function receiveRegistryBatch(
        uint256 batchNumber,
        RegistryEntry[] calldata entries,
        uint256 netAmount
    ) external;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 REGISTRY ENTRY STRUCTURE (5-FIELD SYSTEM)
// ═══════════════════════════════════════════════════════════════════════════════
struct RegistryEntry {
    uint256 batchNumber;
    uint256 playerNumber;
    address playerWallet;
    address affiliateWallet;
    uint256 affiliateAmount;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 💰 BATCH FINANCIAL TRACKING
// ═══════════════════════════════════════════════════════════════════════════════
struct BatchFinancials {
    uint256 totalEntryFees;
    uint256 totalAffiliatePaid;
    uint256 netAmount;
}

contract EntryGateFinal is ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Address for address;

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎯 TIER 2 CONSTANTS (IMMUTABLE AFTER DEPLOYMENT)
    // ═══════════════════════════════════════════════════════════════════════════════
    
    IERC20 public immutable POLYGON_USDT;
    ILotteryRegistry public immutable REGISTRY;
    uint256 public immutable DEPLOYMENT_TIME;

    // Tier 2 Configuration
    uint256 public constant TIER_2_ENTRY_FEE = 10 * 10**6;        // 10 USDT (6 decimals)
    uint256 public constant TIER_2_MAX_PLAYERS = 100;             // 100 players per batch
    uint256 public constant TIER_2_AFFILIATE_FEE = 750000;        // 0.75 USDT (6 decimals)
    uint256 public constant MINIMUM_NET_TRANSFER = 900 * 10**6;   // 900 USDT minimum to EntryManager
    string public constant TIER_2_NAME = "Tier-2-Entry-10-USDT";
    
    // 🎯 PROMOTIONAL STRATEGY: Self-referral is ALLOWED and ENCOURAGED
    // Self-referral cost is covered in the entry fee structure
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // 📊 STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════════
    
    uint256 public currentBatch;
    uint256 public playersInCurrentBatch;

    // Registry storage: batchNumber => playerIndex => RegistryEntry
    mapping(uint256 => mapping(uint256 => RegistryEntry)) public batchRegistry;
    mapping(uint256 => uint256) public batchRegistryCount;

    // Financial tracking: batchNumber => BatchFinancials
    mapping(uint256 => BatchFinancials) public batchFinancials;
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // 📢 EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    event EntrySuccessful(
        address indexed player, 
        address indexed affiliate, 
        uint256 indexed batchNumber,
        uint256 playerNumber,
        uint256 entryFee,
        uint256 affiliateFee
    );

    event EntryFailed(
        address indexed player,
        string reason
    );
    
    event AffiliatePayment(
        address indexed affiliate, 
        uint256 amount,
        address indexed player,
        uint256 indexed batchNumber
    );

    event BatchClosed(
        uint256 indexed batchNumber,
        uint256 playerCount,
        uint256 totalEntryFees,
        uint256 totalAffiliatePaid,
        uint256 netAmount
    );

    event RegistryTransmitted(
        uint256 indexed batchNumber,
        address indexed entryManager,
        uint256 entryCount,
        uint256 netAmount
    );

    event BatchPurged(
        uint256 indexed batchNumber,
        uint256 entriesRemoved
    );

    event MinimumNetTransferValidation(
        uint256 indexed batchNumber,
        uint256 netAmount,
        uint256 minimumRequired,
        bool validationPassed
    );
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // 🔒 CUSTOM ERRORS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    error InvalidToken();
    error InsufficientPayment();
    error BatchFull();
    error BatchNotReady();
    error UnauthorizedPurge();
    error MinimumNetTransferNotMet(uint256 actual, uint256 required);
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // 🏗️ CONSTRUCTOR - TIER 2 CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════════
    
    constructor(address _polygonUSDT, address _registry) {
        require(_polygonUSDT != address(0), "Invalid USDT address");
        require(_registry != address(0), "Invalid registry address");

        POLYGON_USDT = IERC20(_polygonUSDT);
        REGISTRY = ILotteryRegistry(_registry);
        DEPLOYMENT_TIME = block.timestamp;

        // Initialize first batch
        currentBatch = 1;
        playersInCurrentBatch = 0;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎯 MODULE 1: ENTRY VALIDATION
    // ═══════════════════════════════════════════════════════════════════════════════

    function _validateEntry(address player, address affiliate) internal view {
        // Validate player address
        require(player != address(0), "Invalid player address");
        
        // Validate affiliate address (zero address not allowed, self-referral IS allowed)
        require(affiliate != address(0), "Invalid affiliate address");
        
        // Check batch capacity
        if (playersInCurrentBatch >= TIER_2_MAX_PLAYERS) {
            revert BatchFull();
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎯 MODULE 2: REGISTRY MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════════
    
    function _addToRegistry(
        uint256 batchNumber,
        address player,
        address affiliate,
        uint256 affiliateAmount
    ) internal {
        uint256 playerNumber = batchRegistryCount[batchNumber] + 1;
        
        RegistryEntry memory entry = RegistryEntry({
            batchNumber: batchNumber,
            playerNumber: playerNumber,
            playerWallet: player,
            affiliateWallet: affiliate,
            affiliateAmount: affiliateAmount
        });

        batchRegistry[batchNumber][playerNumber - 1] = entry;
        batchRegistryCount[batchNumber] = playerNumber;
    }

    function getBatchRegistry(uint256 batchNumber, uint256 index) 
        external view returns (RegistryEntry memory) {
        return batchRegistry[batchNumber][index];
    }

    function getBatchRegistryCount(uint256 batchNumber) 
        external view returns (uint256) {
        return batchRegistryCount[batchNumber];
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎯 MODULE 3: AFFILIATE PAYMENT
    // ═══════════════════════════════════════════════════════════════════════════════

    function _payAffiliate(address affiliate, address player, uint256 batchNumber) internal {
        POLYGON_USDT.safeTransfer(affiliate, TIER_2_AFFILIATE_FEE);
        
        emit AffiliatePayment(affiliate, TIER_2_AFFILIATE_FEE, player, batchNumber);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎯 MODULE 4: BATCH MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════════

    function _closeBatch(uint256 batchNumber) internal {
        BatchFinancials storage financials = batchFinancials[batchNumber];
        
        emit BatchClosed(
            batchNumber,
            playersInCurrentBatch,
            financials.totalEntryFees,
            financials.totalAffiliatePaid,
            financials.netAmount
        );

        // Validate minimum net transfer requirement
        if (financials.netAmount < MINIMUM_NET_TRANSFER) {
            emit MinimumNetTransferValidation(
                batchNumber,
                financials.netAmount,
                MINIMUM_NET_TRANSFER,
                false
            );
            revert MinimumNetTransferNotMet(financials.netAmount, MINIMUM_NET_TRANSFER);
        }

        emit MinimumNetTransferValidation(
            batchNumber,
            financials.netAmount,
            MINIMUM_NET_TRANSFER,
            true
        );

        // Start new batch
        currentBatch++;
        playersInCurrentBatch = 0;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎯 MODULE 5: FINANCIAL CALCULATION
    // ═══════════════════════════════════════════════════════════════════════════════
    
    function _updateBatchFinancials(uint256 batchNumber) internal {
        BatchFinancials storage financials = batchFinancials[batchNumber];
        financials.totalEntryFees += TIER_2_ENTRY_FEE;
        financials.totalAffiliatePaid += TIER_2_AFFILIATE_FEE;
        financials.netAmount = financials.totalEntryFees - financials.totalAffiliatePaid;
    }

    function getBatchFinancials(uint256 batchNumber) 
        external view returns (BatchFinancials memory) {
        return batchFinancials[batchNumber];
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎯 MODULE 6 & 7: REGISTRY & FUND TRANSMISSION
    // ═══════════════════════════════════════════════════════════════════════════════

    function _transmitBatch(uint256 batchNumber) internal {
        address entryManagerAddress = REGISTRY.entryManager();
        require(entryManagerAddress != address(0), "EntryManager not set");

        // Prepare registry entries array
        uint256 entryCount = batchRegistryCount[batchNumber];
        RegistryEntry[] memory entries = new RegistryEntry[](entryCount);
        
        for (uint256 i = 0; i < entryCount; i++) {
            entries[i] = batchRegistry[batchNumber][i];
        }

        // Get financial details
        BatchFinancials memory financials = batchFinancials[batchNumber];

        // Transfer NET amount to EntryManager
        POLYGON_USDT.safeTransfer(entryManagerAddress, financials.netAmount);

        // Send registry and financial data to EntryManager
        IEntryManager(entryManagerAddress).receiveRegistryBatch(
            batchNumber,
            entries,
            financials.netAmount
        );

        emit RegistryTransmitted(
            batchNumber,
            entryManagerAddress,
            entryCount,
            financials.netAmount
        );
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎯 MODULE 8: PURGE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════════
    
    function purgeBatch(uint256 batchNumber) external {
        address entryManagerAddress = REGISTRY.entryManager();
        require(msg.sender == entryManagerAddress, "Only EntryManager can purge");

        uint256 entryCount = batchRegistryCount[batchNumber];
        
        // Clear registry entries
        for (uint256 i = 0; i < entryCount; i++) {
            delete batchRegistry[batchNumber][i];
        }
        
        // Clear batch data
        delete batchRegistryCount[batchNumber];
        delete batchFinancials[batchNumber];

        emit BatchPurged(batchNumber, entryCount);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🚀 MAIN ENTRY FUNCTION - TIER 2 LOTTERY ENTRY
    // ═══════════════════════════════════════════════════════════════════════════════

    function enterLottery(address affiliate) external nonReentrant {
        try this._processEntry(msg.sender, affiliate) {
            emit EntrySuccessful(
                msg.sender,
                affiliate,
                currentBatch,
                playersInCurrentBatch,
                TIER_2_ENTRY_FEE,
                TIER_2_AFFILIATE_FEE
            );
        } catch Error(string memory reason) {
            emit EntryFailed(msg.sender, reason);
            revert(reason);
        } catch {
            emit EntryFailed(msg.sender, "Unknown error occurred");
            revert("Entry processing failed");
        }
    }

    function _processEntry(address player, address affiliate) external {
        require(msg.sender == address(this), "Internal function only");
        
        // Module 1: Validate entry
        _validateEntry(player, affiliate);

        // Transfer entry fee from player
        POLYGON_USDT.safeTransferFrom(player, address(this), TIER_2_ENTRY_FEE);

        // Module 3: Pay affiliate
        _payAffiliate(affiliate, player, currentBatch);

        // Module 2: Add to registry
        _addToRegistry(currentBatch, player, affiliate, TIER_2_AFFILIATE_FEE);

        // Module 5: Update financials
        _updateBatchFinancials(currentBatch);

        // Increment player count
        playersInCurrentBatch++;

        // Module 4: Check if batch should close
        if (playersInCurrentBatch >= TIER_2_MAX_PLAYERS) {
            uint256 batchToClose = currentBatch;
            _closeBatch(batchToClose);
            _transmitBatch(batchToClose);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🔍 VIEW FUNCTIONS FOR VALIDATION AND TESTING
    // ═══════════════════════════════════════════════════════════════════════════════

    function exportBatchForExamination(uint256 batchNumber) 
        external view returns (
            RegistryEntry[] memory entries,
            BatchFinancials memory financials,
            uint256 entryCount
        ) {
        entryCount = batchRegistryCount[batchNumber];
        entries = new RegistryEntry[](entryCount);
        
        for (uint256 i = 0; i < entryCount; i++) {
            entries[i] = batchRegistry[batchNumber][i];
        }
        
        financials = batchFinancials[batchNumber];
    }

    function getTier2Configuration() external pure returns (
        uint256 entryFee,
        uint256 maxPlayers,
        uint256 affiliateFee,
        uint256 minimumNetTransfer,
        string memory tierName
    ) {
        return (
            TIER_2_ENTRY_FEE,
            TIER_2_MAX_PLAYERS,
            TIER_2_AFFILIATE_FEE,
            MINIMUM_NET_TRANSFER,
            TIER_2_NAME
        );
    }

    function validateTier2Constants() external pure returns (bool) {
        return (
            TIER_2_ENTRY_FEE > 0 &&
            TIER_2_MAX_PLAYERS > 0 &&
            TIER_2_AFFILIATE_FEE > 0 &&
            TIER_2_AFFILIATE_FEE < TIER_2_ENTRY_FEE &&
            MINIMUM_NET_TRANSFER > 0
        );
    }

    function validateSelfReferralSupport() external pure returns (bool) {
        // Self-referral is explicitly allowed in this contract
        // No validation prevents player == affiliate
        return true;
    }

    function validateModularArchitecture() external pure returns (string[8] memory modules) {
        return [
            "Entry Validation",
            "Registry Management", 
            "Affiliate Payment",
            "Batch Management",
            "Financial Calculation",
            "Registry Transmission",
            "Fund Transmission",
            "Purge Management"
        ];
    }

    function getTierInfo() external view returns (
        uint256 currentBatchNumber,
        uint256 playersInBatch,
        uint256 slotsRemaining
    ) {
        currentBatchNumber = currentBatch;
        playersInBatch = playersInCurrentBatch;
        slotsRemaining = TIER_2_MAX_PLAYERS - playersInCurrentBatch;
    }

    /**
     * @dev Get total number of entries in current batch
     * @return Number of players in current batch
     */
    function getTotalEntries() external view returns (uint256) {
        return playersInCurrentBatch;
    }

    function getBatchStatus(uint256 batchNumber) external view returns (
        bool exists,
        uint256 playerCount,
        uint256 totalFees,
        uint256 netAmount,
        bool transmitted,
        bool purged
    ) {
        exists = batchRegistryCount[batchNumber] > 0;
        playerCount = batchRegistryCount[batchNumber];
        
        BatchFinancials memory financials = batchFinancials[batchNumber];
        totalFees = financials.totalEntryFees;
        netAmount = financials.netAmount;
        
        // Simple checks for transmitted/purged status
        transmitted = (batchNumber < currentBatch) && exists;
        purged = !exists && batchNumber < currentBatch;
    }

    function validateMinimumNetTransfer(uint256 batchNumber) external view returns (
        bool isValid,
        uint256 actualNet,
        uint256 minimumRequired
    ) {
        BatchFinancials memory financials = batchFinancials[batchNumber];
        actualNet = financials.netAmount;
        minimumRequired = MINIMUM_NET_TRANSFER;
        isValid = actualNet >= minimumRequired;
    }
}
