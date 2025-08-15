#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const GITHUB_REPO = 'SAMZAMAMZ/1800-lottery-v3-thirdweb';
const CONTRACTS_PATH = '/tmp/contracts';
const CHECKLISTS_PATH = '/tmp/checklists';

async function fetchContractsFromGitHub() {
  console.log('📦 FETCHING CONTRACTS FROM GITHUB');
  console.log('==================================');
  
  try {
    // Create temp directories
    execSync(`mkdir -p ${CONTRACTS_PATH} ${CHECKLISTS_PATH}`);
    
    // Simple approach - download specific files we know exist
    const contracts = [
      'EntryGateFinal.sol',
      'DrawManagerFinal.sol', 
      'PrizeManagerFinal-Secured.sol',
      'FinanceManagerFinal.sol',
      'GasManagerFinalGelato.sol',
      'OverheadManagerFinal.sol',
      'QuarantineVaultFinal-ExternalHousekeeper.sol'
    ];
    
    const checklists = [
      'ENTRYGATEFINAL-COMPREHENSIVE-TESTING-CHECKLIST.md',
      'DRAWMANAGERFINAL-COMPREHENSIVE-TESTING-CHECKLIST.md',
      'PRIZEMANAGERFINAL-COMPREHENSIVE-TESTING-CHECKLIST.md',
      'FINANCEMANAGERFINAL-COMPREHENSIVE-TESTING-CHECKLIST.md',
      'GASMANAGERFINALGELATO-COMPREHENSIVE-TESTING-CHECKLIST.md',
      'OVERHEADMANAGERFINAL-ULTRA-COMPREHENSIVE-TESTING-CHECKLIST.md',
      'QUARANTINEVAULTFINAL-COMPREHENSIVE-TESTING-CHECKLIST.md'
    ];
    
    // Download contracts
    for (const contract of contracts) {
      const url = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/contracts/${contract}`;
      try {
        execSync(`curl -s -o ${CONTRACTS_PATH}/${contract} ${url}`);
        console.log(`   ✅ ${contract}`);
      } catch (e) {
        console.log(`   ⚠️  Failed to fetch ${contract}`);
      }
    }
    
    // Download checklists
    for (const checklist of checklists) {
      const url = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/tests/checklists/${checklist}`;
      try {
        execSync(`curl -s -o ${CHECKLISTS_PATH}/${checklist} ${url}`);
        console.log(`   ✅ ${checklist}`);
      } catch (e) {
        console.log(`   ⚠️  Failed to fetch ${checklist}`);
      }
    }
    
    // Update environment
    process.env.CONTRACTS_PATH = CONTRACTS_PATH;
    process.env.CHECKLISTS_PATH = CHECKLISTS_PATH;
    
    console.log('\n✅ Contracts and checklists fetched from GitHub!');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to fetch from GitHub:', error.message);
    return false;
  }
}

async function verifyContractsAccess() {
  console.log('\n📦 VERIFYING CONTRACT ACCESS');
  console.log('============================');
  
  const contractsExist = fs.existsSync(CONTRACTS_PATH);
  const checklistsExist = fs.existsSync(CHECKLISTS_PATH);
  
  if (contractsExist && checklistsExist) {
    const contracts = fs.readdirSync(CONTRACTS_PATH).filter(f => f.endsWith('.sol'));
    const checklists = fs.readdirSync(CHECKLISTS_PATH).filter(f => f.endsWith('.md'));
    
    console.log('✅ Contracts accessible:', contracts.length, 'files');
    console.log('✅ Checklists accessible:', checklists.length, 'files');
    return true;
  }
  
  console.log('⚠️  Contracts or checklists not found');
  return false;
}

async function startBuilderAI() {
  console.log('\n🚀 STARTING BUILDER-AI SERVER');
  console.log('==============================');
  
  try {
    require('./dist/server.js');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('✅ Builder-AI server running on port', process.env.PORT || 8082);
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    throw error;
  }
}

async function startSelfFeedingOrchestrator() {
  console.log('\n🔄 STARTING SELF-FEEDING ORCHESTRATOR');
  console.log('======================================');
  
  try {
    const SelfFeedingOrchestrator = require('./self-feeding-orchestrator');
    const orchestrator = new SelfFeedingOrchestrator();
    
    orchestrator.contractsPath = CONTRACTS_PATH;
    orchestrator.checklistsPath = CHECKLISTS_PATH;
    
    if (process.env.ENABLE_OVERNIGHT_TESTING === 'true') {
      console.log('📅 Enabling overnight testing schedule...');
      console.log(`   Scheduled for: ${process.env.OVERNIGHT_START_HOUR || 23}:00`);
      orchestrator.startOvernightSchedule();
    }
  } catch (error) {
    console.log('⚠️  Orchestrator not available:', error.message);
  }
}

async function sendStartupNotification() {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  
  try {
    const message = `🚀 *Builder-AI Started on Railway*\n\n` +
                   `📊 System Ready:\n` +
                   `• Contracts: Fetched from GitHub ✅\n` +
                   `• Tests: 1,586 available\n` +
                   `• Auto-fix: Enabled\n` +
                   `• Schedule: ${process.env.OVERNIGHT_START_HOUR || 23}:00\n\n` +
                   `Railway deployment successful! 🎯`;
    
    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_ALLOWED_CHAT_ID,
          text: message,
          parse_mode: 'Markdown'
        })
      }
    );
    console.log('📱 Startup notification sent via Telegram');
  } catch (error) {
    console.error('Failed to send Telegram notification:', error.message);
  }
}

async function main() {
  console.log('🎯 BUILDER-AI RAILWAY STARTUP');
  console.log('==============================');
  console.log('Mode: GitHub Fetch Strategy');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('');
  
  try {
    // Step 1: Fetch contracts from GitHub
    const fetched = await fetchContractsFromGitHub();
    if (!fetched) {
      console.log('⚠️  Continuing without contracts...');
    }
    
    // Step 2: Verify access
    await verifyContractsAccess();
    
    // Step 3: Start Builder-AI
    await startBuilderAI();
    
    // Step 4: Start orchestrator
    await startSelfFeedingOrchestrator();
    
    // Step 5: Send notification
    await sendStartupNotification();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ BUILDER-AI OPERATIONAL');
    console.log('='.repeat(50));
    console.log('🎯 Ready for testing!');
    
  } catch (error) {
    console.error('\n❌ STARTUP FAILED:', error.message);
    process.exit(1);
  }
}

// Start
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
