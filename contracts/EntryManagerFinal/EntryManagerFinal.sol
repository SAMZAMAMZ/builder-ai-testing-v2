// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./registry/ILotteryRegistry.sol";

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                           🎯 ENTRYMANAGERFINAL                              ║
 * ║                    THE DEFINITIVE ENTRY MANAGER CONTRACT                    ║
 * ║                          *** PRODUCTION READY ***                           ║
 * ║                                                                              ║
 * ║  🔒 ULTRA-HARDENED SECURITY | 💰 EXACT FUND MANAGEMENT                      ║
 * ║  📊 PLAYER REGISTRY SYSTEM  | 🎲 DRAW ID MANAGEMENT                         ║
 * ║  💸 900 USDT MINIMUM        | 🔄 AUTONOMOUS OPERATION                       ║
 * ║  🗑️ AUTOMATIC PURGING       | 🚀 SEAMLESS INTEGRATION                       ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

interface IFinanceManager {
    function receiveDrawFunds(
        uint256 drawId,
        uint256 batchNumber,
        uint256 netAmount
    ) external;
}

interface IDrawManager {
    function getPlayerRegistry(uint256 drawId) external view returns (
        address[] memory players,
        uint256 playerCount
    );
}

interface IPrizeManager {
    function confirmWinnerPaid(uint256 drawId) external;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 REGISTRY STRUCTURES
// ═══════════════════════════════════════════════════════════════════════════════
struct RegistryEntry {
    uint256 batchNumber;
    uint256 playerNumber;
    address playerWallet;
    address affiliateWallet;
    uint256 affiliateAmount;
}

struct DrawRegistry {
    uint256 drawId;
    uint256 batchNumber;
    uint256 playerCount;
    uint256 netAmount;
    address[] players;
    mapping(address => uint256) playerIndex; // player address => index in players array
    bool fundsReceived;
    bool fundsSent;
    bool registryComplete;
    bool purged;
}

contract EntryManagerFinal is ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Address for address;

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎯 IMMUTABLE CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════════

    IERC20 public immutable POLYGON_USDT;
    ILotteryRegistry public immutable REGISTRY;
    uint256 public immutable DEPLOYMENT_TIME;

    // Business constants
    uint256 public constant MINIMUM_FUND_THRESHOLD = 900 * 10**6;  // 900 USDT minimum
    uint256 public constant TIER_2_MAX_PLAYERS = 100;              // Expected players per batch
    string public constant CONTRACT_NAME = "EntryManagerFinal";

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📊 STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════════

    uint256 public currentDrawId;
    mapping(uint256 => DrawRegistry) public drawRegistries;

    // Authorized contract addresses (set via registry)
    address private entryGateAddress;
    address private financeManagerAddress;
    address private prizeManagerAddress;

    // ═══════════════════════════════════════════════════════════════════════════════
    // 📢 EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════

    event FundsReceived(
        uint256 indexed drawId,
        uint256 indexed batchNumber,
        uint256 netAmount,
        address indexed from
    );

    event RegistryReceived(
        uint256 indexed drawId,
        uint256 indexed batchNumber,
        uint256 playerCount,
        address indexed from
    );

    event DrawIdAssigned(
        uint256 indexed drawId,
        uint256 indexed batchNumber,
        uint256 playerCount
    );

    event FundsSentToFinanceManager(
        uint256 indexed drawId,
        uint256 indexed batchNumber,
        uint256 netAmount,
        address indexed financeManager
    );

    event EntryGatePurgeTriggered(
        uint256 indexed batchNumber,
        address indexed entryGate
    );

    event DrawRegistryPurged(
        uint256 indexed drawId,
        uint256 playerCount,
        address indexed triggeredBy
    );

    event MinimumFundValidation(
        uint256 indexed drawId,
        uint256 netAmount,
        uint256 minimumRequired,
        bool validationPassed
    );

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🔒 CUSTOM ERRORS
    // ═══════════════════════════════════════════════════════════════════════════════

    error OnlyEntryGate();
    error OnlyFinanceManager();
    error OnlyPrizeManager();
    error InvalidToken();
    error InsufficientFunds(uint256 actual, uint256 required);
    error InvalidPlayerCount(uint256 actual, uint256 expected);
    error DrawNotFound();
    error DrawAlreadyProcessed();
    error BatchMismatch();
    error RegistryNotComplete();
    error InvalidAddress();

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🏗️ CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════════

