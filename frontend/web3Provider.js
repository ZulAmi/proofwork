import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';
import WalletConnectProvider from '@walletconnect/web3-provider';
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';

// Create context
const Web3Context = createContext();

// Network configurations
const NETWORKS = {
    ethereum: {
        chainId: '0x1', // 1 in hex
        chainIdDecimal: 1,
        name: 'Ethereum Mainnet',
        currency: 'ETH',
        rpcUrl: process.env.REACT_APP_ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/your-infura-key',
        blockExplorer: 'https://etherscan.io'
    },
    polygon: {
        chainId: '0x89', // 137 in hex
        chainIdDecimal: 137,
        name: 'Polygon Mainnet',
        currency: 'MATIC',
        rpcUrl: process.env.REACT_APP_POLYGON_RPC_URL || 'https://polygon-rpc.com',
        blockExplorer: 'https://polygonscan.com'
    },
    optimism: {
        chainId: '0xa', // 10 in hex
        chainIdDecimal: 10,
        name: 'Optimism Mainnet',
        currency: 'ETH',
        rpcUrl: process.env.REACT_APP_OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
        blockExplorer: 'https://optimistic.etherscan.io'
    }
};

// Default network
const DEFAULT_NETWORK = 'polygon';

// ENS provider (always points to Ethereum mainnet for ENS resolution)
const ensProvider = new ethers.providers.JsonRpcProvider(
    NETWORKS.ethereum.rpcUrl
);

