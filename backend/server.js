const express = require('express');
const { ethers } = require('ethers');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const morgan = require('morgan');
const contractABI = require('../artifacts/contracts/FreelancerReputationSystem.sol/FreelancerReputationSystem.json').abi;

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Apply security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Configure blockchain providers
const providers = {
    optimism: new ethers.providers.JsonRpcProvider(
        process.env.OPTIMISM_RPC_URL || 'https://optimism-mainnet.infura.io/v3/your-key'
    ),
    polygon: new ethers.providers.JsonRpcProvider(
        process.env.POLYGON_RPC_URL || 'https://polygon-mainnet.infura.io/v3/your-key'
    ),
    hardhat: new ethers.providers.JsonRpcProvider(
        'http://127.0.0.1:8545'
    )
};

// Select active provider based on environment
const network = process.env.BLOCKCHAIN_NETWORK || 'hardhat';
const provider = providers[network];

// Initialize contract instance
const contractAddress = process.env[`${network.toUpperCase()}_CONTRACT_ADDRESS`] || '';
const contract = new ethers.Contract(contractAddress, contractABI, provider);

// Middleware to validate blockchain connection
const validateBlockchainConnection = async (req, res, next) => {
    try {
        await provider.getBlockNumber();
        next();
    } catch (error) {
        console.error('Blockchain connection error:', error);
        return res.status(503).json({
            success: false,
            message: 'Blockchain connection unavailable'
        });
    }
};

app.use(validateBlockchainConnection);

/**
 * Helper to handle contract interactions
 * @param {Function} action - Async function that performs the contract interaction
 * @param {Object} res - Express response object
 */
async function handleContractInteraction(action, res) {
    try {
        const result = await action();
        return res.json({ success: true, data: result });
    } catch (error) {
        console.error('Contract interaction error:', error);

        // Extract useful error information from blockchain errors
        let errorMessage = 'An error occurred';
        if (error.reason) {
            errorMessage = error.reason;
        } else if (error.message) {
            errorMessage = error.message.split('reason=')[1]?.split(',')[0] || error.message;
        }

        return res.status(400).json({
            success: false,
            message: errorMessage
        });
    }
}

// API Routes
// GET /api/health - Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        network,
        blockchainConnected: !!provider,
        contractAddress
    });
});

// POST /api/freelancers/register - Register a new freelancer
app.post('/api/freelancers/register', async (req, res) => {
    const { privateKey } = req.body;

    if (!privateKey) {
        return res.status(400).json({ success: false, message: 'Private key is required' });
    }

    await handleContractInteraction(async () => {
        const wallet = new ethers.Wallet(privateKey, provider);
        const connectedContract = contract.connect(wallet);

        // Check if already registered
        const freelancerData = await connectedContract.freelancers(wallet.address);
        if (freelancerData.isRegistered) {
            throw new Error('Freelancer already registered');
        }

        // Register freelancer
        const tx = await connectedContract.registerAsFreelancer();
        const receipt = await tx.wait();

        // Extract event data
        const event = receipt.events.find(e => e.event === 'FreelancerRegistered');

        return {
            address: wallet.address,
            transactionHash: receipt.transactionHash,
            timestamp: event.args.timestamp.toString(),
            blockNumber: receipt.blockNumber
        };
    }, res);
});

// POST /api/clients/register - Register a new client
app.post('/api/clients/register', async (req, res) => {
    const { privateKey } = req.body;

    if (!privateKey) {
        return res.status(400).json({ success: false, message: 'Private key is required' });
    }

    await handleContractInteraction(async () => {
        const wallet = new ethers.Wallet(privateKey, provider);
        const connectedContract = contract.connect(wallet);

        // Check if already registered
        const clientData = await connectedContract.clients(wallet.address);
        if (clientData.isRegistered) {
            throw new Error('Client already registered');
        }

        // Register client
        const tx = await connectedContract.registerAsClient();
        const receipt = await tx.wait();

        // Extract event data
        const event = receipt.events.find(e => e.event === 'ClientRegistered');

        return {
            address: wallet.address,
            transactionHash: receipt.transactionHash,
            timestamp: event.args.timestamp.toString(),
            blockNumber: receipt.blockNumber
        };
    }, res);
});

