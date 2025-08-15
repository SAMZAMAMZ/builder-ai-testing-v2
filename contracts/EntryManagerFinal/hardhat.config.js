require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("hardhat-gas-reporter");
require("solidity-coverage");

/**
 * Hardhat configuration for EntryManagerFinal testing
 * Optimized for Builder-AI execution on Railway
 */

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  
  networks: {
    hardhat: {
      // Local testing network
      chainId: 31337,
      gas: "auto",
      gasPrice: "auto",
      gasMultiplier: 1.2,
      blockGasLimit: 30000000,
      allowUnlimitedContractSize: true,
      accounts: {
        count: 300, // Need 200+ accounts for comprehensive testing
        accountsBalance: "10000000000000000000000" // 10,000 ETH per account
      },
      forking: {
        // Fork Polygon mainnet for realistic testing
        url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
        blockNumber: undefined // Use latest block
      }
    },
    
    polygon_amoy: {
      // Polygon Amoy testnet for integration testing
      url: process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gas: "auto",
      gasPrice: "auto"
    },
    
    polygon_mainnet: {
      // Polygon mainnet for production deployment
      url: process.env.POLYGON_MAINNET_RPC_URL || "https://polygon-rpc.com",
      chainId: 137,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gas: "auto",
      gasPrice: "auto"
    }
  },
  
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    gasPrice: 30, // gwei
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    token: "MATIC",
    gasPriceApi: "https://api.polygonscan.com/api?module=proxy&action=eth_gasPrice"
  },
  
  mocha: {
    timeout: 600000, // 10 minutes for comprehensive testing
    bail: false, // Continue running tests even if some fail
    reporter: "spec"
  },
  
  paths: {
    sources: "./contracts",
    tests: "./",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