export const Web3Provider = ({ children }) => {
    // Connection state
    const [address, setAddress] = useState(null);
    const [ensName, setEnsName] = useState(null);
    const [ensAvatar, setEnsAvatar] = useState(null);
    const [web3Modal, setWeb3Modal] = useState(null);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [chainId, setChainId] = useState(null);
    const [network, setNetwork] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const [isNetworkSwitchRequired, setIsNetworkSwitchRequired] = useState(false);
    const [userPreferredNetwork, setUserPreferredNetwork] = useState(
        localStorage.getItem('preferredNetwork') || DEFAULT_NETWORK
    );

    // Contract-related state
    const [contract, setContract] = useState(null);
    const [isContractLoading, setIsContractLoading] = useState(false);
    const [pendingTransactions, setPendingTransactions] = useState([]);
    const [transactionStatus, setTransactionStatus] = useState({
        isSubmitting: false,
        isWaiting: false,
        hash: null,
        success: false,
        error: null
    });

    // Batch transaction queue
    const [reviewBatchQueue, setReviewBatchQueue] = useState([]);
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);

    // Initialize Web3Modal on mount
    useEffect(() => {
        const providerOptions = {
            walletconnect: {
                package: WalletConnectProvider,
                options: {
                    infuraId: process.env.REACT_APP_INFURA_ID || 'your-infura-id',
                    rpc: {
                        1: NETWORKS.ethereum.rpcUrl,
                        137: NETWORKS.polygon.rpcUrl,
                        10: NETWORKS.optimism.rpcUrl
                    }
                }
            },
            coinbasewallet: {
                package: CoinbaseWalletSDK,
                options: {
                    appName: "Freelancer Reputation",
                    infuraId: process.env.REACT_APP_INFURA_ID || 'your-infura-id',
                    rpc: NETWORKS[userPreferredNetwork].rpcUrl,
                    chainId: NETWORKS[userPreferredNetwork].chainIdDecimal
                }
            }
        };

        const modal = new Web3Modal({
            cacheProvider: true, // Enable session caching
            providerOptions,
            theme: "dark"
        });

        setWeb3Modal(modal);

        // Auto-connect if session is cached
        if (modal.cachedProvider) {
            connectWallet();
        }
    }, []);

    /**
     * Connect to wallet and setup listeners
     */
    const connectWallet = useCallback(async () => {
        try {
            setIsConnecting(true);
            setError(null);

            // Open modal for wallet selection
            const instance = await web3Modal.connect();

            // Create ethers provider
            const web3Provider = new ethers.providers.Web3Provider(instance);
            setProvider(web3Provider);

            // Get and set signer
            const web3Signer = web3Provider.getSigner();
            setSigner(web3Signer);

            // Get connected chain ID
            const network = await web3Provider.getNetwork();
            setChainId(network.chainId);

            // Check if we're on a supported network
            const networkName = getNetworkName(network.chainId);
            setNetwork(networkName);

            // Check if network switch is required
            const shouldSwitchNetwork = networkName !== userPreferredNetwork && networkName !== 'unknown';
            setIsNetworkSwitchRequired(shouldSwitchNetwork);

            if (shouldSwitchNetwork) {
                setError(`Please switch to ${NETWORKS[userPreferredNetwork].name}`);
            } else {
                setError(null);
            }

            // Get user's address
            const userAddress = await web3Signer.getAddress();
            setAddress(userAddress);
            setIsConnected(true);

            // Resolve ENS name if on Ethereum (or for any address using Ethereum mainnet provider)
            resolveEns(userAddress);

            // Setup event listeners
            setupListeners(instance);

            setIsConnecting(false);
        } catch (error) {
            console.error('Connection error:', error);
            setError(error.message || 'Failed to connect wallet');
            setIsConnecting(false);
        }
    }, [web3Modal, userPreferredNetwork]);

    /**
     * Resolve ENS name and avatar for an address
     */
    const resolveEns = useCallback(async (address) => {
        try {
            if (!address) return;

            // Use a dedicated Ethereum mainnet provider for ENS resolution
            const ensName = await ensProvider.lookupAddress(address);

            if (ensName) {
                setEnsName(ensName);

                // Get avatar if available
                try {
                    const resolver = await ensProvider.getResolver(ensName);
                    if (resolver) {
                        const avatar = await resolver.getText('avatar');
                        setEnsAvatar(avatar);
                    }
                } catch (avatarError) {
                    console.warn('Error fetching ENS avatar:', avatarError);
                }
            } else {
                setEnsName(null);
                setEnsAvatar(null);
            }
        } catch (error) {
            console.warn('ENS resolution error:', error);
            setEnsName(null);
            setEnsAvatar(null);
        }
    }, []);

    /**
     * Setup event listeners for wallet changes
     */
    const setupListeners = useCallback((instance) => {
        if (!instance) return;

        // Subscribe to accounts change
        instance.on("accountsChanged", async (accounts) => {
            if (accounts.length === 0) {
                // User disconnected their wallet
                await disconnectWallet();
            } else {
                // User switched accounts
                const web3Provider = new ethers.providers.Web3Provider(instance);
                const web3Signer = web3Provider.getSigner();
                const userAddress = await web3Signer.getAddress();

                setSigner(web3Signer);
                setAddress(userAddress);
                resolveEns(userAddress);
            }
        });

        // Subscribe to chainId change
        instance.on("chainChanged", async (chainId) => {
            const chainIdNum = parseInt(chainId, 16);

            // Force refresh on chain change
            window.location.reload();
        });

        // Subscribe to provider disconnection
        instance.on("disconnect", async (error) => {
            await disconnectWallet();
        });
    }, []);

    /**
     * Disconnect wallet
     */
    const disconnectWallet = useCallback(async () => {
        if (web3Modal) {
            await web3Modal.clearCachedProvider();
        }

        setProvider(null);
        setSigner(null);
        setAddress(null);
        setEnsName(null);
        setEnsAvatar(null);
        setChainId(null);
        setNetwork(null);
        setIsConnected(false);
        setError(null);
        setIsNetworkSwitchRequired(false);
    }, [web3Modal]);

    /**
     * Switch network (only works with MetaMask)
     */
    const switchNetwork = useCallback(async (networkName) => {
        try {
            if (!provider || !networkName || !NETWORKS[networkName]) {
                throw new Error('Invalid network name');
            }

            // We can only switch networks in MetaMask
            if (!window.ethereum) {
                throw new Error('Cannot switch networks. Please switch manually in your wallet');
            }

            const targetNetwork = NETWORKS[networkName];

            try {
                // Try to switch to the network
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: targetNetwork.chainId }]
                });

                // Successfully switched
                setUserPreferredNetwork(networkName);
                localStorage.setItem('preferredNetwork', networkName);

            } catch (switchError) {
                // Network not yet added to MetaMask
                if (switchError.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: targetNetwork.chainId,
                            chainName: targetNetwork.name,
                            nativeCurrency: {
                                name: targetNetwork.currency,
                                symbol: targetNetwork.currency,
                                decimals: 18
                            },
                            rpcUrls: [targetNetwork.rpcUrl],
                            blockExplorerUrls: [targetNetwork.blockExplorer]
                        }]
                    });

                    // After adding, set as preferred
                    setUserPreferredNetwork(networkName);
                    localStorage.setItem('preferredNetwork', networkName);
                } else {
                    throw switchError;
                }
            }
        } catch (error) {
            console.error('Network switch error:', error);
            setError(`Failed to switch network: ${error.message}`);
        }
    }, [provider]);

    /**
     * Get network name from chain ID
     */
    const getNetworkName = (chainId) => {
        for (const [name, network] of Object.entries(NETWORKS)) {
            if (network.chainIdDecimal === chainId) {
                return name;
            }
        }
        return 'unknown';
    };

    /**
     * Shorten address for display
     */
    const shortenAddress = (address) => {
        return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
    };

    // Load contract when provider/network changes
    useEffect(() => {
        if (!provider || !network) return;

        const loadContract = async () => {
            try {
                setIsContractLoading(true);

                // Get contract address based on current network
                const contractAddress = process.env[`REACT_APP_${network.toUpperCase()}_CONTRACT_ADDRESS`] ||
                    localStorage.getItem(`${network}_contract_address`);

                if (!contractAddress) {
                    console.warn(`No contract address found for network: ${network}`);
                    setContract(null);
                    setIsContractLoading(false);
                    return;
                }

                // Load the contract ABI (assumed to be imported or loaded elsewhere)
                const contractABI = require('../artifacts/contracts/FreelancerReputationSystem.sol/FreelancerReputationSystem.json').abi;

                // Create contract instance
                const contractInstance = new ethers.Contract(contractAddress, contractABI, provider);

                // Connect with signer if available
                const contractWithSigner = signer ? contractInstance.connect(signer) : contractInstance;

                setContract(contractWithSigner);
                console.log(`Contract loaded on ${network}`);
            } catch (error) {
                console.error('Failed to load contract:', error);
                setError(`Failed to load contract: ${error.message}`);
            } finally {
                setIsContractLoading(false);
            }
        };

        loadContract();
    }, [provider, signer, network]);

    /**
     * Submit a review for a freelancer
     * @param {Object} reviewData Review data object
     * @param {string} reviewData.freelancerAddress Address of the freelancer
     * @param {number} reviewData.rating Rating (1-5)
     * @param {string} reviewData.comment Review comment
     * @param {Function} onSuccess Callback on successful submission
     * @param {Function} onError Callback on error
     * @param {boolean} optimisticUpdate Whether to update UI optimistically
     * @param {boolean} addToBatch Whether to add to batch instead of submitting immediately
     */
    const submitReview = useCallback(async ({
        freelancerAddress,
        rating,
        comment,
        onSuccess,
        onError,
        optimisticUpdate = true,
        addToBatch = false
    }) => {
        // Input validation
        if (!ethers.utils.isAddress(freelancerAddress)) {
            const error = new Error('Invalid freelancer address');
            console.error(error);
            if (onError) onError(error);
            return;
        }

        if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
            const error = new Error('Rating must be an integer between 1 and 5');
            console.error(error);
            if (onError) onError(error);
            return;
        }

        if (!comment || comment.trim() === '') {
            const error = new Error('Comment is required');
            console.error(error);
            if (onError) onError(error);
            return;
        }

        // Check wallet connection
        if (!isConnected || !contract || !signer) {
            const error = new Error('Wallet not connected');
            console.error(error);
            if (onError) onError(error);
            return;
        }

        // Create transaction data
        const reviewData = {
            freelancerAddress,
            rating,
            comment,
            reviewerAddress: address,
            timestamp: Math.floor(Date.now() / 1000)
        };

        // Add to batch queue if requested
        if (addToBatch) {
            setReviewBatchQueue(prevQueue => [...prevQueue, reviewData]);

            // Optimistically update UI if requested
            if (optimisticUpdate && onSuccess) {
                onSuccess({
                    ...reviewData,
                    isPending: true,
                    isBatched: true
                });
            }

            return;
        }

        // Otherwise submit immediately
        try {
            setTransactionStatus({
                isSubmitting: true,
                isWaiting: false,
                hash: null,
                success: false,
                error: null
            });

            // Optimistically update UI if requested
            if (optimisticUpdate && onSuccess) {
                onSuccess({
                    ...reviewData,
                    isPending: true
                });
            }

            // Estimate gas for this transaction
            const gasEstimate = await contract.estimateGas.leaveReview(
                freelancerAddress,
                rating,
                comment
            );

            // Add 20% buffer to gas estimate
            const gasLimit = gasEstimate.mul(120).div(100);

            // Submit transaction
            const tx = await contract.leaveReview(
                freelancerAddress,
                rating,
                comment,
                { gasLimit }
            );

            // Add to pending transactions
            setPendingTransactions(prev => [...prev, {
                hash: tx.hash,
                type: 'review',
                data: reviewData,
                timestamp: Date.now()
            }]);

            // Update status
            setTransactionStatus({
                isSubmitting: false,
                isWaiting: true,
                hash: tx.hash,
                success: false,
                error: null
            });

            // Wait for transaction confirmation
            const receipt = await tx.wait();

            // Update status
            setTransactionStatus({
                isSubmitting: false,
                isWaiting: false,
                hash: tx.hash,
                success: true,
                error: null
            });

            // Remove from pending transactions
            setPendingTransactions(prev => prev.filter(item => item.hash !== tx.hash));

            // Extract event data
            const event = receipt.events?.find(e => e.event === 'ReviewSubmitted');
            const eventData = event ? {
                client: event.args.client,
                freelancer: event.args.freelancer,
                rating: event.args.rating.toNumber(),
                comment: event.args.comment,
                timestamp: event.args.timestamp.toNumber()
            } : null;

            // Call success callback with finalized data
            if (onSuccess) {
                onSuccess({
                    ...reviewData,
                    isPending: false,
                    transactionHash: receipt.transactionHash,
                    blockNumber: receipt.blockNumber,
                    eventData
                });
            }

            console.log('Review submitted successfully:', tx.hash);
            return receipt;
        } catch (error) {
            console.error('Review submission error:', error);

            // Format user-friendly error message
            let errorMessage = 'Failed to submit review';

            if (error.code === 'INSUFFICIENT_FUNDS') {
                errorMessage = 'Insufficient funds to complete transaction';
            } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
                errorMessage = error.reason || 'Transaction would fail - you might have already reviewed this freelancer';
            } else if (error.message?.includes('user rejected transaction')) {
                errorMessage = 'Transaction rejected by user';
            }

            // Update status
            setTransactionStatus({
                isSubmitting: false,
                isWaiting: false,
                hash: null,
                success: false,
                error: errorMessage
            });

            if (onError) onError(new Error(errorMessage));
            return null;
        }
    }, [contract, isConnected, signer, address]);

    /**
     * Process the batch queue of reviews
     * @param {Function} onBatchSuccess Callback for successful batch processing
     * @param {Function} onBatchError Callback for batch processing error
     */
    const processBatchReviews = useCallback(async (onBatchSuccess, onBatchError) => {
        if (isBatchProcessing || reviewBatchQueue.length === 0) return;

        // Check wallet connection
        if (!isConnected || !contract || !signer) {
            const error = new Error('Wallet not connected');
            console.error(error);
            if (onBatchError) onBatchError(error);
            return;
        }

        try {
            setIsBatchProcessing(true);

            // For true batching, you would use a multicall contract or batch transaction method
            // This is a simplified version that processes reviews sequentially
            const results = [];
            const currentQueue = [...reviewBatchQueue];

            for (const reviewData of currentQueue) {
                const { freelancerAddress, rating, comment } = reviewData;

                try {
                    // Submit individual review
                    const receipt = await submitReview({
                        freelancerAddress,
                        rating,
                        comment,
                        optimisticUpdate: false,
                        addToBatch: false
                    });

                    results.push({
                        ...reviewData,
                        success: true,
                        transactionHash: receipt.transactionHash,
                        blockNumber: receipt.blockNumber
                    });

                    // Remove from queue
                    setReviewBatchQueue(prevQueue =>
                        prevQueue.filter(r =>
                            r.freelancerAddress !== freelancerAddress ||
                            r.timestamp !== reviewData.timestamp
                        )
                    );
                } catch (error) {
                    console.error(`Error processing review in batch for ${freelancerAddress}:`, error);

                    results.push({
                        ...reviewData,
                        success: false,
                        error: error.message
                    });
                }
            }

            // Batch processing completed
            if (onBatchSuccess) {
                onBatchSuccess(results);
            }
        } catch (error) {
            console.error('Batch processing error:', error);
            if (onBatchError) onBatchError(error);
        } finally {
            setIsBatchProcessing(false);
        }
    }, [isBatchProcessing, reviewBatchQueue, isConnected, contract, signer, submitReview]);

    /**
     * Sign a message
     */
    const signMessage = useCallback(async (message) => {
        if (!window.ethereum || !address) {
            throw new Error('Wallet not connected');
        }

        try {
            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [message, address],
            });

            return signature;
        } catch (error) {
            console.error('Message signing error:', error);
            throw new Error(error.message || 'Failed to sign message');
        }
    }, [address]);

    // Value object for context provider
    const value = {
        address,
        ensName,
        ensAvatar,
        displayName: ensName || shortenAddress(address),
        provider,
        signer,
        chainId,
        network,
        isNetworkSwitchRequired,
        userPreferredNetwork,
        isConnecting,
        isConnected,
        error,
        connectWallet,
        disconnectWallet,
        switchNetwork,
        supportedNetworks: Object.keys(NETWORKS),
        networkConfig: network ? NETWORKS[network] : null,

        // Contract interaction
        contract,
        isContractLoading,
        transactionStatus,
        pendingTransactions,
        submitReview,

        // Batch functionality
        reviewBatchQueue,
        isBatchProcessing,
        processBatchReviews,
        addReviewToBatch: (reviewData) => submitReview({ ...reviewData, addToBatch: true }),
        clearBatchQueue: () => setReviewBatchQueue([]),
        batchQueueSize: reviewBatchQueue.length,

        // Message signing
        signMessage,
    };

    return (
        <Web3Context.Provider value={value}>
            {children}
        </Web3Context.Provider>
    );
};

// Custom hook to use the Web3 context
export const useWeb3 = () => {
    const context = useContext(Web3Context);
    if (!context) {
        throw new Error('useWeb3 must be used within a Web3Provider');
    }
    return context;
};