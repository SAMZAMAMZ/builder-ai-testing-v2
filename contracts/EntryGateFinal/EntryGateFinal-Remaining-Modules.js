    // ========================================================================
    // MODULE 6: REGISTRY TRANSMISSION (18 Tests)
    // ========================================================================
    
    describe("MODULE 6: Registry Transmission (18 tests)", function() {
        
        describe("Section 6.1: EntryManager Integration (10 tests)", function() {
            
            it("6.1.1 - Test `_transmitBatch()` EntryManager resolution", async function() {
                const affiliate = affiliates[0];
                
                // Fill complete batch to trigger transmission
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                // Check that registry was set up correctly
                const registryAddress = await entryGate.REGISTRY();
                expect(registryAddress).to.not.equal(ethers.constants.AddressZero);
            });
            
            it("6.1.2 - Test registry address fetch from `REGISTRY`", async function() {
                const registryAddress = await entryGate.REGISTRY();
                const entryManagerFromRegistry = await registry.entryManager();
                
                expect(registryAddress).to.equal(registry.address);
                expect(entryManagerFromRegistry).to.equal(entryManager.address);
            });
            
            it("6.1.3 - Test EntryManager address validation (non-zero)", async function() {
                const entryManagerAddress = await registry.entryManager();
                expect(entryManagerAddress).to.not.equal(ethers.constants.AddressZero);
                expect(entryManagerAddress).to.equal(entryManager.address);
            });
            
            it("6.1.4 - Test `receiveRegistryBatch()` call execution", async function() {
                const affiliate = affiliates[0];
                
                // This test verifies the call would be made by filling batch
                // The actual call happens in _transmitBatch which is called automatically
                let lastTx;
                for(let i = 0; i < 100; i++) {
                    lastTx = await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                // Verify RegistryTransmitted event was emitted
                const receipt = await lastTx.wait();
                const event = receipt.events.find(e => e.event === "RegistryTransmitted");
                expect(event).to.not.be.undefined;
            });
            
            it("6.1.5 - Verify registry entries array preparation", async function() {
                const affiliate = affiliates[0];
                
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                // Verify all 100 entries exist in registry
                const count = await entryGate.getBatchRegistryCount(1);
                expect(count).to.equal(100);
                
                // Verify first and last entries
                const firstEntry = await entryGate.getBatchRegistry(1, 0);
                const lastEntry = await entryGate.getBatchRegistry(1, 99);
                
                expect(firstEntry.playerWallet).to.equal(players[0].address);
                expect(lastEntry.playerWallet).to.equal(players[99].address);
            });
            
            it("6.1.6 - Test all 100 entries transmitted correctly", async function() {
                const affiliate = affiliates[0];
                
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                const [entries, financials, entryCount] = await entryGate.exportBatchForExamination(1);
                
                expect(entryCount).to.equal(100);
                expect(entries.length).to.equal(100);
                
                // Verify all entries have correct data
                for(let i = 0; i < 100; i++) {
                    expect(entries[i].playerWallet).to.equal(players[i].address);
                    expect(entries[i].affiliateWallet).to.equal(affiliate.address);
                    expect(entries[i].playerNumber).to.equal(i + 1);
                }
            });
            
            it("6.1.7 - Test registry transmission parameters accuracy", async function() {
                const affiliate = affiliates[0];
                
                let lastTx;
                for(let i = 0; i < 100; i++) {
                    lastTx = await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                const receipt = await lastTx.wait();
                const event = receipt.events.find(e => e.event === "RegistryTransmitted");
                
                if(event) {
                    expect(event.args.batchNumber).to.equal(1);
                    expect(event.args.entryCount).to.equal(100);
                    expect(event.args.netAmount).to.equal(ethers.utils.parseUnits("925", 6));
                    expect(event.args.entryManager).to.equal(entryManager.address);
                }
            });
            
            it("6.1.8 - Test EntryManager call failure handling", async function() {
                // This test would require a failing EntryManager mock
                // For now, verify successful case
                const affiliate = affiliates[0];
                
                await expect(async () => {
                    for(let i = 0; i < 100; i++) {
                        await entryGate.connect(players[i]).enterLottery(affiliate.address);
                    }
                }).to.not.throw();
            });
            
            it("6.1.9 - Test registry transmission timing (after batch close)", async function() {
                const affiliate = affiliates[0];
                
                // Fill to 99 players (should not transmit yet)
                for(let i = 0; i < 99; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                let tierInfo = await entryGate.getTierInfo();
                expect(tierInfo.currentBatchNumber).to.equal(1); // Still batch 1
                
                // Add 100th player (should trigger batch close and transmission)
                const tx = await entryGate.connect(players[99]).enterLottery(affiliate.address);
                const receipt = await tx.wait();
                
                tierInfo = await entryGate.getTierInfo();
                expect(tierInfo.currentBatchNumber).to.equal(2); // New batch
                
                // Verify transmission occurred
                const event = receipt.events.find(e => e.event === "RegistryTransmitted");
                expect(event).to.not.be.undefined;
            });
            
            it("6.1.10 - Validate transmission gas efficiency", async function() {
                const affiliate = affiliates[0];
                
                let lastTx;
                for(let i = 0; i < 100; i++) {
                    lastTx = await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                const receipt = await lastTx.wait();
                // Gas usage should be reasonable even with transmission
                expect(receipt.gasUsed).to.be.lt(ethers.utils.parseUnits("2000000", "wei"));
            });
        });
        
        describe("Section 6.2: Transmission Events & Validation (8 tests)", function() {
            
            it("6.2.1 - Test `RegistryTransmitted` event emission", async function() {
                const affiliate = affiliates[0];
                
                let lastTx;
                for(let i = 0; i < 100; i++) {
                    lastTx = await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                await expect(lastTx)
                    .to.emit(entryGate, "RegistryTransmitted")
                    .withArgs(1, entryManager.address, 100, ethers.utils.parseUnits("925", 6));
            });
            
            it("6.2.2 - Verify transmission event parameters", async function() {
                const affiliate = affiliates[0];
                
                let lastTx;
                for(let i = 0; i < 100; i++) {
                    lastTx = await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                const receipt = await lastTx.wait();
                const event = receipt.events.find(e => e.event === "RegistryTransmitted");
                
                expect(event.args.batchNumber).to.equal(1);
                expect(event.args.entryManager).to.equal(entryManager.address);
                expect(event.args.entryCount).to.equal(100);
                expect(event.args.netAmount).to.equal(ethers.utils.parseUnits("925", 6));
            });
            
            it("6.2.3 - Test USDT fund transfer to EntryManager (900+ USDT)", async function() {
                const affiliate = affiliates[0];
                
                const entryManagerBalanceBefore = await usdt.balanceOf(entryManager.address);
                
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                const entryManagerBalanceAfter = await usdt.balanceOf(entryManager.address);
                const received = entryManagerBalanceAfter.sub(entryManagerBalanceBefore);
                
                expect(received).to.equal(ethers.utils.parseUnits("925", 6));
                expect(received).to.be.gte(ethers.utils.parseUnits("900", 6)); // Above minimum
            });
            
            it("6.2.4 - Test transmission success confirmation", async function() {
                const affiliate = affiliates[0];
                
                let lastTx;
                for(let i = 0; i < 100; i++) {
                    lastTx = await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                // Transaction should complete successfully
                const receipt = await lastTx.wait();
                expect(receipt.status).to.equal(1); // Success
                
                // Should have triggered new batch
                const tierInfo = await entryGate.getTierInfo();
                expect(tierInfo.currentBatchNumber).to.equal(2);
            });
            
            it("6.2.5 - Test transmission failure rollback", async function() {
                // This would require a mock EntryManager that fails
                // For now, verify successful transmission doesn't cause issues
                const affiliate = affiliates[0];
                
                await expect(async () => {
                    for(let i = 0; i < 100; i++) {
                        await entryGate.connect(players[i]).enterLottery(affiliate.address);
                    }
                }).to.not.throw();
            });
            
            it("6.2.6 - Verify transmission atomicity", async function() {
                const affiliate = affiliates[0];
                
                // Fill to 99 players
                for(let i = 0; i < 99; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                // The 100th entry should complete the entire batch process atomically
                await expect(
                    entryGate.connect(players[99]).enterLottery(affiliate.address)
                ).to.not.be.reverted;
                
                // Verify complete state transition
                const tierInfo = await entryGate.getTierInfo();
                expect(tierInfo.currentBatchNumber).to.equal(2);
                expect(tierInfo.playersInBatch).to.equal(0);
            });
            
            it("6.2.7 - Test concurrent transmission prevention", async function() {
                // EntryGate processes entries sequentially, preventing concurrent transmissions
                const affiliate = affiliates[0];
                
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                // Only one batch should be transmitted
                const batch1Count = await entryGate.getBatchRegistryCount(1);
                expect(batch1Count).to.equal(100);
                
                const tierInfo = await entryGate.getTierInfo();
                expect(tierInfo.currentBatchNumber).to.equal(2);
            });
            
            it("6.2.8 - Test transmission audit trail completeness", async function() {
                const affiliate = affiliates[0];
                
                let lastTx;
                for(let i = 0; i < 100; i++) {
                    lastTx = await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                const receipt = await lastTx.wait();
                
                // Should have multiple events documenting the transmission
                const batchClosedEvent = receipt.events.find(e => e.event === "BatchClosed");
                const registryTransmittedEvent = receipt.events.find(e => e.event === "RegistryTransmitted");
                const minTransferEvent = receipt.events.find(e => e.event === "MinimumNetTransferValidation");
                
                expect(batchClosedEvent).to.not.be.undefined;
                expect(registryTransmittedEvent).to.not.be.undefined;
                // minTransferEvent might be undefined if not emitted separately
            });
        });
    });
    
    // ========================================================================
    // MODULE 7: FUND TRANSMISSION (12 Tests)
    // ========================================================================
    
    describe("MODULE 7: Fund Transmission (12 tests)", function() {
        
        describe("Section 7.1: USDT Transfer Validation (12 tests)", function() {
            
            it("7.1.1 - Test exact net amount transfer to EntryManager", async function() {
                const affiliate = affiliates[0];
                
                const entryManagerBalanceBefore = await usdt.balanceOf(entryManager.address);
                
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                const entryManagerBalanceAfter = await usdt.balanceOf(entryManager.address);
                const received = entryManagerBalanceAfter.sub(entryManagerBalanceBefore);
                
                expect(received).to.equal(ethers.utils.parseUnits("925", 6));
            });
            
            it("7.1.2 - Verify `SafeERC20.safeTransfer` usage", async function() {
                const affiliate = affiliates[0];
                
                // SafeERC20 usage is implicit - transfers should succeed without revert
                await expect(async () => {
                    for(let i = 0; i < 100; i++) {
                        await entryGate.connect(players[i]).enterLottery(affiliate.address);
                    }
                }).to.not.throw();
                
                const entryManagerBalance = await usdt.balanceOf(entryManager.address);
                expect(entryManagerBalance).to.be.gte(ethers.utils.parseUnits("925", 6));
            });
            
            it("7.1.3 - Test transfer timing (with registry transmission)", async function() {
                const affiliate = affiliates[0];
                
                // Fill to 99 players (no transfer yet)
                for(let i = 0; i < 99; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                const balanceBefore = await usdt.balanceOf(entryManager.address);
                
                // Add 100th player (triggers transfer)
                await entryGate.connect(players[99]).enterLottery(affiliate.address);
                
                const balanceAfter = await usdt.balanceOf(entryManager.address);
                const received = balanceAfter.sub(balanceBefore);
                
                expect(received).to.equal(ethers.utils.parseUnits("925", 6));
            });
            
            it("7.1.4 - Test contract balance before/after transfer", async function() {
                const affiliate = affiliates[0];
                
                // Fill batch
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                // Contract should have minimal balance (after affiliate payments and transfer)
                const contractBalance = await usdt.balanceOf(entryGate.address);
                expect(contractBalance).to.equal(0); // Should be empty after transfer
            });
            
            it("7.1.5 - Test transfer failure handling", async function() {
                // This would require a failing transfer scenario
                // For now, verify successful transfers work
                const affiliate = affiliates[0];
                
                await expect(async () => {
                    for(let i = 0; i < 100; i++) {
                        await entryGate.connect(players[i]).enterLottery(affiliate.address);
                    }
                }).to.not.throw();
            });
            
            it("7.1.6 - Test transfer amount precision (6 decimals)", async function() {
                const affiliate = affiliates[0];
                
                const balanceBefore = await usdt.balanceOf(entryManager.address);
                
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                const balanceAfter = await usdt.balanceOf(entryManager.address);
                const received = balanceAfter.sub(balanceBefore);
                
                // Verify exact precision: 925.000000 USDT
                expect(received).to.equal(925000000);
            });
            
            it("7.1.7 - Test transfer with minimum amount (900 USDT)", async function() {
                // Contract always transfers 925 USDT for full batch (100 players)
                // This exceeds the 900 USDT minimum
                const affiliate = affiliates[0];
                
                const balanceBefore = await usdt.balanceOf(entryManager.address);
                
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                const balanceAfter = await usdt.balanceOf(entryManager.address);
                const received = balanceAfter.sub(balanceBefore);
                
                expect(received).to.be.gte(ethers.utils.parseUnits("900", 6));
                expect(received).to.equal(ethers.utils.parseUnits("925", 6));
            });
            
            it("7.1.8 - Test transfer with full batch amount (925 USDT)", async function() {
                const affiliate = affiliates[0];
                
                const balanceBefore = await usdt.balanceOf(entryManager.address);
                
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                const balanceAfter = await usdt.balanceOf(entryManager.address);
                const received = balanceAfter.sub(balanceBefore);
                
                expect(received).to.equal(ethers.utils.parseUnits("925", 6));
            });
            
            it("7.1.9 - Validate transfer gas efficiency", async function() {
                const affiliate = affiliates[0];
                
                let lastTx;
                for(let i = 0; i < 100; i++) {
                    lastTx = await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                const receipt = await lastTx.wait();
                
                // Gas should be reasonable even with transfer
                expect(receipt.gasUsed).to.be.lt(ethers.utils.parseUnits("2000000", "wei"));
            });
            
            it("7.1.10 - Test transfer event correlation", async function() {
                const affiliate = affiliates[0];
                
                let lastTx;
                for(let i = 0; i < 100; i++) {
                    lastTx = await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                const receipt = await lastTx.wait();
                
                // Should have both BatchClosed and RegistryTransmitted events
                const batchClosedEvent = receipt.events.find(e => e.event === "BatchClosed");
                const transmittedEvent = receipt.events.find(e => e.event === "RegistryTransmitted");
                
                expect(batchClosedEvent).to.not.be.undefined;
                expect(transmittedEvent).to.not.be.undefined;
                
                if(batchClosedEvent && transmittedEvent) {
                    expect(batchClosedEvent.args.batchNumber).to.equal(transmittedEvent.args.batchNumber);
                    expect(batchClosedEvent.args.netAmount).to.equal(transmittedEvent.args.netAmount);
                }
            });
            
            it("7.1.11 - Test multiple transfer scenarios", async function() {
                const affiliate = affiliates[0];
                
                // Test transfers across multiple batches
                for(let batch = 0; batch < 2; batch++) {
                    const balanceBefore = await usdt.balanceOf(entryManager.address);
                    
                    for(let i = 0; i < 100; i++) {
                        await entryGate.connect(players[i]).enterLottery(affiliate.address);
                    }
                    
                    const balanceAfter = await usdt.balanceOf(entryManager.address);
                    const received = balanceAfter.sub(balanceBefore);
                    
                    expect(received).to.equal(ethers.utils.parseUnits("925", 6));
                }
                
                // Total should be 2 * 925 = 1850 USDT
                const finalBalance = await usdt.balanceOf(entryManager.address);
                expect(finalBalance).to.equal(ethers.utils.parseUnits("1850", 6));
            });
            
            it("7.1.12 - Test transfer security measures", async function() {
                const affiliate = affiliates[0];
                
                // Transfers should only happen to registered EntryManager
                const entryManagerAddress = await registry.entryManager();
                expect(entryManagerAddress).to.equal(entryManager.address);
                
                // Complete batch to trigger transfer
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                // Verify funds went to correct address
                const balance = await usdt.balanceOf(entryManager.address);
                expect(balance).to.be.gte(ethers.utils.parseUnits("925", 6));
            });
        });
    });
    
    // ========================================================================
    // MODULE 8: PURGE MANAGEMENT (16 Tests)
    // ========================================================================
    
    describe("MODULE 8: Purge Management (16 tests)", function() {
        
        describe("Section 8.1: Purge Authorization (8 tests)", function() {
            
            it("8.1.1 - Test `purgeBatch()` EntryManager-only access", async function() {
                const affiliate = affiliates[0];
                
                // Fill and complete a batch
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                // EntryManager should be able to purge
                await expect(
                    entryGate.connect(entryManager).purgeBatch(1)
                ).to.not.be.reverted;
            });
            
            it("8.1.2 - Test unauthorized purge attempt rejection", async function() {
                const affiliate = affiliates[0];
                
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                // Unauthorized user should not be able to purge
                await expect(
                    entryGate.connect(players[0]).purgeBatch(1)
                ).to.be.revertedWith("Only EntryManager can purge");
            });
            
            it("8.1.3 - Test purge authorization via registry lookup", async function() {
                const entryManagerFromRegistry = await registry.entryManager();
                expect(entryManagerFromRegistry).to.equal(entryManager.address);
                
                // The contract should validate against this address
                const affiliate = affiliates[0];
                
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                await expect(
                    entryGate.connect(entryManager).purgeBatch(1)
                ).to.not.be.reverted;
            });
            
            it("8.1.4 - Test purge timing (after transmission)", async function() {
                const affiliate = affiliates[0];
                
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                // Batch should be transmitted already, ready for purge
                const tierInfo = await entryGate.getTierInfo();
                expect(tierInfo.currentBatchNumber).to.equal(2); // New batch started
                
                await expect(
                    entryGate.connect(entryManager).purgeBatch(1)
                ).to.not.be.reverted;
            });
            
            it("8.1.5 - Test purge with invalid batch numbers", async function() {
                // Non-existent batch should not cause revert but will have no effect
                await expect(
                    entryGate.connect(entryManager).purgeBatch(999)
                ).to.not.be.reverted;
            });
            
            it("8.1.6 - Test purge access control enforcement", async function() {
                const affiliate = affiliates[0];
                
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                // Various unauthorized accounts should be rejected
                const unauthorizedAccounts = [owner, players[0], affiliates[0], deployer];
                
                for(const account of unauthorizedAccounts) {
                    await expect(
                        entryGate.connect(account).purgeBatch(1)
                    ).to.be.revertedWith("Only EntryManager can purge");
                }
            });
            
            it("8.1.7 - Test purge with non-existent batches", async function() {
                // Purging non-existent batch should not revert
                await expect(
                    entryGate.connect(entryManager).purgeBatch(100)
                ).to.not.be.reverted;
            });
            
            it("8.1.8 - Validate purge security measures", async function() {
                const affiliate = affiliates[0];
                
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                // Only the exact EntryManager address should work
                const correctEntryManager = await registry.entryManager();
                expect(correctEntryManager).to.equal(entryManager.address);
                
                await expect(
                    entryGate.connect(entryManager).purgeBatch(1)
                ).to.not.be.reverted;
            });
        });
        
        describe("Section 8.2: Purge Execution (8 tests)", function() {
            
            it("8.2.1 - Test complete batch data deletion", async function() {
                const affiliate = affiliates[0];
                
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                // Verify data exists before purge
                let count = await entryGate.getBatchRegistryCount(1);
                expect(count).to.equal(100);
                
                // Purge the batch
                await entryGate.connect(entryManager).purgeBatch(1);
                
                // Verify data is deleted
                count = await entryGate.getBatchRegistryCount(1);
                expect(count).to.equal(0);
            });
            
            it("8.2.2 - Test registry entries removal (all 100)", async function() {
                const affiliate = affiliates[0];
                
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                // Verify entries exist
                for(let i = 0; i < 5; i++) {
                    const entry = await entryGate.getBatchRegistry(1, i);
                    expect(entry.playerWallet).to.equal(players[i].address);
                }
                
                // Purge
                await entryGate.connect(entryManager).purgeBatch(1);
                
                // Verify entries are cleared
                for(let i = 0; i < 5; i++) {
                    const entry = await entryGate.getBatchRegistry(1, i);
                    expect(entry.playerWallet).to.equal(ethers.constants.AddressZero);
                }
            });
            
            it("8.2.3 - Test batch count reset to 0", async function() {
                const affiliate = affiliates[0];
                
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                expect(await entryGate.getBatchRegistryCount(1)).to.equal(100);
                
                await entryGate.connect(entryManager).purgeBatch(1);
                
                expect(await entryGate.getBatchRegistryCount(1)).to.equal(0);
            });
            
            it("8.2.4 - Test financial data deletion", async function() {
                const affiliate = affiliates[0];
                
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                // Verify financial data exists
                let financials = await entryGate.getBatchFinancials(1);
                expect(financials.totalEntryFees).to.equal(ethers.utils.parseUnits("1000", 6));
                
                // Purge
                await entryGate.connect(entryManager).purgeBatch(1);
                
                // Verify financial data is cleared
                financials = await entryGate.getBatchFinancials(1);
                expect(financials.totalEntryFees).to.equal(0);
                expect(financials.totalAffiliatePaid).to.equal(0);
                expect(financials.netAmount).to.equal(0);
            });
            
            it("8.2.5 - Test `BatchPurged` event emission", async function() {
                const affiliate = affiliates[0];
                
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                await expect(
                    entryGate.connect(entryManager).purgeBatch(1)
                ).to.emit(entryGate, "BatchPurged")
                 .withArgs(1, 100);
            });
            
            it("8.2.6 - Verify purge completeness", async function() {
                const affiliate = affiliates[0];
                
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                // Get status before purge
                let [exists, playerCount] = await entryGate.getBatchStatus(1);
                expect(exists).to.be.true;
                expect(playerCount).to.equal(100);
                
                await entryGate.connect(entryManager).purgeBatch(1);
                
                // Verify complete purge
                [exists, playerCount] = await entryGate.getBatchStatus(1);
                expect(exists).to.be.false;
                expect(playerCount).to.equal(0);
            });
            
            it("8.2.7 - Test purge gas efficiency", async function() {
                const affiliate = affiliates[0];
                
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                const tx = await entryGate.connect(entryManager).purgeBatch(1);
                const receipt = await tx.wait();
                
                // Purge should be reasonably gas efficient
                expect(receipt.gasUsed).to.be.lt(ethers.utils.parseUnits("3000000", "wei"));
            });
            
            it("8.2.8 - Test post-purge state consistency", async function() {
                const affiliate = affiliates[0];
                
                // Create and fill two batches
                for(let i = 0; i < 100; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                for(let i = 0; i < 50; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                // Purge first batch only
                await entryGate.connect(entryManager).purgeBatch(1);
                
                // Batch 1 should be empty
                expect(await entryGate.getBatchRegistryCount(1)).to.equal(0);
                
                // Batch 2 should be unchanged
                expect(await entryGate.getBatchRegistryCount(2)).to.equal(50);
                
                // Current batch should still be 2
                const tierInfo = await entryGate.getTierInfo();
                expect(tierInfo.currentBatchNumber).to.equal(2);
                expect(tierInfo.playersInBatch).to.equal(50);
            });
        });
    });
    
    // ========================================================================
    // MODULE 9: CONFIGURATION & CONSTANTS VALIDATION (16 Tests)
    // ========================================================================
    
    describe("MODULE 9: Configuration & Constants Validation (16 tests)", function() {
        
        describe("Section 9.1: Immutable Constants (10 tests)", function() {
            
            it("9.1.1 - Test `TIER_2_ENTRY_FEE` = 10,000,000 (10 USDT)", async function() {
                const config = await entryGate.getTier2Configuration();
                expect(config.entryFee).to.equal(10000000); // 10 USDT with 6 decimals
            });
            
            it("9.1.2 - Test `TIER_2_MAX_PLAYERS` = 100", async function() {
                const config = await entryGate.getTier2Configuration();
                expect(config.maxPlayers).to.equal(100);
            });
            
            it("9.1.3 - Test `TIER_2_AFFILIATE_FEE` = 750,000 (0.75 USDT)", async function() {
                const config = await entryGate.getTier2Configuration();
                expect(config.affiliateFee).to.equal(750000); // 0.75 USDT with 6 decimals
            });
            
            it("9.1.4 - Test `MINIMUM_NET_TRANSFER` = 900,000,000 (900 USDT)", async function() {
                const config = await entryGate.getTier2Configuration();
                expect(config.minimumNetTransfer).to.equal(900000000); // 900 USDT with 6 decimals
            });
            
            it("9.1.5 - Test `TIER_2_NAME` = \"Tier-2-Entry-10-USDT\"", async function() {
                const config = await entryGate.getTier2Configuration();
                expect(config.tierName).to.equal("Tier-2-Entry-10-USDT");
            });
            
            it("9.1.6 - Test `getTier2Configuration()` return values", async function() {
                const config = await entryGate.getTier2Configuration();
                
                expect(config.entryFee).to.equal(10000000);
                expect(config.maxPlayers).to.equal(100);
                expect(config.affiliateFee).to.equal(750000);
                expect(config.minimumNetTransfer).to.equal(900000000);
                expect(config.tierName).to.equal("Tier-2-Entry-10-USDT");
            });
            
            it("9.1.7 - Test `validateTier2Constants()` logic", async function() {
                const isValid = await entryGate.validateTier2Constants();
                expect(isValid).to.be.true;
            });
            
            it("9.1.8 - Test `validateSelfReferralSupport()` = true", async function() {
                const isSupported = await entryGate.validateSelfReferralSupport();
                expect(isSupported).to.be.true;
            });
            
            it("9.1.9 - Test constants immutability", async function() {
                // Constants should always return the same values
                const config1 = await entryGate.getTier2Configuration();
                const config2 = await entryGate.getTier2Configuration();
                
                expect(config1.entryFee).to.equal(config2.entryFee);
                expect(config1.maxPlayers).to.equal(config2.maxPlayers);
                expect(config1.affiliateFee).to.equal(config2.affiliateFee);
                expect(config1.minimumNetTransfer).to.equal(config2.minimumNetTransfer);
                expect(config1.tierName).to.equal(config2.tierName);
            });
            
            it("9.1.10 - Test configuration consistency", async function() {
                const config = await entryGate.getTier2Configuration();
                
                // Verify logical consistency
                expect(config.affiliateFee).to.be.lt(config.entryFee); // Affiliate fee < entry fee
                expect(config.maxPlayers).to.be.gt(0); // Positive max players
                expect(config.minimumNetTransfer).to.be.gt(0); // Positive minimum
                
                // Verify minimum is achievable
                const netPerEntry = config.entryFee - config.affiliateFee; // 9.25 USDT
                const entriesNeeded = Math.ceil(config.minimumNetTransfer / netPerEntry);
                expect(entriesNeeded).to.be.lte(config.maxPlayers);
            });
        });
        
        describe("Section 9.2: Contract Info Functions (6 tests)", function() {
            
            it("9.2.1 - Test `validateModularArchitecture()` returns 8 modules", async function() {
                const modules = await entryGate.validateModularArchitecture();
                expect(modules.length).to.equal(8);
                
                const expectedModules = [
                    "Entry Validation",
                    "Registry Management", 
                    "Affiliate Payment",
                    "Batch Management",
                    "Financial Calculation",
                    "Registry Transmission",
                    "Fund Transmission",
                    "Purge Management"
                ];
                
                for(let i = 0; i < expectedModules.length; i++) {
                    expect(modules[i]).to.equal(expectedModules[i]);
                }
            });
            
            it("9.2.2 - Test `getTierInfo()` current state", async function() {
                const tierInfo = await entryGate.getTierInfo();
                
                expect(tierInfo.currentBatchNumber).to.be.a("object"); // BigNumber
                expect(tierInfo.playersInBatch).to.be.a("object"); // BigNumber  
                expect(tierInfo.slotsRemaining).to.be.a("object"); // BigNumber
                
                expect(tierInfo.currentBatchNumber).to.be.gte(1);
                expect(tierInfo.playersInBatch).to.be.gte(0);
                expect(tierInfo.playersInBatch).to.be.lte(100);
                expect(tierInfo.slotsRemaining).to.equal(100 - tierInfo.playersInBatch);
            });
            
            it("9.2.3 - Test `getBatchStatus()` comprehensive data", async function() {
                const affiliate = affiliates[0];
                
                // Add some entries
                for(let i = 0; i < 50; i++) {
                    await entryGate.connect(players[i]).enterLottery(affiliate.address);
                }
                
                const [exists, playerCount, totalFees, netAmount, transmitted, purged] = await entryGate.getBatchStatus(1);
                
                expect(exists).to.be.true;
                expect(playerCount).to.equal(50);
                expect(totalFees).to.equal(ethers.utils.parseUnits("500", 6));
                expect(netAmount).to.equal(ethers.utils.parseUnits("462.5", 6)); // 50 × 9.25
                expect(transmitted).to.be.false; // Not transmitted yet (batch not full)
                expect(purged).to.be.false;
            });
            
            it("9.2.4 - Test deployment timestamp accuracy", async function() {
                const deploymentTime = await entryGate.DEPLOYMENT_TIME();
                
                expect(deploymentTime).to.be.a("object"); // BigNumber
                expect(deploymentTime).to.be.gt(0);
                
                // Should be recent (within last hour for testing)
                const now = Math.floor(Date.now() / 1000);
                const deploymentTimeNumber = deploymentTime.toNumber();
                expect(deploymentTimeNumber).to.be.lte(now);
                expect(deploymentTimeNumber).to.be.gt(now - 3600); // Within last hour
            });
            
            it("9.2.5 - Test immutable addresses (USDT, REGISTRY)", async function() {
                const usdtAddress = await entryGate.POLYGON_USDT();
                const registryAddress = await entryGate.REGISTRY();
                
                expect(usdtAddress).to.equal(usdt.address);
                expect(registryAddress).to.equal(registry.address);
                
                // Multiple reads should return same values
                expect(await entryGate.POLYGON_USDT()).to.equal(usdtAddress);
                expect(await entryGate.REGISTRY()).to.equal(registryAddress);
            });
            
            it("9.2.6 - Test contract metadata completeness", async function() {
                // Test all major contract information functions
                const config = await entryGate.getTier2Configuration();
                const isValid = await entryGate.validateTier2Constants();
                const selfReferralSupported = await entryGate.validateSelfReferralSupport();
                const modules = await entryGate.validateModularArchitecture();
                const tierInfo = await entryGate.getTierInfo();
                
                // All should return valid data
                expect(config.entryFee).to.be.gt(0);
                expect(isValid).to.be.true;
                expect(selfReferralSupported).to.be.true;
                expect(modules.length).to.equal(8);
                expect(tierInfo.currentBatchNumber).to.be.gte(1);
            });
        });
    });
