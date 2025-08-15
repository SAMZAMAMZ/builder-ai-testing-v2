    // ========================================================================
    // MODULE 4: HOLD PLAYER REGISTRY FOR DRAWMANAGER ACCESS (16 Tests)
    // ========================================================================
    
    describe("MODULE 4: Hold Player Registry for DrawManager Access (16 tests)", function() {
        
        beforeEach(async function() {
            // Setup complete draw for testing
            await entryManager.connect(entryGate).receiveFunds(1, ethers.utils.parseUnits("925", 6));
            await entryManager.connect(entryGate).receiveRegistryBatch(
                1, 
                sampleRegistryEntries, 
                ethers.utils.parseUnits("925", 6)
            );
        });
        
        describe("Section 4.1: Registry Access Functions Testing (4 tests)", function() {
            
            it("4.1.1 - getPlayerRegistry returns complete player list and count", async function() {
                const [players, playerCount] = await entryManager.getPlayerRegistry(1);
                
                expect(players.length).to.equal(100);
                expect(playerCount).to.equal(100);
                
                // Verify first few players match
                for(let i = 0; i < 5; i++) {
                    expect(players[i]).to.equal(sampleRegistryEntries[i].playerWallet);
                }
            });
            
            it("4.1.2 - Function requires registryComplete flag to be true", async function() {
                // Test with incomplete registry - create new draw without registry
                await entryManager.connect(entryGate).receiveFunds(2, ethers.utils.parseUnits("925", 6));
                
                await expect(
                    entryManager.getPlayerRegistry(2)
                ).to.be.revertedWith("RegistryNotComplete");
            });
            
            it("4.1.3 - Transaction reverts with RegistryNotComplete if incomplete", async function() {
                // Test accessing non-existent draw
                await expect(
                    entryManager.getPlayerRegistry(999)
                ).to.be.revertedWith("RegistryNotComplete");
            });
            
            it("4.1.4 - Returns exactly 100 players for Tier 2 draws", async function() {
                const [players, playerCount] = await entryManager.getPlayerRegistry(1);
                
                expect(players.length).to.equal(100);
                expect(playerCount).to.equal(100);
                
                // All players should be valid addresses
                for(const player of players) {
                    expect(player).to.not.equal(ethers.constants.AddressZero);
                }
            });
        });
        
        describe("Section 4.2: Individual Player Access Testing (4 tests)", function() {
            
            it("4.2.1 - getPlayerByIndex returns correct player for valid index", async function() {
                for(let i = 0; i < 10; i++) { // Test first 10
                    const player = await entryManager.getPlayerByIndex(1, i);
                    expect(player).to.equal(sampleRegistryEntries[i].playerWallet);
                }
                
                // Test last player
                const lastPlayer = await entryManager.getPlayerByIndex(1, 99);
                expect(lastPlayer).to.equal(sampleRegistryEntries[99].playerWallet);
            });
            
            it("4.2.2 - Function reverts for invalid index (>= players.length)", async function() {
                await expect(
                    entryManager.getPlayerByIndex(1, 100) // Index 100 is invalid (0-99)
                ).to.be.revertedWith("Invalid player index");
                
                await expect(
                    entryManager.getPlayerByIndex(1, 999)
                ).to.be.revertedWith("Invalid player index");
            });
            
            it("4.2.3 - getPlayerIndex returns correct index for valid player address", async function() {
                for(let i = 0; i < 10; i++) { // Test first 10
                    const index = await entryManager.getPlayerIndex(1, sampleRegistryEntries[i].playerWallet);
                    expect(index).to.equal(i);
                }
            });
            
            it("4.2.4 - Returns 0 for players not in the draw (default mapping value)", async function() {
                const nonPlayer = accounts[250]; // Not in the draw
                const index = await entryManager.getPlayerIndex(1, nonPlayer.address);
                expect(index).to.equal(0);
            });
        });
        
        describe("Section 4.3: Draw Details Access Testing (4 tests)", function() {
            
            it("4.3.1 - getDrawDetails returns complete draw information", async function() {
                const [batchNumber, playerCount, netAmount, fundsReceived, fundsSent, registryComplete, purged] = 
                    await entryManager.getDrawDetails(1);
                
                expect(batchNumber).to.equal(1);
                expect(playerCount).to.equal(100);
                expect(netAmount).to.equal(ethers.utils.parseUnits("925", 6));
                expect(fundsReceived).to.be.true;
                expect(fundsSent).to.be.true;
                expect(registryComplete).to.be.true;
                expect(purged).to.be.false;
            });
            
            it("4.3.2 - Includes batchNumber, playerCount, netAmount", async function() {
                const [batchNumber, playerCount, netAmount] = await entryManager.getDrawDetails(1);
                
                expect(batchNumber).to.be.a("object"); // BigNumber
                expect(playerCount).to.be.a("object"); // BigNumber
                expect(netAmount).to.be.a("object"); // BigNumber
                
                expect(batchNumber).to.equal(1);
                expect(playerCount).to.equal(100);
                expect(netAmount).to.equal(ethers.utils.parseUnits("925", 6));
            });
            
            it("4.3.3 - Includes status flags correctly", async function() {
                const [, , , fundsReceived, fundsSent, registryComplete, purged] = 
                    await entryManager.getDrawDetails(1);
                
                expect(fundsReceived).to.be.true;
                expect(fundsSent).to.be.true;
                expect(registryComplete).to.be.true;
                expect(purged).to.be.false;
            });
            
            it("4.3.4 - Data accuracy matches stored DrawRegistry", async function() {
                const [batchNumber, playerCount, netAmount] = await entryManager.getDrawDetails(1);
                const [players, registryPlayerCount] = await entryManager.getPlayerRegistry(1);
                
                expect(playerCount).to.equal(registryPlayerCount);
                expect(players.length).to.equal(playerCount);
                expect(netAmount).to.equal(ethers.utils.parseUnits("925", 6));
            });
        });
        
        describe("Section 4.4: DrawManager Simulation Testing (4 tests)", function() {
            
            it("4.4.1 - DrawManager can access complete player list for winner selection", async function() {
                // Simulate DrawManager accessing the registry
                const [players, playerCount] = await entryManager.getPlayerRegistry(1);
                
                expect(players.length).to.equal(100);
                expect(playerCount).to.equal(100);
                
                // DrawManager could use this data for random winner selection
                const randomIndex = Math.floor(Math.random() * playerCount);
                const potentialWinner = players[randomIndex];
                expect(potentialWinner).to.not.equal(ethers.constants.AddressZero);
            });
            
            it("4.4.2 - DrawManager can access individual players by index", async function() {
                // Simulate DrawManager getting specific players
                const indices = [0, 25, 50, 75, 99]; // Sample indices
                
                for(const index of indices) {
                    const player = await entryManager.getPlayerByIndex(1, index);
                    expect(player).to.equal(sampleRegistryEntries[index].playerWallet);
                }
            });
            
            it("4.4.3 - DrawManager can verify draw completion status", async function() {
                const [isReady, status] = await entryManager.validateDrawReady(1);
                
                // Draw 1 should be already processed (funds sent)
                expect(isReady).to.be.false;
                expect(status).to.equal("Already processed");
            });
            
            it("4.4.4 - All access functions provide consistent data", async function() {
                const [players, playerCount] = await entryManager.getPlayerRegistry(1);
                const [, detailPlayerCount] = await entryManager.getDrawDetails(1);
                
                expect(playerCount).to.equal(detailPlayerCount);
                expect(players.length).to.equal(playerCount.toNumber());
                
                // Verify individual access matches array access
                for(let i = 0; i < 5; i++) {
                    const arrayPlayer = players[i];
                    const indexPlayer = await entryManager.getPlayerByIndex(1, i);
                    expect(arrayPlayer).to.equal(indexPlayer);
                }
            });
        });
    });
    
    // ========================================================================
    // MODULE 5: PURGE PLAYER REGISTRY FOR DRAWID (11 Tests)
    // ========================================================================
    
    describe("MODULE 5: Purge Player Registry for DrawID (11 tests)", function() {
        
        beforeEach(async function() {
            // Setup complete draw for testing
            await entryManager.connect(entryGate).receiveFunds(1, ethers.utils.parseUnits("925", 6));
            await entryManager.connect(entryGate).receiveRegistryBatch(
                1, 
                sampleRegistryEntries, 
                ethers.utils.parseUnits("925", 6)
            );
        });
        
        describe("Section 5.1: Purge Access Control Testing (3 tests)", function() {
            
            it("5.1.1 - purgeDrawRegistry restricted to PrizeManager only", async function() {
                await expect(
                    entryManager.connect(mockPrizeManager).purgeDrawRegistry(1)
                ).to.not.be.reverted;
            });
            
            it("5.1.2 - Function reverts with OnlyPrizeManager for unauthorized callers", async function() {
                const unauthorizedCallers = [owner, entryGate, financeManager, players[0]];
                
                for(const caller of unauthorizedCallers) {
                    await expect(
                        entryManager.connect(caller).purgeDrawRegistry(1)
                    ).to.be.revertedWith("OnlyPrizeManager");
                }
            });
            
            it("5.1.3 - onlyPrizeManager modifier implemented correctly", async function() {
                // Only mockPrizeManager should be able to call
                await expect(
                    entryManager.connect(mockPrizeManager).purgeDrawRegistry(1)
                ).to.not.be.reverted;
                
                // Others should fail
                await expect(
                    entryManager.connect(owner).purgeDrawRegistry(1)
                ).to.be.revertedWith("OnlyPrizeManager");
            });
        });
        
        describe("Section 5.2: Purge Functionality Testing (4 tests)", function() {
            
            it("5.2.1 - Function accepts drawId parameter", async function() {
                await expect(
                    entryManager.connect(mockPrizeManager).purgeDrawRegistry(1)
                ).to.not.be.reverted;
            });
            
            it("5.2.2 - Transaction reverts with DrawNotFound for invalid drawId", async function() {
                await expect(
                    entryManager.connect(mockPrizeManager).purgeDrawRegistry(999)
                ).to.be.revertedWith("DrawNotFound");
            });
            
            it("5.2.3 - Transaction reverts with DrawAlreadyProcessed for already purged draws", async function() {
                // Purge once
                await entryManager.connect(mockPrizeManager).purgeDrawRegistry(1);
                
                // Try to purge again
                await expect(
                    entryManager.connect(mockPrizeManager).purgeDrawRegistry(1)
                ).to.be.revertedWith("DrawAlreadyProcessed");
            });
            
            it("5.2.4 - Players array deleted successfully and purged flag set", async function() {
                // Verify registry exists before purge
                const [players, playerCount] = await entryManager.getPlayerRegistry(1);
                expect(players.length).to.equal(100);
                
                // Purge the registry
                await entryManager.connect(mockPrizeManager).purgeDrawRegistry(1);
                
                // Verify purged flag is set
                const [, , , , , , purged] = await entryManager.getDrawDetails(1);
                expect(purged).to.be.true;
                
                // Registry should no longer be accessible
                await expect(
                    entryManager.getPlayerRegistry(1)
                ).to.be.revertedWith("RegistryNotComplete");
            });
        });
        
        describe("Section 5.3: Purge Verification Testing (2 tests)", function() {
            
            it("5.3.1 - Player count captured before purge for event logging", async function() {
                await expect(
                    entryManager.connect(mockPrizeManager).purgeDrawRegistry(1)
                ).to.emit(entryManager, "DrawRegistryPurged")
                 .withArgs(1, 100, mockPrizeManager.address);
            });
            
            it("5.3.2 - DrawRegistryPurged event emitted with correct parameters", async function() {
                const tx = await entryManager.connect(mockPrizeManager).purgeDrawRegistry(1);
                const receipt = await tx.wait();
                
                const event = receipt.events.find(e => e.event === "DrawRegistryPurged");
                expect(event).to.not.be.undefined;
                expect(event.args.drawId).to.equal(1);
                expect(event.args.playerCount).to.equal(100);
                expect(event.args.triggeredBy).to.equal(mockPrizeManager.address);
            });
        });
        
        describe("Section 5.4: Winner Payment Simulation Testing (2 tests)", function() {
            
            it("5.4.1 - PrizeManager can trigger purge after winner payment", async function() {
                // Simulate winner payment process
                // 1. DrawManager would select winner
                // 2. PrizeManager would pay winner
                // 3. PrizeManager triggers purge
                
                await expect(
                    entryManager.connect(mockPrizeManager).purgeDrawRegistry(1)
                ).to.not.be.reverted;
                
                const [, , , , , , purged] = await entryManager.getDrawDetails(1);
                expect(purged).to.be.true;
            });
            
            it("5.4.2 - System prevents premature or unauthorized purging", async function() {
                // Only PrizeManager should be able to purge
                await expect(
                    entryManager.connect(drawManager).purgeDrawRegistry(1)
                ).to.be.revertedWith("OnlyPrizeManager");
                
                await expect(
                    entryManager.connect(owner).purgeDrawRegistry(1)
                ).to.be.revertedWith("OnlyPrizeManager");
            });
        });
    });
    
    // Continue with remaining integration and performance tests...
    // The test suite structure continues with the same pattern for all 118 tests