// POST /api/reviews - Submit a new review
app.post('/api/reviews', async (req, res) => {
    const { privateKey, freelancerAddress, rating, comment } = req.body;

    if (!privateKey || !freelancerAddress || !rating || !comment) {
        return res.status(400).json({
            success: false,
            message: 'Private key, freelancer address, rating, and comment are required'
        });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({
            success: false,
            message: 'Rating must be between 1 and 5'
        });
    }

    await handleContractInteraction(async () => {
        const wallet = new ethers.Wallet(privateKey, provider);
        const connectedContract = contract.connect(wallet);

        // Check if client is registered
        const clientData = await connectedContract.clients(wallet.address);
        if (!clientData.isRegistered) {
            throw new Error('Client not registered');
        }

        // Check if client has already reviewed this freelancer
        const hasReviewed = await connectedContract.hasClientReviewedFreelancer(
            wallet.address,
            freelancerAddress
        );

        if (hasReviewed) {
            throw new Error('Client has already reviewed this freelancer');
        }

        // Submit review
        const tx = await connectedContract.leaveReview(
            freelancerAddress,
            rating,
            comment
        );
        const receipt = await tx.wait();

        // Extract event data
        const event = receipt.events.find(e => e.event === 'ReviewSubmitted');

        return {
            client: wallet.address,
            freelancer: freelancerAddress,
            rating,
            comment,
            transactionHash: receipt.transactionHash,
            timestamp: event.args.timestamp.toString(),
            blockNumber: receipt.blockNumber
        };
    }, res);
});

// GET /api/freelancers/:address/reputation - Get freelancer's reputation
app.get('/api/freelancers/:address/reputation', async (req, res) => {
    const { address } = req.params;

    if (!ethers.utils.isAddress(address)) {
        return res.status(400).json({ success: false, message: 'Invalid Ethereum address' });
    }

    await handleContractInteraction(async () => {
        // Get freelancer reputation
        const [averageRating, reviewCount] = await contract.getFreelancerReputation(address);

        // Check if freelancer is registered
        const freelancerData = await contract.freelancers(address);

        return {
            address,
            isRegistered: freelancerData.isRegistered,
            averageRating: averageRating.toNumber() / 100, // Convert from scaled integer to decimal
            reviewCount: reviewCount.toNumber(),
            totalRating: freelancerData.totalRating.toNumber()
        };
    }, res);
});

// GET /api/freelancers/:freelancer/reviews/:client - Get a specific review
app.get('/api/freelancers/:freelancer/reviews/:client', async (req, res) => {
    const { freelancer, client } = req.params;

    if (!ethers.utils.isAddress(freelancer) || !ethers.utils.isAddress(client)) {
        return res.status(400).json({ success: false, message: 'Invalid Ethereum address' });
    }

    await handleContractInteraction(async () => {
        // Get the review
        const review = await contract.reviews(freelancer, client);

        // Check if review exists (rating > 0)
        if (review.rating === 0) {
            throw new Error('Review not found');
        }

        return {
            freelancer,
            client,
            rating: review.rating,
            comment: review.comment,
            timestamp: review.timestamp.toString()
        };
    }, res);
});

// Hardhat test endpoint - only available in development
if (process.env.NODE_ENV === 'development' && network === 'hardhat') {
    app.get('/api/test/reset', async (req, res) => {
        try {
            // Reset the Hardhat network
            await provider.send('hardhat_reset', []);
            res.json({ success: true, message: 'Hardhat network reset successfully' });
        } catch (error) {
            console.error('Failed to reset Hardhat network:', error);
            res.status(500).json({ success: false, message: 'Failed to reset Hardhat network' });
        }
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Using blockchain network: ${network}`);
    console.log(`Contract address: ${contractAddress}`);
});

module.exports = app; // Export for testing