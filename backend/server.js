require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const bodyParser = require('body-parser');
const routes = require('./routes/route');
const { ethers } = require('ethers');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const contractABI = require('../artifacts/contracts/FreelancerReputationSystem.sol/FreelancerReputationSystem.json').abi;

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(helmet());
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
app.use('/api', routes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Using blockchain network: ${process.env.BLOCKCHAIN_NETWORK}`);
});

module.exports = app; // Export for testing