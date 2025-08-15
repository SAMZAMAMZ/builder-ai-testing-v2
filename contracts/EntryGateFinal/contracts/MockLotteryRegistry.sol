// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MockLotteryRegistry {
    address public entryManager;
    
    function setEntryManager(address _entryManager) external {
        entryManager = _entryManager;
    }
    
    function getEntryManager() external view returns (address) {
        return entryManager;
    }
    
    // Mock function for any registry checks
    function isValidEntry(address player, address affiliate) external pure returns (bool) {
        return player != affiliate && affiliate != address(0);
    }
}
