require("@nomicfoundation/hardhat-toolbox");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("hardhat-contract-sizer");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "";
const OPTIMISM_API_KEY = process.env.OPTIMISM_API_KEY || "";

const DEFAULT_OPTIMISM_RPC_URL = "https://goerli.optimism.io";
const DEFAULT_POLYGON_RPC_URL = "https://polygon-mumbai.g.alchemy.com/v2/demo";
const DEFAULT_GOERLI_RPC_URL = "https://goerli.infura.io/v3/your-key";
const DEFAULT_SEPOLIA_RPC_URL = "https://sepolia.infura.io/v3/your-key";

module.exports = {
    solidity: {
        version: "0.8.19",
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
            gasPrice: "auto"
        },
        localhost: {
            url: "http://127.0.0.1:8545",
            chainId: 31337,
            gasPrice: "auto"
        },
        goerli: {
            url: process.env.GOERLI_RPC_URL || DEFAULT_GOERLI_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 5,
            gasPrice: "auto",
            gasMultiplier: 1.2
        },
        sepolia: {
            url: process.env.SEPOLIA_RPC_URL || DEFAULT_SEPOLIA_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 11155111,
            gasPrice: "auto",
            gasMultiplier: 1.2
        },
        optimismGoerli: {
            url: process.env.OPTIMISM_GOERLI_RPC_URL || DEFAULT_OPTIMISM_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 420,
            gasPrice: "auto"
        },
        optimismMainnet: {
            url: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
            accounts: [PRIVATE_KEY],
            chainId: 10,
            gasPrice: "auto"
        },
        polygonMumbai: {
            url: process.env.POLYGON_MUMBAI_RPC_URL || DEFAULT_POLYGON_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 80001,
            gasPrice: "auto",
            gasMultiplier: 1.5
        },
        polygonMainnet: {
            url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
            accounts: [PRIVATE_KEY],
            chainId: 137,
            gasPrice: "auto",
            gasMultiplier: 1.5
        },
        optimism: {
            url: process.env.OPTIMISM_RPC_URL || "",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
        },
        polygon: {
            url: process.env.POLYGON_RPC_URL || "",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
        }
    },
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
    gasReporter: {
        enabled: process.env.REPORT_GAS !== undefined,
        currency: "USD",
        coinmarketcap: process.env.COINMARKETCAP_API_KEY || "",
        token: "ETH",
        gasPriceApi: "https://api.etherscan.io/api?module=proxy&action=eth_gasPrice",
        outputFile: process.env.GAS_REPORT_FILE,
        noColors: !!process.env.GAS_REPORT_FILE
    },
    contractSizer: {
        alphaSort: true,
        disambiguatePaths: false,
        runOnCompile: true,
        strict: true
    },
    mocha: {
        timeout: 60000
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    }
};