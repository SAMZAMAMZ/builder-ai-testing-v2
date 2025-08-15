require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");

/**
 * Simplified Hardhat configuration for local testing
 * Removes problematic dependencies and forking
 */

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
            // Local testing network only
            chainId: 31337,
            gas: "auto",
            gasPrice: "auto",
            blockGasLimit: 30000000,
            allowUnlimitedContractSize: true,
            accounts: {
                count: 300, // Need 200 accounts for comprehensive testing
                accountsBalance: "10000000000000000000000" // 10,000 ETH per account
            }
            // Removed forking to avoid dependency issues
        }
    },

    mocha: {
        timeout: 300000, // 5 minutes
        bail: false,
        reporter: "spec"
    },

    paths: {
        sources: "./contracts",
        tests: "./",
        cache: "./cache",
        artifacts: "./artifacts"
    }
};
