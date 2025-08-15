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
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 MOCK PRIZE MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

contract MockPrizeManager {
    uint256 public receivePrizeFundsCalls;
    uint256 public lastDrawId;
    uint256 public lastBatchNumber;
    uint256 public lastAmount;
    
    function receivePrizeFunds(
        uint256 drawId,
        uint256 batchNumber,
        uint256 amount
    ) external {
        receivePrizeFundsCalls++;
        lastDrawId = drawId;
        lastBatchNumber = batchNumber;
        lastAmount = amount;
    }
    
    function lastCall() external view returns (uint256, uint256, uint256) {
        return (lastDrawId, lastBatchNumber, lastAmount);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 MOCK GAS MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

contract MockGasManager {
    uint256 public receiveGasFundsCalls;
    uint256 public lastDrawId;
    uint256 public lastBatchNumber;
    uint256 public lastAmount;
    
    function receiveGasFunds(
        uint256 drawId,
        uint256 batchNumber,
        uint256 amount
    ) external {
        receiveGasFundsCalls++;
        lastDrawId = drawId;
        lastBatchNumber = batchNumber;
        lastAmount = amount;
    }
    
    function lastCall() external view returns (uint256, uint256, uint256) {
        return (lastDrawId, lastBatchNumber, lastAmount);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 MOCK OVERHEAD MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

contract MockOverheadManager {
    uint256 public receiveOverheadFundsCalls;
    uint256 public lastDrawId;
    uint256 public lastBatchNumber;
    uint256 public lastAmount;
    
    function receiveOverheadFunds(
        uint256 drawId,
        uint256 batchNumber,
        uint256 amount
    ) external {
        receiveOverheadFundsCalls++;
        lastDrawId = drawId;
        lastBatchNumber = batchNumber;
        lastAmount = amount;
    }
    
    function lastCall() external view returns (uint256, uint256, uint256) {
        return (lastDrawId, lastBatchNumber, lastAmount);
    }
}
