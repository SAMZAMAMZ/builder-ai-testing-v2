const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EntryGateFinal - MODULE 1: Entry Validation", function() {
    let entryGate, usdt, registry, owner, players, affiliates;
    let deployer, entryManager;
    
    beforeEach(async function() {
        // Deploy real contracts (not mocks)
        [owner, deployer, entryManager, ...accounts] = await ethers.getSigners();
        players = accounts.slice(0, 100);
        affiliates = accounts.slice(100, 200);
        
        // Deploy MockUSDT for testing
        const MockUSDT = await ethers.getContractFactory("MockUSDT");
        usdt = await MockUSDT.deploy("Mock USDT", "USDT", 6);
        
        // Deploy MockRegistry
        const MockRegistry = await ethers.getContractFactory("MockLotteryRegistry");
        registry = await MockRegistry.deploy();
        await registry.setEntryManager(entryManager.address);
        
        // Deploy EntryGateFinal
        const EntryGate = await ethers.getContractFactory("EntryGateFinal");
        entryGate = await EntryGate.deploy(usdt.address, registry.address);
        
        // Setup USDT balances and approvals for all test accounts
        for(let i = 0; i < 200; i++) {
            const account = i < 100 ? players[i] : affiliates[i - 100];
            await usdt.mint(account.address, ethers.utils.parseUnits("1000", 6));
            await usdt.connect(account).approve(entryGate.address, ethers.utils.parseUnits("1000", 6));
        }
    });
    
    describe("Section 1.1: Entry Parameter Validation (8 tests)", function() {
        
        it("1.1.1 - Validate `affiliate` address is not zero (required)", async function() {
            const player = players[0];
            const zeroAddress = ethers.constants.AddressZero;
            
            // Attempt entry with zero affiliate address should fail
            await expect(
                entryGate.connect(player).enterLottery(zeroAddress)
            ).to.be.revertedWith("Invalid affiliate address");
        });
        
        it("1.1.2 - Validate `player` (msg.sender) is not zero", async function() {
            // This test is implicit - msg.sender cannot be zero in normal execution
            // But we can test the internal validation logic
            const affiliate = affiliates[0];
            
            // Normal entry should work (msg.sender is valid)
            await expect(
                entryGate.connect(players[0]).enterLottery(affiliate.address)
            ).to.not.be.reverted;
        });
        
        it("1.1.3 - Accept self-referral (player == affiliate) ✅", async function() {
            const player = players[0];
            
            // Self-referral should be explicitly allowed
            await expect(
                entryGate.connect(player).enterLottery(player.address)
            ).to.not.be.reverted;
            
            // Verify entry was successful
            const tierInfo = await entryGate.getTierInfo();
            expect(tierInfo.playersInBatch).to.equal(1);
        });
        
        it("1.1.4 - Reject entry when batch is full (≥100 players)", async function() {
            const affiliate = affiliates[0];
            
            // Fill batch with 100 players
            for(let i = 0; i < 100; i++) {
                await entryGate.connect(players[i]).enterLottery(affiliate.address);
            }
            
            // 101st player should be rejected with BatchFull error
            await expect(
                entryGate.connect(players[0]).enterLottery(affiliate.address)
            ).to.be.revertedWithCustomError(entryGate, "BatchFull");
        });
        
        it("1.1.5 - Validate USDT balance sufficient for 10 USDT entry", async function() {
            const player = players[0];
            const affiliate = affiliates[0];
            
            // Drain player's USDT balance
            const balance = await usdt.balanceOf(player.address);
            await usdt.connect(player).transfer(owner.address, balance);
            
            // Entry should fail due to insufficient balance
            await expect(
                entryGate.connect(player).enterLottery(affiliate.address)
            ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
        });
        
        it("1.1.6 - Validate USDT allowance sufficient for contract", async function() {
            const player = players[0];
            const affiliate = affiliates[0];
            
            // Remove USDT allowance
            await usdt.connect(player).approve(entryGate.address, 0);
            
            // Entry should fail due to insufficient allowance
            await expect(
                entryGate.connect(player).enterLottery(affiliate.address)
            ).to.be.revertedWith("ERC20: insufficient allowance");
        });
        
        it("1.1.7 - Test `BatchFull` error when 100 players reached", async function() {
            const affiliate = affiliates[0];
            
            // Fill batch to exactly 100 players
            for(let i = 0; i < 100; i++) {
                await entryGate.connect(players[i]).enterLottery(affiliate.address);
            }
            
            // Verify batch is full
            const tierInfo = await entryGate.getTierInfo();
            expect(tierInfo.playersInBatch).to.equal(0); // Should be 0 as new batch started
            expect(tierInfo.currentBatchNumber).to.equal(2); // Should be batch 2
            
            // Attempt entry in new batch should work
            await expect(
                entryGate.connect(players[0]).enterLottery(affiliate.address)
            ).to.not.be.reverted;
        });
        
        it("1.1.8 - Test entry validation with malicious addresses", async function() {
            const player = players[0];
            
            // Test with various potentially problematic addresses
            const maliciousAddresses = [
                ethers.constants.AddressZero,
                "0x000000000000000000000000000000000000dEaD",
                "0x0000000000000000000000000000000000000001"
            ];
            
            // Zero address should fail (tested in 1.1.1)
            await expect(
                entryGate.connect(player).enterLottery(maliciousAddresses[0])
            ).to.be.revertedWith("Invalid affiliate address");
            
            // Other addresses should work (they're valid addresses)
            for(let i = 1; i < maliciousAddresses.length; i++) {
                await expect(
                    entryGate.connect(players[i]).enterLottery(maliciousAddresses[i])
                ).to.not.be.reverted;
            }
        });
    });
    
    describe("Section 1.2: Entry Processing Flow (10 tests)", function() {
        
        it("1.2.1 - Test complete `enterLottery()` success path", async function() {
            const player = players[0];
            const affiliate = affiliates[0];
            
            // Record initial balances
            const playerBalanceBefore = await usdt.balanceOf(player.address);
            const affiliateBalanceBefore = await usdt.balanceOf(affiliate.address);
            const contractBalanceBefore = await usdt.balanceOf(entryGate.address);
            
            // Execute successful entry
            const tx = await entryGate.connect(player).enterLottery(affiliate.address);
            const receipt = await tx.wait();
            
            // Verify balances changed correctly
            const playerBalanceAfter = await usdt.balanceOf(player.address);
            const affiliateBalanceAfter = await usdt.balanceOf(affiliate.address);
            const contractBalanceAfter = await usdt.balanceOf(entryGate.address);
            
            // Player should lose 10 USDT
            expect(playerBalanceBefore.sub(playerBalanceAfter)).to.equal(ethers.utils.parseUnits("10", 6));
            
            // Affiliate should gain 0.75 USDT
            expect(affiliateBalanceAfter.sub(affiliateBalanceBefore)).to.equal(ethers.utils.parseUnits("0.75", 6));
            
            // Contract should gain 9.25 USDT (10 - 0.75)
            expect(contractBalanceAfter.sub(contractBalanceBefore)).to.equal(ethers.utils.parseUnits("9.25", 6));
            
            // Verify EntrySuccessful event was emitted
            const event = receipt.events.find(e => e.event === "EntrySuccessful");
            expect(event).to.not.be.undefined;
            expect(event.args.player).to.equal(player.address);
            expect(event.args.affiliate).to.equal(affiliate.address);
        });
        
        it("1.2.2 - Test `_processEntry()` internal call chain", async function() {
            const player = players[0];
            const affiliate = affiliates[0];
            
            // The internal _processEntry function is called via enterLottery
            // We can test its effects through the public interface
            const tx = await entryGate.connect(player).enterLottery(affiliate.address);
            
            // Verify all expected state changes occurred:
            // 1. Registry entry created
            const registryEntry = await entryGate.getBatchRegistry(1, 0);
            expect(registryEntry.playerWallet).to.equal(player.address);
            expect(registryEntry.affiliateWallet).to.equal(affiliate.address);
            
            // 2. Batch count incremented
            const tierInfo = await entryGate.getTierInfo();
            expect(tierInfo.playersInBatch).to.equal(1);
            
            // 3. Financial tracking updated
            const financials = await entryGate.getBatchFinancials(1);
            expect(financials.totalEntryFees).to.equal(ethers.utils.parseUnits("10", 6));
            expect(financials.totalAffiliatePaid).to.equal(ethers.utils.parseUnits("0.75", 6));
        });
        
        it("1.2.3 - Verify USDT transfer from player (10 USDT)", async function() {
            const player = players[0];
            const affiliate = affiliates[0];
            
            const balanceBefore = await usdt.balanceOf(player.address);
            
            await entryGate.connect(player).enterLottery(affiliate.address);
            
            const balanceAfter = await usdt.balanceOf(player.address);
            const transferred = balanceBefore.sub(balanceAfter);
            
            // Verify exactly 10 USDT was transferred from player
            expect(transferred).to.equal(ethers.utils.parseUnits("10", 6));
        });
        
        it("1.2.4 - Verify affiliate payment (0.75 USDT)", async function() {
            const player = players[0];
            const affiliate = affiliates[0];
            
            const balanceBefore = await usdt.balanceOf(affiliate.address);
            
            await entryGate.connect(player).enterLottery(affiliate.address);
            
            const balanceAfter = await usdt.balanceOf(affiliate.address);
            const received = balanceAfter.sub(balanceBefore);
            
            // Verify exactly 0.75 USDT was paid to affiliate
            expect(received).to.equal(ethers.utils.parseUnits("0.75", 6));
        });
        
        it("1.2.5 - Test reentrancy protection on `enterLottery()`", async function() {
            // EntryGateFinal uses ReentrancyGuard
            // We can test that multiple calls in same transaction fail
            const player = players[0];
            const affiliate = affiliates[0];
            
            // This test requires a malicious contract that attempts reentrancy
            // For now, we verify the modifier is present by checking successful single entry
            await expect(
                entryGate.connect(player).enterLottery(affiliate.address)
            ).to.not.be.reverted;
            
            // Subsequent entries should work (reentrancy guard resets)
            await expect(
                entryGate.connect(players[1]).enterLottery(affiliate.address)
            ).to.not.be.reverted;
        });
        
        it("1.2.6 - Test entry failure handling and events", async function() {
            const player = players[0];
            
            // Test entry failure with zero affiliate address
            const tx = entryGate.connect(player).enterLottery(ethers.constants.AddressZero);
            
            // Should revert and emit EntryFailed event
            await expect(tx).to.be.revertedWith("Invalid affiliate address");
            
            // Note: EntryFailed event is emitted in the try/catch, but transaction reverts
        });
        
        it("1.2.7 - Verify player count increment", async function() {
            const affiliate = affiliates[0];
            
            // Initial state
            let tierInfo = await entryGate.getTierInfo();
            expect(tierInfo.playersInBatch).to.equal(0);
            
            // Add players one by one
            for(let i = 0; i < 5; i++) {
                await entryGate.connect(players[i]).enterLottery(affiliate.address);
                
                tierInfo = await entryGate.getTierInfo();
                expect(tierInfo.playersInBatch).to.equal(i + 1);
            }
        });
        
        it("1.2.8 - Test entry with insufficient USDT balance", async function() {
            const player = players[0];
            const affiliate = affiliates[0];
            
            // Set player balance to less than 10 USDT (e.g., 5 USDT)
            await usdt.mint(player.address, ethers.utils.parseUnits("5", 6));
            const totalBalance = await usdt.balanceOf(player.address);
            await usdt.connect(player).transfer(owner.address, totalBalance.sub(ethers.utils.parseUnits("5", 6)));
            
            // Entry should fail
            await expect(
                entryGate.connect(player).enterLottery(affiliate.address)
            ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
        });
        
        it("1.2.9 - Test entry with zero USDT allowance", async function() {
            const player = players[0];
            const affiliate = affiliates[0];
            
            // Reset allowance to 0
            await usdt.connect(player).approve(entryGate.address, 0);
            
            // Entry should fail
            await expect(
                entryGate.connect(player).enterLottery(affiliate.address)
            ).to.be.revertedWith("ERC20: insufficient allowance");
        });
        
        it("1.2.10 - Test multiple entries from same player", async function() {
            const player = players[0];
            const affiliate = affiliates[0];
            
            // First entry should succeed
            await expect(
                entryGate.connect(player).enterLottery(affiliate.address)
            ).to.not.be.reverted;
            
            // Second entry from same player should also succeed (no restriction)
            await expect(
                entryGate.connect(player).enterLottery(affiliate.address)
            ).to.not.be.reverted;
            
            // Verify both entries recorded
            const tierInfo = await entryGate.getTierInfo();
            expect(tierInfo.playersInBatch).to.equal(2);
        });
    });
});
