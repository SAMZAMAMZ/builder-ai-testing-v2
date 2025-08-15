// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FinanceManagerFinal is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable POLYGON_USDT;
    
    uint256 public constant MINIMUM_FUND_THRESHOLD = 860 * 10**6;
    uint256 public constant PRIZE_AMOUNT = 800 * 10**6;
    uint256 public constant GAS_AMOUNT = 25 * 10**6;
    string public constant CONTRACT_NAME = "FinanceManagerFinal";
    uint256 public immutable DEPLOYMENT_TIME;
    
    address public entryManagerAddress;
    address public prizeManagerAddress;
    address public gasManagerAddress;
    address public overheadManagerAddress;
    
    uint256 public totalDrawsProcessed;
    uint256 public totalFundsProcessed;
    uint256 public totalPrizesPaid;
    uint256 public totalGasPaid;
    uint256 public totalOverheadPaid;
    
    struct DrawFinancials {
        uint256 drawId;
        uint256 batchNumber;
        uint256 totalReceived;
        uint256 prizeAmount;
        uint256 gasAmount;
        uint256 overheadAmount;
        bool fundsReceived;
        bool prizePaid;
        bool gasPaid;
        bool overheadPaid;
        bool distributionComplete;
        uint256 distributionTimestamp;
        string failureReason;
    }
    
    mapping(uint256 => DrawFinancials) public drawFinancials;
    
    event DrawFundsReceived(uint256 indexed drawId, uint256 indexed batchNumber, uint256 totalAmount, address indexed from);
    event PrizeFundsPaid(uint256 indexed drawId, uint256 indexed batchNumber, uint256 prizeAmount, address indexed prizeManager, string message);
    event GasFundsPaid(uint256 indexed drawId, uint256 indexed batchNumber, uint256 gasAmount, address indexed gasManager, string message);
    event OverheadFundsPaid(uint256 indexed drawId, uint256 indexed batchNumber, uint256 overheadAmount, address indexed overheadManager, string message);
    event DistributionComplete(uint256 indexed drawId, uint256 indexed batchNumber, uint256 totalDistributed);
    event DistributionFailed(uint256 indexed drawId, string reason);
    event ManagerUpdated(string managerType, address oldAddress, address newAddress);
    
    error OnlyEntryManager();
    error InsufficientFunds(uint256 actual, uint256 required);
    error InvalidAddress(string parameter);
    error ExternalCallFailed(string target);
    error DistributionAlreadyComplete(uint256 drawId);
    
    constructor(address _polygonUSDT, address _owner) Ownable(_owner) {
        require(_polygonUSDT != address(0), "Invalid USDT address");
        require(_owner != address(0), "Invalid owner address");
        POLYGON_USDT = IERC20(_polygonUSDT);
        DEPLOYMENT_TIME = block.timestamp;
    }
    
    function setEntryManager(address _entryManager) external onlyOwner {
        require(_entryManager != address(0), "Invalid EntryManager address");
        address oldAddress = entryManagerAddress;
        entryManagerAddress = _entryManager;
        emit ManagerUpdated("EntryManager", oldAddress, _entryManager);
    }
    
    function setPrizeManager(address _prizeManager) external onlyOwner {
        require(_prizeManager != address(0), "Invalid PrizeManager address");
        address oldAddress = prizeManagerAddress;
        prizeManagerAddress = _prizeManager;
        emit ManagerUpdated("PrizeManager", oldAddress, _prizeManager);
    }
    
    function setGasManager(address _gasManager) external onlyOwner {
        require(_gasManager != address(0), "Invalid GasManager address");
        address oldAddress = gasManagerAddress;
        gasManagerAddress = _gasManager;
        emit ManagerUpdated("GasManager", oldAddress, _gasManager);
    }
    
    function setOverheadManager(address _overheadManager) external onlyOwner {
        require(_overheadManager != address(0), "Invalid OverheadManager address");
        address oldAddress = overheadManagerAddress;
        overheadManagerAddress = _overheadManager;
        emit ManagerUpdated("OverheadManager", oldAddress, _overheadManager);
    }
    
    modifier onlyEntryManager() {
        if (msg.sender != entryManagerAddress) revert OnlyEntryManager();
        _;
    }
    
    modifier validManagerAddresses() {
        require(prizeManagerAddress != address(0), "PrizeManager not set");
        require(gasManagerAddress != address(0), "GasManager not set");
        require(overheadManagerAddress != address(0), "OverheadManager not set");
        _;
    }
    
    function receiveDrawFunds(uint256 drawId, uint256 batchNumber, uint256 netAmount) 
        external 
        nonReentrant 
        onlyEntryManager 
        validManagerAddresses 
    {
        if (drawFinancials[drawId].fundsReceived) {
            revert DistributionAlreadyComplete(drawId);
        }
        
        if (netAmount < MINIMUM_FUND_THRESHOLD) {
            revert InsufficientFunds(netAmount, MINIMUM_FUND_THRESHOLD);
        }
        
        POLYGON_USDT.safeTransferFrom(msg.sender, address(this), netAmount);
        
        DrawFinancials storage financials = drawFinancials[drawId];
        financials.drawId = drawId;
        financials.batchNumber = batchNumber;
        financials.totalReceived = netAmount;
        financials.prizeAmount = PRIZE_AMOUNT;
        financials.gasAmount = GAS_AMOUNT;
        financials.overheadAmount = netAmount - PRIZE_AMOUNT - GAS_AMOUNT;
        financials.fundsReceived = true;
        financials.distributionTimestamp = block.timestamp;
        
        totalFundsProcessed += netAmount;
        emit DrawFundsReceived(drawId, batchNumber, netAmount, msg.sender);
        
        _distributeAllFundsSecure(drawId);
    }
    
    function _distributeAllFundsSecure(uint256 drawId) internal {
        bool allSuccess = true;
        string memory failureReason = "";
        
        try this._payPrizeManagerSecure(drawId) {
        } catch Error(string memory reason) {
            allSuccess = false;
            failureReason = string(abi.encodePacked("Prize: ", reason));
        } catch {
            allSuccess = false;
            failureReason = "Prize: Unknown error";
        }
        
        try this._payGasManagerSecure(drawId) {
        } catch Error(string memory reason) {
            allSuccess = false;
            failureReason = string(abi.encodePacked(failureReason, " Gas: ", reason));
        } catch {
            allSuccess = false;
            failureReason = string(abi.encodePacked(failureReason, " Gas: Unknown error"));
        }
        
        try this._sweepToOverheadManagerSecure(drawId) {
        } catch Error(string memory reason) {
            allSuccess = false;
            failureReason = string(abi.encodePacked(failureReason, " Overhead: ", reason));
        } catch {
            allSuccess = false;
            failureReason = string(abi.encodePacked(failureReason, " Overhead: Unknown error"));
        }
        
        DrawFinancials storage financials = drawFinancials[drawId];
        
        if (allSuccess) {
            financials.distributionComplete = true;
            totalDrawsProcessed++;
            emit DistributionComplete(drawId, financials.batchNumber, financials.totalReceived);
        } else {
            financials.failureReason = failureReason;
            emit DistributionFailed(drawId, failureReason);
        }
    }
    
    function _payPrizeManagerSecure(uint256 drawId) external {
        require(msg.sender == address(this), "Internal function only");
        _payPrizeManager(drawId);
    }
    
    function _payGasManagerSecure(uint256 drawId) external {
        require(msg.sender == address(this), "Internal function only");
        _payGasManager(drawId);
    }
    
    function _sweepToOverheadManagerSecure(uint256 drawId) external {
        require(msg.sender == address(this), "Internal function only");
        _sweepToOverheadManager(drawId);
    }
    
    function _payPrizeManager(uint256 drawId) internal {
        DrawFinancials storage financials = drawFinancials[drawId];
        
        POLYGON_USDT.safeTransfer(prizeManagerAddress, PRIZE_AMOUNT);
        
        (bool success, bytes memory returnData) = prizeManagerAddress.call(
            abi.encodeWithSignature("receivePrizeFunds(uint256,uint256,uint256)", drawId, financials.batchNumber, PRIZE_AMOUNT)
        );
        
        if (!success) {
            string memory revertReason = "Call failed";
            if (returnData.length > 0) {
                assembly {
                    revertReason := add(returnData, 0x20)
                }
            }
            revert ExternalCallFailed(string(abi.encodePacked("PrizeManager: ", revertReason)));
        }
        
        financials.prizePaid = true;
        totalPrizesPaid += PRIZE_AMOUNT;
        
        emit PrizeFundsPaid(drawId, financials.batchNumber, PRIZE_AMOUNT, prizeManagerAddress, "Prize for DrawID");
    }
    
    function _payGasManager(uint256 drawId) internal {
        DrawFinancials storage financials = drawFinancials[drawId];
        
        POLYGON_USDT.safeTransfer(gasManagerAddress, GAS_AMOUNT);
        
        (bool success, bytes memory returnData) = gasManagerAddress.call(
            abi.encodeWithSignature("receiveGasFunds(uint256,uint256,uint256)", drawId, financials.batchNumber, GAS_AMOUNT)
        );
        
        if (!success) {
            string memory revertReason = "Call failed";
            if (returnData.length > 0) {
                assembly {
                    revertReason := add(returnData, 0x20)
                }
            }
            revert ExternalCallFailed(string(abi.encodePacked("GasManager: ", revertReason)));
        }
        
        financials.gasPaid = true;
        totalGasPaid += GAS_AMOUNT;
        
        emit GasFundsPaid(drawId, financials.batchNumber, GAS_AMOUNT, gasManagerAddress, "Gas for DrawID");
    }
    
    function _sweepToOverheadManager(uint256 drawId) internal {
        DrawFinancials storage financials = drawFinancials[drawId];
        uint256 remainingBalance = POLYGON_USDT.balanceOf(address(this));
        
        if (remainingBalance > 0) {
            POLYGON_USDT.safeTransfer(overheadManagerAddress, remainingBalance);
            
            (bool success, bytes memory returnData) = overheadManagerAddress.call(
                abi.encodeWithSignature("receiveOverheadFunds(uint256,uint256,uint256)", drawId, financials.batchNumber, remainingBalance)
            );
            
            if (!success) {
                string memory revertReason = "Call failed";
                if (returnData.length > 0) {
                    assembly {
                        revertReason := add(returnData, 0x20)
                    }
                }
                revert ExternalCallFailed(string(abi.encodePacked("OverheadManager: ", revertReason)));
            }
            
            financials.overheadAmount = remainingBalance;
        }
        
        financials.overheadPaid = true;
        totalOverheadPaid += financials.overheadAmount;
        
        emit OverheadFundsPaid(drawId, financials.batchNumber, financials.overheadAmount, overheadManagerAddress, "Overhead for DrawID");
    }
    
    function validateManagerAddresses() external view returns (bool) {
        return (
            entryManagerAddress != address(0) &&
            prizeManagerAddress != address(0) &&
            gasManagerAddress != address(0) &&
            overheadManagerAddress != address(0)
        );
    }
    
    function getContractInfo() external view returns (
        string memory name,
        uint256 deploymentTime,
        uint256 minimumFunds,
        uint256 prizeAmount,
        uint256 gasAmount,
        uint256 totalProcessed,
        uint256 totalFunds,
        uint256 totalPrizes,
        uint256 totalGas,
        uint256 totalOverhead
    ) {
        return (
            CONTRACT_NAME,
            DEPLOYMENT_TIME,
            MINIMUM_FUND_THRESHOLD,
            PRIZE_AMOUNT,
            GAS_AMOUNT,
            totalDrawsProcessed,
            totalFundsProcessed,
            totalPrizesPaid,
            totalGasPaid,
            totalOverheadPaid
        );
    }
}
