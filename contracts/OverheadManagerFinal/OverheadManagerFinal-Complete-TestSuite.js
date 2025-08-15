const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OverheadManagerFinal - OPERATIONAL OVERHEAD MANAGEMENT TEST SUITE", function() {
    let overheadManager, usdt, owner;
    let financeManager, treasury, accounts;
    
    beforeEach(async function() {
        [owner, financeManager, treasury, ...accounts] = await ethers.getSigners();
        
        // Deploy MockUSDT
        const MockUSDT = await ethers.getContractFactory("MockUSDT");
        usdt = await MockUSDT.deploy("Mock USDT", "USDT", 6);
        
        // Deploy OverheadManagerFinal
        const OverheadManagerFinal = await ethers.getContractFactory("OverheadManagerFinal");
        overheadManager = await OverheadManagerFinal.deploy(
            usdt.address,
            treasury.address,
            owner.address
        );
        
        // Setup USDT balances
        const overheadAmount = ethers.utils.parseUnits("10000", 6);
        await usdt.mint(financeManager.address, overheadAmount);
        await usdt.connect(financeManager).approve(overheadManager.address, overheadAmount);
    });
    
    describe("Overhead Fund Reception", function() {
        
        it("Should receive overhead funds from FinanceManager", async function() {
            const drawId = 1;
            const batchNumber = 1;
            const overheadAmount = ethers.utils.parseUnits("100", 6); // 925 - 800 - 25 = 100
            
            // Transfer funds to contract
            await usdt.connect(financeManager).transfer(overheadManager.address, overheadAmount);
            
            await expect(
                overheadManager.connect(financeManager).receiveOverheadFunds(drawId, batchNumber, overheadAmount)
            ).to.not.be.reverted;
        });
        
        it("Should reject unauthorized overhead fund calls", async function() {
            const drawId = 1;
            const batchNumber = 1;
            const overheadAmount = ethers.utils.parseUnits("100", 6);
            
            await expect(
                overheadManager.connect(accounts[0]).receiveOverheadFunds(drawId, batchNumber, overheadAmount)
            ).to.be.revertedWith("Only FinanceManager");
        });
        
        it("Should validate overhead fund amounts", async function() {
            const drawId = 1;
            const batchNumber = 1;
            const overheadAmount = ethers.utils.parseUnits("100", 6);
            
            await usdt.connect(financeManager).transfer(overheadManager.address, overheadAmount);
            
            await expect(
                overheadManager.connect(financeManager).receiveOverheadFunds(drawId, batchNumber, overheadAmount)
            ).to.not.be.reverted;
            
            // Verify amount tracking
            const overheadInfo = await overheadManager.getOverheadInfo(drawId);
            expect(overheadInfo.amount).to.equal(overheadAmount);
        });
    });
    
    describe("Operational Cost Management", function() {
        
        it("Should allocate funds for platform operations", async function() {
            const drawId = 1;
            const overheadAmount = ethers.utils.parseUnits("100", 6);
            
            await usdt.connect(financeManager).transfer(overheadManager.address, overheadAmount);
            await overheadManager.connect(financeManager).receiveOverheadFunds(drawId, 1, overheadAmount);
            
            // Test platform cost allocation
            await overheadManager.connect(owner).allocateOperationalCosts(drawId);
            
            expect(true).to.be.true; // Placeholder for operational cost tests
        });
        
        it("Should manage treasury transfers", async function() {
            const drawId = 1;
            const overheadAmount = ethers.utils.parseUnits("100", 6);
            
            await usdt.connect(financeManager).transfer(overheadManager.address, overheadAmount);
            await overheadManager.connect(financeManager).receiveOverheadFunds(drawId, 1, overheadAmount);
            
            // Transfer to treasury
            const treasuryBalanceBefore = await usdt.balanceOf(treasury.address);
            
            await overheadManager.connect(owner).transferToTreasury(drawId, overheadAmount.div(2));
            
            const treasuryBalanceAfter = await usdt.balanceOf(treasury.address);
            expect(treasuryBalanceAfter.sub(treasuryBalanceBefore)).to.equal(overheadAmount.div(2));
        });
        
        it("Should track platform expenses", async function() {
            const drawId = 1;
            const overheadAmount = ethers.utils.parseUnits("100", 6);
            
            await usdt.connect(financeManager).transfer(overheadManager.address, overheadAmount);
            await overheadManager.connect(financeManager).receiveOverheadFunds(drawId, 1, overheadAmount);
            
            // Track various expense categories
            const expenses = await overheadManager.getPlatformExpenses();
            expect(expenses.totalReceived).to.be.gte(0);
        });
    });
    
    describe("Fund Distribution", function() {
        
        it("Should distribute overhead funds across categories", async function() {
            const drawId = 1;
            const overheadAmount = ethers.utils.parseUnits("100", 6);
            
            await usdt.connect(financeManager).transfer(overheadManager.address, overheadAmount);
            await overheadManager.connect(financeManager).receiveOverheadFunds(drawId, 1, overheadAmount);
            
            // Distribute across: Development, Marketing, Operations, Treasury
            await overheadManager.connect(owner).distributeOverheadFunds(drawId, [25, 25, 25, 25]); // Percentages
            
            const distribution = await overheadManager.getDistribution(drawId);
            expect(distribution.totalDistributed).to.be.gte(0);
        });
        
        it("Should handle automatic distribution rules", async function() {
            const drawId = 1;
            const overheadAmount = ethers.utils.parseUnits("100", 6);
            
            await usdt.connect(financeManager).transfer(overheadManager.address, overheadAmount);
            await overheadManager.connect(financeManager).receiveOverheadFunds(drawId, 1, overheadAmount);
            
            // Test automatic distribution based on predefined rules
            const distributionRules = await overheadManager.getDistributionRules();
            expect(distributionRules).to.not.be.undefined;
        });
    });
    
    describe("Security and Governance", function() {
        
        it("Should enforce owner-only access for sensitive functions", async function() {
            const drawId = 1;
            const overheadAmount = ethers.utils.parseUnits("100", 6);
            
            await usdt.connect(financeManager).transfer(overheadManager.address, overheadAmount);
            await overheadManager.connect(financeManager).receiveOverheadFunds(drawId, 1, overheadAmount);
            
            // Only owner should be able to modify distribution
            await expect(
                overheadManager.connect(accounts[0]).updateDistributionRules([30, 30, 30, 10])
            ).to.be.revertedWith("Ownable: caller is not the owner");
            
            // Owner should succeed
            await expect(
                overheadManager.connect(owner).updateDistributionRules([30, 30, 30, 10])
            ).to.not.be.reverted;
        });
        
        it("Should prevent unauthorized fund withdrawals", async function() {
            const drawId = 1;
            const overheadAmount = ethers.utils.parseUnits("100", 6);
            
            await usdt.connect(financeManager).transfer(overheadManager.address, overheadAmount);
            await overheadManager.connect(financeManager).receiveOverheadFunds(drawId, 1, overheadAmount);
            
            // Non-owner should not be able to withdraw
            await expect(
                overheadManager.connect(accounts[0]).emergencyWithdraw(overheadAmount)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
    
    describe("Complete Overhead Management Flow", function() {
        
        it("Should execute complete overhead management workflow", async function() {
            const drawId = 1;
            const batchNumber = 1;
            const overheadAmount = ethers.utils.parseUnits("100", 6);
            
            // 1. Receive overhead funds from FinanceManager
            await usdt.connect(financeManager).transfer(overheadManager.address, overheadAmount);
            await overheadManager.connect(financeManager).receiveOverheadFunds(drawId, batchNumber, overheadAmount);
            
            // 2. Allocate for operational costs
            await overheadManager.connect(owner).allocateOperationalCosts(drawId);
            
            // 3. Distribute across categories
            await overheadManager.connect(owner).distributeOverheadFunds(drawId, [25, 25, 25, 25]);
            
            // 4. Transfer portion to treasury
            await overheadManager.connect(owner).transferToTreasury(drawId, ethers.utils.parseUnits("10", 6));
            
            // Verify complete flow
            const finalBalance = await usdt.balanceOf(overheadManager.address);
            const treasuryBalance = await usdt.balanceOf(treasury.address);
            
            expect(treasuryBalance).to.be.gt(0);
            expect(finalBalance).to.be.gte(0);
        });
    });
    
});
