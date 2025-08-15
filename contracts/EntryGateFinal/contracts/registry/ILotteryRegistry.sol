// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ILotteryRegistry
 * @dev Interface for the central registry contract that manages all 1800-Lottery system contracts
 */
interface ILotteryRegistry {
    
    // Core contract addresses
    function drawManager() external view returns (address);
    function entryGate() external view returns (address);
    function entryManager() external view returns (address);
    function financeManager() external view returns (address);
    function gasManager() external view returns (address);
    function overheadManager() external view returns (address);
    function prizeManager() external view returns (address);
    function quarantineVault() external view returns (address);
    
    // Token addresses
    function usdtToken() external view returns (address);
    function linkToken() external view returns (address);
    
    // Chainlink VRF
    function vrfCoordinator() external view returns (address);
    function keyHash() external view returns (bytes32);
    function subscriptionId() external view returns (uint64);
    
    // System configuration
    function isAuthorizedContract(address _contract) external view returns (bool);
    function isSystemActive() external view returns (bool);
    function getSystemVersion() external view returns (uint256);
    
    // Administrative functions
    function updateContract(string calldata _name, address _address) external;
    function setSystemActive(bool _active) external;
    function addAuthorizedContract(address _contract) external;
    function removeAuthorizedContract(address _contract) external;
    
    // Events
    event ContractUpdated(string indexed name, address indexed oldAddress, address indexed newAddress);
    event SystemStatusChanged(bool active);
    event AuthorizedContractAdded(address indexed contractAddress);
    event AuthorizedContractRemoved(address indexed contractAddress);
} 