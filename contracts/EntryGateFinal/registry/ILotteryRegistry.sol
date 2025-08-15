// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ILotteryRegistry
 * @dev Interface for the central lottery registry system
 */
interface ILotteryRegistry {
    function entryManager() external view returns (address);
    function drawManager() external view returns (address);
    function prizeManager() external view returns (address);
    function financeManager() external view returns (address);
    function quarantineVault() external view returns (address);
    function overheadManager() external view returns (address);
    function gasManager() external view returns (address);
}
