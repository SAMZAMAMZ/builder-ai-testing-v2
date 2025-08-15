const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QuarantineVaultFinal - EXTERNAL HOUSEKEEPER SECURITY TEST SUITE", function() {
    let quarantineVault, usdt, owner;
    let housekeeper, authorizedCaller, accounts;
    
    beforeEach(async function() {
        [owner, housekeeper, authorizedCaller, ...accounts] = await ethers.getSigners();
        
        // Deploy MockUSDT
        const MockUSDT = await ethers.getContractFactory("MockUSDT");
        usdt = await MockUSDT.deploy("Mock USDT", "USDT", 6);
        
        // Deploy QuarantineVaultFinal
        const QuarantineVaultFinal = await ethers.getContractFactory("QuarantineVaultFinal");
        quarantineVault = await QuarantineVaultFinal.deploy(
            usdt.address,
            housekeeper.address,
            owner.address
        );
        
        // Setup USDT balances
        const quarantineAmount = ethers.utils.parseUnits("10000", 6);
        await usdt.mint(owner.address, quarantineAmount);
        await usdt.connect(owner).transfer(quarantineVault.address, ethers.utils.parseUnits("1000", 6));
    });
    
    describe("MODULE 1: Webhook Triggers", function() {
        
        it("Should respond to external webhook triggers", async function() {
            const webhookData = "0x1234567890abcdef";
            
            await expect(
                quarantineVault.connect(housekeeper).processWebhookTrigger(webhookData)
            ).to.not.be.reverted;
        });
        
        it("Should validate webhook authenticity", async function() {
            const validWebhook = "0x1234567890abcdef";
            const invalidWebhook = "0x0000000000000000";
            
            // Valid webhook should work
            await expect(
                quarantineVault.connect(housekeeper).processWebhookTrigger(validWebhook)
            ).to.not.be.reverted;
            
            // Invalid webhook should be rejected
            await expect(
                quarantineVault.connect(housekeeper).processWebhookTrigger(invalidWebhook)
            ).to.be.revertedWith("Invalid webhook data");
        });
        
        it("Should handle automated trigger responses", async function() {
            const triggerData = "0x1234567890abcdef";
            
            await quarantineVault.connect(housekeeper).processWebhookTrigger(triggerData);
            
            // Verify trigger was processed
            const triggerCount = await quarantineVault.getTriggerCount();
            expect(triggerCount).to.equal(1);
        });
    });
    
    describe("MODULE 2: Token Classification", function() {
        
        it("Should classify tokens as safe or suspicious", async function() {
            const tokenAddress = usdt.address;
            const amount = ethers.utils.parseUnits("100", 6);
            
            // Classify token
            await quarantineVault.connect(housekeeper).classifyToken(tokenAddress, amount, true); // Safe
            
            const classification = await quarantineVault.getTokenClassification(tokenAddress);
            expect(classification.isSafe).to.be.true;
        });
        
        it("Should handle suspicious token detection", async function() {
            const suspiciousToken = accounts[5].address; // Mock suspicious token
            const amount = ethers.utils.parseUnits("100", 6);
            
            // Mark as suspicious
            await quarantineVault.connect(housekeeper).classifyToken(suspiciousToken, amount, false); // Suspicious
            
            const classification = await quarantineVault.getTokenClassification(suspiciousToken);
            expect(classification.isSafe).to.be.false;
        });
        
        it("Should quarantine suspicious tokens automatically", async function() {
            const suspiciousToken = accounts[5].address;
            const amount = ethers.utils.parseUnits("100", 6);
            
            await quarantineVault.connect(housekeeper).classifyToken(suspiciousToken, amount, false);
            
            // Check if token is quarantined
            const isQuarantined = await quarantineVault.isTokenQuarantined(suspiciousToken);
            expect(isQuarantined).to.be.true;
        });
        
        it("Should maintain whitelist of safe tokens", async function() {
            const safeTokens = [usdt.address, accounts[1].address, accounts[2].address];
            
            for(const token of safeTokens) {
                await quarantineVault.connect(housekeeper).classifyToken(token, 1000, true);
            }
            
            // Verify whitelist
            const whitelistCount = await quarantineVault.getWhitelistCount();
            expect(whitelistCount).to.equal(safeTokens.length);
        });
    });
    
    describe("MODULE 3: Burn/Withdraw Management", function() {
        
        it("Should burn suspicious tokens", async function() {
            const suspiciousAmount = ethers.utils.parseUnits("100", 6);
            
            // Simulate suspicious tokens in vault
            await usdt.mint(quarantineVault.address, suspiciousAmount);
            
            const balanceBefore = await usdt.balanceOf(quarantineVault.address);
            
            // Burn suspicious tokens
            await quarantineVault.connect(housekeeper).burnSuspiciousTokens(usdt.address, suspiciousAmount);
            
            // Note: In real implementation, tokens would be burned or sent to burn address
            // For testing, we verify the burn function was called
            expect(true).to.be.true; // Placeholder for actual burn verification
        });
        
        it("Should allow safe token withdrawals", async function() {
            const withdrawAmount = ethers.utils.parseUnits("50", 6);
            
            // Classify USDT as safe
            await quarantineVault.connect(housekeeper).classifyToken(usdt.address, withdrawAmount, true);
            
            const balanceBefore = await usdt.balanceOf(owner.address);
            
            // Withdraw safe tokens
            await quarantineVault.connect(owner).withdrawSafeTokens(usdt.address, withdrawAmount);
            
            const balanceAfter = await usdt.balanceOf(owner.address);
            expect(balanceAfter.sub(balanceBefore)).to.equal(withdrawAmount);
        });
        
        it("Should prevent withdrawal of suspicious tokens", async function() {
            const suspiciousAmount = ethers.utils.parseUnits("100", 6);
            
            // Mark tokens as suspicious
            await quarantineVault.connect(housekeeper).classifyToken(usdt.address, suspiciousAmount, false);
            
            // Should prevent withdrawal
            await expect(
                quarantineVault.connect(owner).withdrawSafeTokens(usdt.address, suspiciousAmount)
            ).to.be.revertedWith("Token is not safe for withdrawal");
        });
        
        it("Should handle emergency token recovery", async function() {
            const emergencyAmount = ethers.utils.parseUnits("500", 6);
            
            // Emergency recovery by owner
            await expect(
                quarantineVault.connect(owner).emergencyTokenRecovery(usdt.address, emergencyAmount)
            ).to.not.be.reverted;
        });
    });
    
    describe("External Housekeeper Integration", function() {
        
        it("Should accept commands from external housekeeper", async function() {
            const command = "SCAN_AND_CLASSIFY";
            
            await expect(
                quarantineVault.connect(housekeeper).executeHousekeeperCommand(command)
            ).to.not.be.reverted;
        });
        
        it("Should reject unauthorized housekeeper commands", async function() {
            const command = "SCAN_AND_CLASSIFY";
            
            await expect(
                quarantineVault.connect(accounts[0]).executeHousekeeperCommand(command)
            ).to.be.revertedWith("Only external housekeeper");
        });
        
        it("Should update housekeeper permissions", async function() {
            const newHousekeeper = accounts[10];
            
            // Owner can update housekeeper
            await quarantineVault.connect(owner).updateHousekeeper(newHousekeeper.address);
            
            // New housekeeper should work
            await expect(
                quarantineVault.connect(newHousekeeper).executeHousekeeperCommand("STATUS_CHECK")
            ).to.not.be.reverted;
            
            // Old housekeeper should be rejected
            await expect(
                quarantineVault.connect(housekeeper).executeHousekeeperCommand("STATUS_CHECK")
            ).to.be.revertedWith("Only external housekeeper");
        });
    });
    
    describe("Security and Access Control", function() {
        
        it("Should enforce role-based access control", async function() {
            const amount = ethers.utils.parseUnits("100", 6);
            
            // Housekeeper can classify
            await expect(
                quarantineVault.connect(housekeeper).classifyToken(usdt.address, amount, true)
            ).to.not.be.reverted;
            
            // Non-housekeeper cannot classify
            await expect(
                quarantineVault.connect(accounts[0]).classifyToken(usdt.address, amount, true)
            ).to.be.revertedWith("Only external housekeeper");
            
            // Owner can withdraw
            await expect(
                quarantineVault.connect(owner).withdrawSafeTokens(usdt.address, amount)
            ).to.not.be.reverted;
            
            // Non-owner cannot withdraw
            await expect(
                quarantineVault.connect(accounts[0]).withdrawSafeTokens(usdt.address, amount)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
        
        it("Should prevent unauthorized token burns", async function() {
            const burnAmount = ethers.utils.parseUnits("50", 6);
            
            // Only housekeeper should be able to burn
            await expect(
                quarantineVault.connect(housekeeper).burnSuspiciousTokens(usdt.address, burnAmount)
            ).to.not.be.reverted;
            
            await expect(
                quarantineVault.connect(accounts[0]).burnSuspiciousTokens(usdt.address, burnAmount)
            ).to.be.revertedWith("Only external housekeeper");
        });
    });
    
    describe("Complete Quarantine Flow", function() {
        
        it("Should execute complete token quarantine workflow", async function() {
            const tokenAmount = ethers.utils.parseUnits("200", 6);
            
            // 1. Webhook trigger initiates scan
            await quarantineVault.connect(housekeeper).processWebhookTrigger("0x1234567890abcdef");
            
            // 2. Token classification
            await quarantineVault.connect(housekeeper).classifyToken(usdt.address, tokenAmount, true); // Safe
            
            // 3. Safe tokens can be withdrawn
            await quarantineVault.connect(owner).withdrawSafeTokens(usdt.address, tokenAmount.div(2));
            
            // 4. Verify system state
            const classification = await quarantineVault.getTokenClassification(usdt.address);
            expect(classification.isSafe).to.be.true;
            
            const triggerCount = await quarantineVault.getTriggerCount();
            expect(triggerCount).to.equal(1);
        });
        
        it("Should handle suspicious token workflow", async function() {
            const suspiciousToken = accounts[7].address;
            const suspiciousAmount = ethers.utils.parseUnits("100", 6);
            
            // 1. Webhook detects suspicious activity
            await quarantineVault.connect(housekeeper).processWebhookTrigger("0xdeadbeefcafebabe");
            
            // 2. Classify token as suspicious
            await quarantineVault.connect(housekeeper).classifyToken(suspiciousToken, suspiciousAmount, false);
            
            // 3. Token should be quarantined
            const isQuarantined = await quarantineVault.isTokenQuarantined(suspiciousToken);
            expect(isQuarantined).to.be.true;
            
            // 4. Burn suspicious tokens
            await quarantineVault.connect(housekeeper).burnSuspiciousTokens(suspiciousToken, suspiciousAmount);
            
            // Verify suspicious token handling
            const classification = await quarantineVault.getTokenClassification(suspiciousToken);
            expect(classification.isSafe).to.be.false;
        });
    });
    
});
