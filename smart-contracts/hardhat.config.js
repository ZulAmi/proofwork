require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-verify");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("hardhat-contract-sizer");
require("dotenv").config();

// Import private keys and API configurations from .env file
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "";
const OPTIMISM_API_KEY = process.env.OPTIMISM_API_KEY || "";

// Default RPC URLs for development
const DEFAULT_OPTIMISM_RPC_URL = "https://goerli.optimism.io";
const DEFAULT_POLYGON_RPC_URL = "https://polygon-mumbai.g.alchemy.com/v2/demo";
const DEFAULT_GOERLI_RPC_URL = "https://goerli.infura.io/v3/your-key";
const DEFAULT_SEPOLIA_RPC_URL = "https://sepolia.infura.io/v3/your-key";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
                details: {
                    yul: true,
                    yulDetails: {
                        stackAllocation: true,
                        optimizerSteps: "dhfoDgvulfnTUtnIf"
                    }
                }
            },
            viaIR: true
        }
    },

    // Network configurations
    networks: {
        // Development networks
        hardhat: {
            chainId: 31337,
            gasPrice: "auto"
        },
        localhost: {
            url: "http://127.0.0.1:8545",
            chainId: 31337,
            gasPrice: "auto"
        },

        // Ethereum testnets
        goerli: {
            url: process.env.GOERLI_RPC_URL || DEFAULT_GOERLI_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 5,
            gasPrice: "auto",
            gasMultiplier: 1.2,
            verify: {
                etherscan: {
                    apiKey: ETHERSCAN_API_KEY
                }
            }
        },
        sepolia: {
            url: process.env.SEPOLIA_RPC_URL || DEFAULT_SEPOLIA_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 11155111,
            gasPrice: "auto",
            gasMultiplier: 1.2,
            verify: {
                etherscan: {
                    apiKey: ETHERSCAN_API_KEY
                }
            }
        },

        // L2 chains - Optimism
        optimismGoerli: {
            url: process.env.OPTIMISM_GOERLI_RPC_URL || DEFAULT_OPTIMISM_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 420,
            gasPrice: "auto",
            verify: {
                etherscan: {
                    apiKey: OPTIMISM_API_KEY,
                    apiUrl: "https://api-goerli-optimistic.etherscan.io"
                }
            }
        },
        optimismMainnet: {
            url: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
            accounts: [PRIVATE_KEY],
            chainId: 10,
            gasPrice: "auto",
            verify: {
                etherscan: {
                    apiKey: OPTIMISM_API_KEY,
                    apiUrl: "https://api-optimistic.etherscan.io"
                }
            }
        },

        // L2 chains - Polygon
        polygonMumbai: {
            url: process.env.POLYGON_MUMBAI_RPC_URL || DEFAULT_POLYGON_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 80001,
            gasPrice: "auto",
            gasMultiplier: 1.5,
            verify: {
                etherscan: {
                    apiKey: POLYGONSCAN_API_KEY
                }
            }
        },
        polygonMainnet: {
            url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
            accounts: [PRIVATE_KEY],
            chainId: 137,
            gasPrice: "auto",
            gasMultiplier: 1.5,
            verify: {
                etherscan: {
                    apiKey: POLYGONSCAN_API_KEY
                }
            }
        }
    },

    // Etherscan verification configuration
    etherscan: {
        apiKey: {
            goerli: ETHERSCAN_API_KEY,
            sepolia: ETHERSCAN_API_KEY,
            optimisticGoerli: OPTIMISM_API_KEY,
            optimisticEthereum: OPTIMISM_API_KEY,
            polygonMumbai: POLYGONSCAN_API_KEY,
            polygon: POLYGONSCAN_API_KEY
        },
        customChains: [
            {
                network: "optimisticGoerli",
                chainId: 420,
                urls: {
                    apiURL: "https://api-goerli-optimistic.etherscan.io/api",
                    browserURL: "https://goerli-optimistic.etherscan.io"
                }
            }
        ]
    },

    // Gas reporter configuration
    gasReporter: {
        enabled: process.env.REPORT_GAS !== undefined,
        currency: "USD",
        coinmarketcap: process.env.COINMARKETCAP_API_KEY || "",
        token: "ETH",
        gasPriceApi: "https://api.etherscan.io/api?module=proxy&action=eth_gasPrice",
        outputFile: process.env.GAS_REPORT_FILE,
        noColors: !!process.env.GAS_REPORT_FILE
    },

    // Contract size optimization tracking
    contractSizer: {
        alphaSort: true,
        disambiguatePaths: false,
        runOnCompile: true,
        strict: true
    },

    // Mocha test configuration
    mocha: {
        timeout: 60000 // 1 minute
    },

    // Path configurations
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    },
};