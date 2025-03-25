const { ethers } = require('ethers');
const contractABI = require('../../artifacts/contracts/FreelancerReputationSystem.sol/FreelancerReputationSystem.json').abi;
require('dotenv').config();

/**
 * Web3 Client for FreelancerReputation System
 * Handles all blockchain interactions including reputation reading, review submission,
 * and event listening with support for multiple networks
 */
class FreelancerReputationWeb3Client {
    constructor() {
        // Network configuration
        this.networks = {
            ethereum: {
                name: 'Ethereum Mainnet',
                chainId: 1,
                rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key',
                blockExplorer: 'https://etherscan.io'
            },
            polygon: {
                name: 'Polygon Mainnet',
                chainId: 137,
                rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-mainnet.g.alchemy.com/v2/your-api-key',
                blockExplorer: 'https://polygonscan.com'
            },
            optimism: {
                name: 'Optimism Mainnet',
                chainId: 10,
                rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://opt-mainnet.g.alchemy.com/v2/your-api-key',
                blockExplorer: 'https://optimistic.etherscan.io'
            },
            polygonMumbai: {
                name: 'Polygon Mumbai Testnet',
                chainId: 80001,
                rpcUrl: process.env.POLYGON_MUMBAI_RPC_URL || 'https://polygon-mumbai.g.alchemy.com/v2/your-api-key',
                blockExplorer: 'https://mumbai.polygonscan.com'
            },
            hardhat: {
                name: 'Hardhat Local',
                chainId: 31337,
                rpcUrl: 'http://127.0.0.1:8545',
                blockExplorer: ''
            }
        };

        // Contract addresses by network
        this.contractAddresses = {
            ethereum: process.env.ETHEREUM_CONTRACT_ADDRESS,
            polygon: process.env.POLYGON_CONTRACT_ADDRESS,
            optimism: process.env.OPTIMISM_CONTRACT_ADDRESS,
            polygonMumbai: process.env.POLYGON_MUMBAI_CONTRACT_ADDRESS,
            hardhat: process.env.HARDHAT_CONTRACT_ADDRESS
        };

        // Initialize providers
        this.providers = {};
        this.contracts = {};
        this.eventSubscriptions = new Map();

        // Configure default network
        this.defaultNetwork = process.env.DEFAULT_NETWORK || 'hardhat';

        // Initialize providers for all networks
        this.initializeProviders();

        // Track if we're in a browser environment
        this.isBrowser = typeof window !== 'undefined' && window.ethereum;
    }

    /**
     * Initialize providers for all configured networks
     */
    initializeProviders() {
        for (const [networkId, network] of Object.entries(this.networks)) {
            try {
                // Create provider
                this.providers[networkId] = new ethers.providers.JsonRpcProvider(network.rpcUrl);

                // Only initialize contract if address exists
                if (this.contractAddresses[networkId]) {
                    this.contracts[networkId] = new ethers.Contract(
                        this.contractAddresses[networkId],
                        contractABI,
                        this.providers[networkId]
                    );
                }
            } catch (error) {
                console.error(`Failed to initialize provider for ${networkId}:`, error);
            }
        }
    }

    /**
     * Get contract instance for specified network
     * @param {string} network - Network ID
     * @param {ethers.Signer} [signer] - Optional signer to connect contract with
     * @returns {ethers.Contract} - Contract instance
     */
    getContract(network = this.defaultNetwork, signer = null) {
        if (!this.contracts[network]) {
            throw new Error(`Contract not configured for network: ${network}`);
        }

        if (signer) {
            return this.contracts[network].connect(signer);
        }

        return this.contracts[network];
    }

    /**
     * Get network configuration
     * @param {string} network - Network ID
     * @returns {object} - Network configuration
     */
    getNetworkConfig(network = this.defaultNetwork) {
        if (!this.networks[network]) {
            throw new Error(`Network not configured: ${network}`);
        }

        return {
            ...this.networks[network],
            contractAddress: this.contractAddresses[network]
        };
    }

    /**
     * Connect to MetaMask wallet
     * @returns {Promise<object>} - Connection info with address and chainId
     */
    async connectWallet() {
        if (!this.isBrowser) {
            throw new Error('MetaMask connection only available in browser environment');
        }

        try {
            // Request account access
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const address = accounts[0];

            // Get connected chain ID
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });

            // Create ethers provider using browser provider
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();

            // Get network name
            const networkName = this.getNetworkNameFromChainId(parseInt(chainId, 16));

