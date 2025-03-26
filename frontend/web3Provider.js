import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

// Create context
const Web3Context = createContext();

// Network configurations
const NETWORKS = {
    ethereum: {
        chainId: '0x1', // 1 in hex
        chainIdDecimal: 1,
        name: 'Ethereum Mainnet',
        currency: 'ETH',
        rpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/your-infura-key',
        blockExplorer: 'https://etherscan.io'
    },
    polygon: {
        chainId: '0x89', // 137 in hex
        chainIdDecimal: 137,
        name: 'Polygon Mainnet',
        currency: 'MATIC',
        rpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com',
        blockExplorer: 'https://polygonscan.com'
    },
    optimism: {
        chainId: '0xa', // 10 in hex
        chainIdDecimal: 10,
        name: 'Optimism Mainnet',
        currency: 'ETH',
        rpcUrl: process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
        blockExplorer: 'https://optimistic.etherscan.io'
    }
};

// Default network
const DEFAULT_NETWORK = 'polygon';

// Basic mock ABI to use as fallback when the actual contract isn't available
const MOCK_REVIEW_ABI = [
    "function leaveReview(address freelancer, uint8 rating, string comment) external",
    "function getFreelancerReviews(address freelancer) external view returns (tuple(address client, uint8 rating, string comment, uint256 timestamp)[])",
    "event ReviewSubmitted(address indexed client, address indexed freelancer, uint8 rating, string comment, uint256 timestamp)"
];

// ENS provider (always points to Ethereum mainnet for ENS resolution)
let ensProvider;
if (typeof window !== 'undefined') {
    ensProvider = new ethers.providers.JsonRpcProvider(
        NETWORKS.ethereum.rpcUrl
    );
}

export const Web3Provider = ({ children }) => {
    // Add error boundary state
    const [hasError, setHasError] = useState(false);

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

    // Safe localStorage access
    const [userPreferredNetwork, setUserPreferredNetwork] = useState(DEFAULT_NETWORK);

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

    // Check if we're on client side and update localStorage-dependent state
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // We're on the client side, safe to use localStorage
            const storedNetwork = localStorage.getItem('preferredNetwork');
            if (storedNetwork) {
                setUserPreferredNetwork(storedNetwork);
            }
        }
    }, []);

    // Initialize Web3Modal on mount - only on client side
    useEffect(() => {
        if (typeof window === 'undefined') {
            return; // Skip on server side
        }

        const initWeb3Modal = async () => {
            try {
                // Dynamically import Web3Modal and providers only on client side
                const Web3Modal = (await import('web3modal')).default;
                const WalletConnectProvider = (await import('@walletconnect/web3-provider')).default;
                const CoinbaseWalletSDK = (await import('@coinbase/wallet-sdk')).default;

                const providerOptions = {
                    walletconnect: {
                        package: WalletConnectProvider,
                        options: {
                            infuraId: process.env.NEXT_PUBLIC_INFURA_ID || 'your-infura-id',
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
                            infuraId: process.env.NEXT_PUBLIC_INFURA_ID || 'your-infura-id',
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
            } catch (error) {
                console.error("Failed to initialize web3modal:", error);
                setError("Failed to initialize wallet connection interface");
            }
        };

        initWeb3Modal();
    }, [userPreferredNetwork]);

    /**
     * Connect to wallet and setup listeners
     */
    const connectWallet = useCallback(async () => {
        if (!web3Modal) return;

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
            if (typeof window !== 'undefined' && ensProvider) {
                resolveEns(userAddress);
            }

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
        if (!address || !ensProvider) return;

        try {
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
        if (!instance || typeof window === 'undefined') return;

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
            // Force refresh on chain change
            window.location.reload();
        });

        // Subscribe to provider disconnection
        instance.on("disconnect", async (error) => {
            await disconnectWallet();
        });
    }, [resolveEns]);

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
        setContract(null);
    }, [web3Modal]);

    /**
     * Switch network (only works with MetaMask)
     */
    const switchNetwork = useCallback(async (networkName) => {
        if (typeof window === 'undefined') return;

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

    // Load contract when provider/network changes - with safety checks
    useEffect(() => {
        if (!provider || !network || typeof window === 'undefined') return;

        const loadContract = async () => {
            try {
                setIsContractLoading(true);

                // Get contract address based on current network - with NEXT_PUBLIC prefix
                const contractAddress = process.env[`NEXT_PUBLIC_${network.toUpperCase()}_CONTRACT_ADDRESS`] ||
                    localStorage.getItem(`${network}_contract_address`);

                if (!contractAddress) {
                    console.warn(`No contract address found for network: ${network}`);
                    setContract(null);
                    setIsContractLoading(false);
                    return;
                }

                // Use MOCK_ABI as fallback - much simpler approach that doesn't trigger Next.js build errors
                let contractABI = MOCK_REVIEW_ABI;

                // We can try to load ABIs using require() instead of import() since it doesn't get analyzed at build time
                if (typeof window !== 'undefined') {
                    try {
                        // Try to load from abis directory first - this is more likely to exist in development
                        const fs = window.require ? window.require('fs') : null;
                        const path = window.require ? window.require('path') : null;

                        if (fs && path) {
                            const abiPath = path.join(process.cwd(), '/abis/FreelancerReputationSystem.json');
                            if (fs.existsSync(abiPath)) {
                                const abiFile = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
                                contractABI = abiFile.abi;
                            }
                        }
                    } catch (e) {
                        console.warn('Could not load ABI from file system, using mock ABI');
                    }
                }

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
        submitReview: () => console.log('Review submission not implemented'), // Placeholder

        // Batch functionality
        reviewBatchQueue,
        isBatchProcessing,
        processBatchReviews: () => { }, // Simplified
        addReviewToBatch: () => console.log('Batch add not implemented'), // Placeholder
        clearBatchQueue: () => setReviewBatchQueue([]),
        batchQueueSize: reviewBatchQueue.length,

        // Message signing
        signMessage: async (message) => {
            // Simplified implementation
            if (!window?.ethereum || !address) {
                throw new Error('Wallet not connected');
            }

            try {
                return await window.ethereum.request({
                    method: 'personal_sign',
                    params: [message, address],
                });
            } catch (error) {
                throw new Error(error.message || 'Failed to sign message');
            }
        },
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