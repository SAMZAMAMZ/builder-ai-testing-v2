require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("hardhat-gas-reporter");

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  
  networks: {
    hardhat: {
      chainId: 31337,
      gas: "auto",
      allowUnlimitedContractSize: true,
      accounts: {
        count: 200,
        accountsBalance: "10000000000000000000000"
      }
    }
  },
  
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    gasPrice: 30,
    token: "MATIC"
  },
  
  mocha: {
    timeout: 600000,
    bail: false
  }
};
