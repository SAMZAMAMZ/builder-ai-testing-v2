// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 MOCK USDT CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract MockUSDT is ERC20 {
    uint8 private _decimals;
    
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _decimals = decimals_;
    }
    
    function decimals() public view override returns (uint8) {
        return _decimals;
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 MOCK FINANCE MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

contract MockFinanceManager {
    uint256 public receiveDrawFundsCalls;
    uint256 public lastDrawId;
    uint256 public lastBatchNumber;
    uint256 public lastNetAmount;
    
    function receiveDrawFunds(
        uint256 drawId,
        uint256 batchNumber,
        uint256 netAmount
    ) external {
        receiveDrawFundsCalls++;
        lastDrawId = drawId;
        lastBatchNumber = batchNumber;
        lastNetAmount = netAmount;
    }
    
    function lastCall() external view returns (uint256, uint256, uint256) {
        return (lastDrawId, lastBatchNumber, lastNetAmount);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 MOCK PRIZE MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

contract MockPrizeManager {
    uint256 public confirmWinnerPaidCalls;
    uint256 public lastDrawId;
    
    function confirmWinnerPaid(uint256 drawId) external {
        confirmWinnerPaidCalls++;
        lastDrawId = drawId;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 MOCK DRAW MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

contract MockDrawManager {
    mapping(uint256 => address[]) private playerRegistries;
    
    function setPlayerRegistry(uint256 drawId, address[] memory players) external {
        playerRegistries[drawId] = players;
    }
    
    function getPlayerRegistry(uint256 drawId) external view returns (
        address[] memory players,
        uint256 playerCount
    ) {
        players = playerRegistries[drawId];
        playerCount = players.length;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 MOCK LOTTERY REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

contract MockLotteryRegistry {
    address public entryGate;
    address public drawManager;
    address public prizeManager;
    address public financeManager;
    address public quarantineVault;
    address public overheadManager;
    address public gasManager;
    
    function setEntryGate(address _entryGate) external {
        entryGate = _entryGate;
    }
    
    function setDrawManager(address _drawManager) external {
        drawManager = _drawManager;
    }
    
    function setPrizeManager(address _prizeManager) external {
        prizeManager = _prizeManager;
    }
    
    function setFinanceManager(address _financeManager) external {
        financeManager = _financeManager;
    }
    
    function setQuarantineVault(address _quarantineVault) external {
        quarantineVault = _quarantineVault;
    }
    
    function setOverheadManager(address _overheadManager) external {
        overheadManager = _overheadManager;
    }
    
    function setGasManager(address _gasManager) external {
        gasManager = _gasManager;
    }
}