    constructor(address _polygonUSDT, address _registry) {
        require(_polygonUSDT != address(0), "Invalid USDT address");
        require(_registry != address(0), "Invalid registry address");

        POLYGON_USDT = IERC20(_polygonUSDT);
        REGISTRY = ILotteryRegistry(_registry);
        DEPLOYMENT_TIME = block.timestamp;

        // Initialize first draw
        currentDrawId = 1;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🔧 INITIALIZATION & ACCESS CONTROL
    // ═══════════════════════════════════════════════════════════════════════════════

    function updateContractAddresses() external {
        // Get addresses from registry (allowing updates if needed)
        entryGateAddress = REGISTRY.entryGate();
        financeManagerAddress = REGISTRY.financeManager();
        prizeManagerAddress = REGISTRY.prizeManager();
        
        require(entryGateAddress != address(0), "EntryGate not set");
        require(financeManagerAddress != address(0), "FinanceManager not set");
        require(prizeManagerAddress != address(0), "PrizeManager not set");
    }

    modifier onlyEntryGate() {
        if (msg.sender != entryGateAddress) revert OnlyEntryGate();
        _;
    }

    modifier onlyPrizeManager() {
        if (msg.sender != prizeManagerAddress) revert OnlyPrizeManager();
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎯 MODULE 1: RECEIVE FUNDS FROM ENTRYGATE
    // ═══════════════════════════════════════════════════════════════════════════════

    function receiveFunds(
        uint256 batchNumber,
        uint256 netAmount
    ) external nonReentrant onlyEntryGate {
        // Validate minimum fund threshold
        if (netAmount < MINIMUM_FUND_THRESHOLD) {
            emit MinimumFundValidation(currentDrawId, netAmount, MINIMUM_FUND_THRESHOLD, false);
            revert InsufficientFunds(netAmount, MINIMUM_FUND_THRESHOLD);
        }

        emit MinimumFundValidation(currentDrawId, netAmount, MINIMUM_FUND_THRESHOLD, true);

        // Transfer funds from EntryGate
        POLYGON_USDT.safeTransferFrom(msg.sender, address(this), netAmount);

        // Update draw registry
        DrawRegistry storage draw = drawRegistries[currentDrawId];
        draw.drawId = currentDrawId;
        draw.batchNumber = batchNumber;
        draw.netAmount = netAmount;
        draw.fundsReceived = true;

        emit FundsReceived(currentDrawId, batchNumber, netAmount, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎯 MODULE 2: SET UP DRAWID AND PLAYER REGISTRY
    // ═══════════════════════════════════════════════════════════════════════════════

    function receiveRegistryBatch(
        uint256 batchNumber,
        RegistryEntry[] calldata entries,
        uint256 netAmount
    ) external nonReentrant onlyEntryGate {
        // Validate player count matches expected
        if (entries.length != TIER_2_MAX_PLAYERS) {
            revert InvalidPlayerCount(entries.length, TIER_2_MAX_PLAYERS);
        }

        DrawRegistry storage draw = drawRegistries[currentDrawId];
        
        // Validate this matches the funds we received
        if (draw.batchNumber != batchNumber || draw.netAmount != netAmount) {
            revert BatchMismatch();
        }

        // Assign DRAWID to each player and build registry
        draw.playerCount = entries.length;
        
        for (uint256 i = 0; i < entries.length; i++) {
            address player = entries[i].playerWallet;
            draw.players.push(player);
            draw.playerIndex[player] = i;
        }

        draw.registryComplete = true;

        emit RegistryReceived(currentDrawId, batchNumber, entries.length, msg.sender);
        emit DrawIdAssigned(currentDrawId, batchNumber, entries.length);

        // Now that both funds and registry are complete, send to Finance Manager
        _sendToFinanceManager();
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎯 MODULE 3: SEND DRAW NET ENTRY FEES TO FINANCE MANAGER
    // ═══════════════════════════════════════════════════════════════════════════════

    function _sendToFinanceManager() internal {
        DrawRegistry storage draw = drawRegistries[currentDrawId];
        
        require(draw.fundsReceived && draw.registryComplete, "Draw not ready");
        require(!draw.fundsSent, "Funds already sent");

        // Transfer NET ENTRY FEES to Finance Manager
        POLYGON_USDT.safeTransfer(financeManagerAddress, draw.netAmount);

        // Notify Finance Manager with DRAWID, BATCH NUMBER, and NET AMOUNT
        IFinanceManager(financeManagerAddress).receiveDrawFunds(
            draw.drawId,
            draw.batchNumber,
            draw.netAmount
        );

        draw.fundsSent = true;

        emit FundsSentToFinanceManager(
            draw.drawId,
            draw.batchNumber,
            draw.netAmount,
            financeManagerAddress
        );

        // Trigger EntryGate purge
        _triggerEntryGatePurge(draw.batchNumber);

        // Prepare for next draw
        currentDrawId++;
    }

    function _triggerEntryGatePurge(uint256 batchNumber) internal {
        // Call EntryGate to purge batch data
        (bool success, ) = entryGateAddress.call(
            abi.encodeWithSignature("purgeBatch(uint256)", batchNumber)
        );
        
        require(success, "EntryGate purge failed");
        
        emit EntryGatePurgeTriggered(batchNumber, entryGateAddress);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎯 MODULE 4: HOLD PLAYER REGISTRY FOR DRAWMANAGER ACCESS
    // ═══════════════════════════════════════════════════════════════════════════════

    function getPlayerRegistry(uint256 drawId) external view returns (
        address[] memory players,
        uint256 playerCount
    ) {
        DrawRegistry storage draw = drawRegistries[drawId];
        
        if (!draw.registryComplete) revert RegistryNotComplete();
        
        return (draw.players, draw.playerCount);
    }

    function getDrawDetails(uint256 drawId) external view returns (
        uint256 batchNumber,
        uint256 playerCount,
        uint256 netAmount,
        bool fundsReceived,
        bool fundsSent,
        bool registryComplete,
        bool purged
    ) {
        DrawRegistry storage draw = drawRegistries[drawId];
        
        return (
            draw.batchNumber,
            draw.playerCount,
            draw.netAmount,
            draw.fundsReceived,
            draw.fundsSent,
            draw.registryComplete,
            draw.purged
        );
    }

    function getPlayerByIndex(uint256 drawId, uint256 index) external view returns (address) {
        DrawRegistry storage draw = drawRegistries[drawId];
        require(index < draw.players.length, "Invalid player index");
        return draw.players[index];
    }

    function getPlayerIndex(uint256 drawId, address player) external view returns (uint256) {
        DrawRegistry storage draw = drawRegistries[drawId];
        return draw.playerIndex[player];
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🎯 MODULE 5: PURGE PLAYER REGISTRY FOR DRAWID
    // ═══════════════════════════════════════════════════════════════════════════════

    function purgeDrawRegistry(uint256 drawId) external nonReentrant onlyPrizeManager {
        DrawRegistry storage draw = drawRegistries[drawId];
        
        if (draw.drawId == 0) revert DrawNotFound();
        if (draw.purged) revert DrawAlreadyProcessed();

        uint256 playerCount = draw.playerCount;

        // Clear the players array
        delete draw.players;
        
        // Mark as purged
        draw.purged = true;

        emit DrawRegistryPurged(drawId, playerCount, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 🔍 VIEW FUNCTIONS FOR VALIDATION AND MONITORING
    // ═══════════════════════════════════════════════════════════════════════════════

    function getCurrentDrawStatus() external view returns (
        uint256 drawId,
        uint256 batchNumber,
        uint256 playerCount,
        uint256 netAmount,
        bool fundsReceived,
        bool registryComplete,
        bool fundsSent
    ) {
        DrawRegistry storage draw = drawRegistries[currentDrawId];
        
        return (
            currentDrawId,
            draw.batchNumber,
            draw.playerCount,
            draw.netAmount,
            draw.fundsReceived,
            draw.registryComplete,
            draw.fundsSent
        );
    }

    function validateDrawReady(uint256 drawId) external view returns (
        bool isReady,
        string memory status
    ) {
        DrawRegistry storage draw = drawRegistries[drawId];
        
        if (!draw.fundsReceived) {
            return (false, "Funds not received");
        }
        if (!draw.registryComplete) {
            return (false, "Registry not complete");
        }
        if (draw.fundsSent) {
            return (false, "Already processed");
        }
        
        return (true, "Ready for draw");
    }

    function getContractInfo() external view returns (
        string memory name,
        uint256 deploymentTime,
        uint256 currentDraw,
        uint256 minimumFunds,
        uint256 maxPlayers
    ) {
        return (
            CONTRACT_NAME,
            DEPLOYMENT_TIME,
            currentDrawId,
            MINIMUM_FUND_THRESHOLD,
            TIER_2_MAX_PLAYERS
        );
    }

    function validateBusinessRules() external pure returns (bool) {
        return (
            MINIMUM_FUND_THRESHOLD >= 900 * 10**6 &&
            TIER_2_MAX_PLAYERS == 100
        );
    }

    function getModuleList() external pure returns (string[5] memory modules) {
        return [
            "Receive Funds from EntryGate",
            "Setup DrawID and Player Registry",
            "Send Draw Funds to Finance Manager",
            "Hold Player Registry for DrawManager",
            "Purge Player Registry on Winner Payment"
        ];
    }
}