            return {
                address,
                chainId: parseInt(chainId, 16),
                networkName,
                signer,
                provider
            };
        } catch (error) {
            console.error('Error connecting to wallet:', error);
            throw new Error(`Failed to connect wallet: ${error.message}`);
        }
    }

    /**
     * Get network name from chain ID
     * @param {number} chainId - Chain ID as integer
     * @returns {string} - Network name or 'unknown'
     */
    getNetworkNameFromChainId(chainId) {
        for (const [networkId, network] of Object.entries(this.networks)) {
            if (network.chainId === chainId) {
                return networkId;
            }
        }
        return 'unknown';
    }

    /**
     * Switch network in MetaMask
     * @param {string} networkId - Target network ID
     * @returns {Promise<boolean>} - True if successful
     */
    async switchNetwork(networkId) {
        if (!this.isBrowser) {
            throw new Error('Network switching only available in browser environment');
        }

        const network = this.networks[networkId];
        if (!network) {
            throw new Error(`Network not configured: ${networkId}`);
        }

        try {
            // Try to switch to the network
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${network.chainId.toString(16)}` }]
            });
            return true;
        } catch (error) {
            // If the error code is 4902, the chain is not added to MetaMask
            if (error.code === 4902) {
                try {
                    // Add the network
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [
                            {
                                chainId: `0x${network.chainId.toString(16)}`,
                                chainName: network.name,
                                nativeCurrency: {
                                    name: networkId === 'polygon' || networkId === 'polygonMumbai' ? 'MATIC' : 'ETH',
                                    symbol: networkId === 'polygon' || networkId === 'polygonMumbai' ? 'MATIC' : 'ETH',
                                    decimals: 18
                                },
                                rpcUrls: [network.rpcUrl],
                                blockExplorerUrls: [network.blockExplorer]
                            }
                        ]
                    });
                    return true;
                } catch (addError) {
                    console.error('Failed to add network to MetaMask:', addError);
                    throw new Error(`Failed to add network to MetaMask: ${addError.message}`);
                }
            } else {
                console.error('Failed to switch network:', error);
                throw new Error(`Failed to switch network: ${error.message}`);
            }
        }
    }

    /**
     * Get a freelancer's reputation from the blockchain
     * @param {string} freelancerAddress - Ethereum address of the freelancer
     * @param {string} network - Network to query
     * @returns {Promise<object>} - Reputation data
     */
    async getFreelancerReputation(freelancerAddress, network = this.defaultNetwork) {
        try {
            const contract = this.getContract(network);

            // Validate address format
            if (!ethers.utils.isAddress(freelancerAddress)) {
                throw new Error('Invalid Ethereum address format');
            }

            // Get reputation from contract
            const [averageRating, reviewCount] = await contract.getFreelancerReputation(freelancerAddress);

            // Get freelancer data
            const freelancerData = await contract.freelancers(freelancerAddress);

            return {
                address: freelancerAddress,
                isRegistered: freelancerData.isRegistered,
                averageRating: averageRating.toNumber() / 100, // Convert from scaled integer
                reviewCount: reviewCount.toNumber(),
                totalRating: freelancerData.totalRating.toNumber(),
                network
            };
        } catch (error) {
            console.error(`Error getting freelancer reputation for ${freelancerAddress}:`, error);
            throw new Error(`Failed to get reputation: ${error.message}`);
        }
    }

    /**
     * Submit a new review for a freelancer
     * @param {object} params - Review parameters
     * @param {string} params.freelancerAddress - Address of the freelancer
     * @param {number} params.rating - Rating (1-5)
     * @param {string} params.comment - Review comment
     * @param {ethers.Signer} params.signer - Signer object for the transaction
     * @param {string} params.network - Network to submit to
     * @returns {Promise<object>} - Transaction result
     */
    async submitReview({ freelancerAddress, rating, comment, signer, network = this.defaultNetwork }) {
        try {
            // Input validation
            if (!ethers.utils.isAddress(freelancerAddress)) {
                throw new Error('Invalid freelancer address');
            }

            if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
                throw new Error('Rating must be an integer between 1 and 5');
            }

            if (!comment || comment.length > 280) {
                throw new Error('Comment is required and must be under 280 characters');
            }

            if (!signer) {
                throw new Error('Signer is required to submit a review');
            }

            // Get contract with signer
            const contract = this.getContract(network, signer);

            // Check if client has already reviewed this freelancer
            const clientAddress = await signer.getAddress();
            const hasReviewed = await contract.hasClientReviewedFreelancer(clientAddress, freelancerAddress);

            if (hasReviewed) {
                throw new Error('You have already reviewed this freelancer');
            }

            // Estimate gas for the transaction
            const gasEstimate = await contract.estimateGas.leaveReview(freelancerAddress, rating, comment);

            // Add 10% buffer to gas estimate for safety
            const gasLimit = gasEstimate.mul(110).div(100);

            // Get gas price (use EIP-1559 for supported networks)
            let gasPriceInfo = {};
            try {
                const feeData = await signer.provider.getFeeData();
                if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
                    // Use EIP-1559 fee structure
                    gasPriceInfo = {
                        maxFeePerGas: feeData.maxFeePerGas,
                        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
                    };
                } else {
                    // Fallback to legacy gas price
                    gasPriceInfo = { gasPrice: feeData.gasPrice };
                }
            } catch (error) {
                console.warn('Error getting fee data:', error);
                // Don't set gas price - let the provider handle it
            }

            // Submit the review transaction
            const tx = await contract.leaveReview(
                freelancerAddress,
                rating,
                comment,
                {
                    gasLimit,
                    ...gasPriceInfo
                }
            );

            // Wait for transaction confirmation
            const receipt = await tx.wait();

            // Extract event data
            const event = receipt.events.find(e => e.event === 'ReviewSubmitted');

            return {
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                effectiveGasPrice: receipt.effectiveGasPrice.toString(),
                client: clientAddress,
                freelancer: freelancerAddress,
                rating,
                comment,
                timestamp: event ? event.args.timestamp.toString() : null,
                network
            };
        } catch (error) {
            console.error('Error submitting review:', error);

            // Handle specific error types
            if (error.code === 'INSUFFICIENT_FUNDS') {
                throw new Error('Insufficient funds for transaction');
            } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
                throw new Error('Transaction would fail: ' + (error.reason || 'unknown reason'));
            } else if (error.message.includes('user rejected transaction')) {
                throw new Error('Transaction was rejected by the user');
            }

            throw new Error(`Failed to submit review: ${error.message}`);
        }
    }

    /**
     * Register a new freelancer on the blockchain
     * @param {ethers.Signer} signer - Signer object for the transaction
     * @param {string} network - Network to register on
     * @returns {Promise<object>} - Transaction result
     */
    async registerFreelancer(signer, network = this.defaultNetwork) {
        try {
            if (!signer) {
                throw new Error('Signer is required to register');
            }

            // Get contract with signer
            const contract = this.getContract(network, signer);

            // Get freelancer address
            const address = await signer.getAddress();

            // Check if already registered
            const freelancerData = await contract.freelancers(address);
            if (freelancerData.isRegistered) {
                throw new Error('This address is already registered as a freelancer');
            }

            // Estimate gas
            const gasEstimate = await contract.estimateGas.registerAsFreelancer();
            const gasLimit = gasEstimate.mul(110).div(100); // 10% buffer

            // Submit registration transaction
            const tx = await contract.registerAsFreelancer({ gasLimit });
            const receipt = await tx.wait();

            // Extract event data
            const event = receipt.events.find(e => e.event === 'FreelancerRegistered');

            return {
                address,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                timestamp: event ? event.args.timestamp.toString() : null,
                network
            };
        } catch (error) {
            console.error('Error registering freelancer:', error);
            throw new Error(`Failed to register freelancer: ${error.message}`);
        }
    }

    /**
     * Register a new client on the blockchain
     * @param {ethers.Signer} signer - Signer object for the transaction
     * @param {string} network - Network to register on
     * @returns {Promise<object>} - Transaction result
     */
    async registerClient(signer, network = this.defaultNetwork) {
        try {
            if (!signer) {
                throw new Error('Signer is required to register');
            }

            // Get contract with signer
            const contract = this.getContract(network, signer);

            // Get client address
            const address = await signer.getAddress();

            // Check if already registered
            const clientData = await contract.clients(address);
            if (clientData.isRegistered) {
                throw new Error('This address is already registered as a client');
            }

            // Estimate gas
            const gasEstimate = await contract.estimateGas.registerAsClient();
            const gasLimit = gasEstimate.mul(110).div(100); // 10% buffer

            // Submit registration transaction
            const tx = await contract.registerAsClient({ gasLimit });
            const receipt = await tx.wait();

            // Extract event data
            const event = receipt.events.find(e => e.event === 'ClientRegistered');

            return {
                address,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                timestamp: event ? event.args.timestamp.toString() : null,
                network
            };
        } catch (error) {
            console.error('Error registering client:', error);
            throw new Error(`Failed to register client: ${error.message}`);
        }
    }

    /**
     * Estimate gas fees for submitting a review
     * @param {object} params - Review parameters
     * @param {string} params.freelancerAddress - Address of the freelancer
     * @param {number} params.rating - Rating (1-5)
     * @param {string} params.comment - Review comment
     * @param {ethers.Signer} params.signer - Signer object for the transaction
     * @param {string} params.network - Network to estimate for
     * @returns {Promise<object>} - Gas estimate data
     */
    async estimateReviewGasFees({ freelancerAddress, rating, comment, signer, network = this.defaultNetwork }) {
        try {
            // Input validation
            if (!signer || !ethers.utils.isAddress(freelancerAddress)) {
                throw new Error('Valid signer and freelancer address are required');
            }

            // Get contract with signer
            const contract = this.getContract(network, signer);

            // Estimate gas for the transaction
            const gasEstimate = await contract.estimateGas.leaveReview(
                freelancerAddress,
                rating,
                comment
            );

            // Add 10% buffer for safety
            const gasLimit = gasEstimate.mul(110).div(100);

            // Get current gas price (with EIP-1559 support)
            const feeData = await signer.provider.getFeeData();

            // Calculate costs
            let gasCost;
            let feeStructure;

            if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
                // Using EIP-1559 fee structure
                feeStructure = 'EIP-1559';

                // Estimate cost: gasLimit * maxFeePerGas
                gasCost = gasLimit.mul(feeData.maxFeePerGas);
            } else {
                // Using legacy fee structure
                feeStructure = 'Legacy';

                // Estimate cost: gasLimit * gasPrice
                gasCost = gasLimit.mul(feeData.gasPrice);
            }

            // Format results
            return {
                gasLimit: gasLimit.toString(),
                gasLimitNumber: gasLimit.toNumber(),
                feeStructure,
                estimatedCostWei: gasCost.toString(),
                estimatedCostEth: ethers.utils.formatEther(gasCost),
                maxFeePerGas: feeData.maxFeePerGas ? feeData.maxFeePerGas.toString() : null,
                maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? feeData.maxPriorityFeePerGas.toString() : null,
                gasPrice: feeData.gasPrice ? feeData.gasPrice.toString() : null,
                network
            };
        } catch (error) {
            console.error('Error estimating gas fees:', error);

            if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
                throw new Error('Transaction would fail: ' + (error.reason || 'unknown reason'));
            }

            throw new Error(`Failed to estimate gas fees: ${error.message}`);
        }
    }

    /**
     * Listen for new reviews for a specific freelancer
     * @param {string} freelancerAddress - Address of the freelancer to monitor
     * @param {function} callback - Callback function to execute when event is detected
     * @param {string} network - Network to listen on
     * @returns {string} - Subscription ID (used to unsubscribe)
     */
    listenForNewReviews(freelancerAddress, callback, network = this.defaultNetwork) {
        try {
            if (!ethers.utils.isAddress(freelancerAddress)) {
                throw new Error('Invalid freelancer address');
            }

            const contract = this.getContract(network);

            // Create filter for ReviewSubmitted events targeting this freelancer
            const filter = contract.filters.ReviewSubmitted(null, freelancerAddress);

            // Set up event listener
            const listener = (client, freelancer, rating, comment, timestamp, event) => {
                callback({
                    client,
                    freelancer,
                    rating: rating.toNumber(),
                    comment,
                    timestamp: timestamp.toString(),
                    transactionHash: event.transactionHash,
                    blockNumber: event.blockNumber
                });
            };

            // Add the event listener
            contract.on(filter, listener);

            // Generate unique subscription ID
            const subscriptionId = `${network}-${freelancerAddress}-${Date.now()}`;

            // Store the subscription for later removal
            this.eventSubscriptions.set(subscriptionId, {
                contract,
                filter,
                listener,
                network
            });

            return subscriptionId;
        } catch (error) {
            console.error('Error setting up review listener:', error);
            throw new Error(`Failed to set up event listener: ${error.message}`);
        }
    }

    /**
     * Stop listening for review events
     * @param {string} subscriptionId - Subscription ID returned from listenForNewReviews
     * @returns {boolean} - True if successfully unsubscribed
     */
    stopListeningForReviews(subscriptionId) {
        try {
            const subscription = this.eventSubscriptions.get(subscriptionId);
            if (!subscription) {
                return false;
            }

            const { contract, filter, listener } = subscription;

            // Remove the event listener
            contract.off(filter, listener);

            // Remove from subscriptions map
            this.eventSubscriptions.delete(subscriptionId);

            return true;
        } catch (error) {
            console.error('Error removing event listener:', error);
            return false;
        }
    }

    /**
     * Clean up resources when the client is no longer needed
     */
    cleanup() {
        // Remove all event listeners
        for (const subscriptionId of this.eventSubscriptions.keys()) {
            this.stopListeningForReviews(subscriptionId);
        }
    }
}

// Export as singleton
const web3Client = new FreelancerReputationWeb3Client();
module.exports = web3Client;