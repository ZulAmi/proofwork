const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const jwt = require('jsonwebtoken');
const { body, param, validationResult } = require('express-validator');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const ipfsClient = require('ipfs-http-client');
const multer = require('multer');
const contractABI = require('../../artifacts/contracts/FreelancerReputationSystem.sol/FreelancerReputationSystem.json').abi;

// Initialize providers based on environment
const getProvider = () => {
    const network = process.env.BLOCKCHAIN_NETWORK || 'hardhat';
    const providers = {
        optimism: new ethers.providers.JsonRpcProvider(process.env.OPTIMISM_RPC_URL),
        polygon: new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC_URL),
        hardhat: new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545')
    };
    return providers[network];
};

// Initialize contract
const getContract = () => {
    const provider = getProvider();
    const network = process.env.BLOCKCHAIN_NETWORK || 'hardhat';
    const contractAddress = process.env[`${network.toUpperCase()}_CONTRACT_ADDRESS`];
    return new ethers.Contract(contractAddress, contractABI, provider);
};

// Initialize IPFS client
const ipfs = ipfsClient.create({
    host: process.env.IPFS_HOST || 'ipfs.infura.io',
    port: process.env.IPFS_PORT || 5001,
    protocol: process.env.IPFS_PROTOCOL || 'https',
    headers: {
        authorization: `Basic ${Buffer.from(
            `${process.env.IPFS_PROJECT_ID}:${process.env.IPFS_PROJECT_SECRET}`
        ).toString('base64')}`
    }
});

// Configure storage for profile images
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// Configure passport for OAuth
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // In a real app, you'd lookup or create a user in your database
        // For this example, we'll just use the profile directly
        return done(null, {
            id: profile.id,
            displayName: profile.displayName,
            email: profile.emails[0].value,
            provider: 'google'
        });
    } catch (error) {
        return done(error, null);
    }
}));

passport.use(new LinkedInStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: "/api/auth/linkedin/callback",
    scope: ['r_emailaddress', 'r_liteprofile'],
}, async (accessToken, refreshToken, profile, done) => {
    try {
        return done(null, {
            id: profile.id,
            displayName: profile.displayName,
            email: profile.emails[0].value,
            provider: 'linkedin'
        });
    } catch (error) {
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Helper function for handling contract interactions
const handleContractInteraction = async (action, res) => {
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
};

// Helper to upload data to IPFS
const uploadToIPFS = async (data) => {
    const result = await ipfs.add(JSON.stringify(data));
    return result.path; // This is the CID
};

// OAuth Routes
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
    // Create JWT token
    const token = jwt.sign(
        { id: req.user.id, email: req.user.email, provider: req.user.provider },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
});

router.get('/auth/linkedin', passport.authenticate('linkedin'));
router.get('/auth/linkedin/callback', passport.authenticate('linkedin', { session: false }), (req, res) => {
    const token = jwt.sign(
        { id: req.user.id, email: req.user.email, provider: req.user.provider },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
});

// Register freelancer with metadata
router.post(
    '/freelancers/register',
    authenticateToken,
    upload.single('profileImage'),
    [
        body('privateKey').notEmpty().withMessage('Private key is required'),
        body('name').notEmpty().withMessage('Name is required')
            .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
        body('skills').isArray().withMessage('Skills must be an array')
            .notEmpty().withMessage('At least one skill is required'),
        body('portfolioUrl').optional().isURL().withMessage('Portfolio URL must be a valid URL'),
        body('bio').optional().isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters')
    ],
    async (req, res) => {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { privateKey, name, skills, portfolioUrl, bio } = req.body;

        try {
            // Create metadata
            const metadata = {
                name,
                skills,
                portfolioUrl,
                bio,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Upload profile image if provided
            if (req.file) {
                const imageBuffer = req.file.buffer;
                const imageResult = await ipfs.add(imageBuffer);
                metadata.profileImage = `ipfs://${imageResult.path}`;
            }

            // Upload metadata to IPFS
            const cid = await uploadToIPFS(metadata);

            // Register on blockchain
            await handleContractInteraction(async () => {
                const provider = getProvider();
                const wallet = new ethers.Wallet(privateKey, provider);
                const contract = getContract().connect(wallet);

                // Check if already registered
                const freelancerData = await contract.freelancers(wallet.address);
                if (freelancerData.isRegistered) {
                    throw new Error('Freelancer already registered');
                }

                // Register freelancer on blockchain
                const tx = await contract.registerAsFreelancer();
                const receipt = await tx.wait();

                // Extract event data
                const event = receipt.events.find(e => e.event === 'FreelancerRegistered');

                // Store the mapping of address to IPFS CID in database
                // (This would be implemented in your database logic)

                return {
                    address: wallet.address,
                    metadataCid: cid,
                    metadata: metadata,
                    transactionHash: receipt.transactionHash,
                    timestamp: event.args.timestamp.toString(),
                    blockNumber: receipt.blockNumber
                };
            }, res);
        } catch (error) {
            console.error('IPFS upload error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to upload metadata to IPFS'
            });
        }
    }
);

// Submit review for freelancer
router.post(
    '/reviews',
    authenticateToken,
    [
        body('privateKey').notEmpty().withMessage('Private key is required'),
        body('freelancerAddress').notEmpty().withMessage('Freelancer address is required')
            .custom(value => ethers.utils.isAddress(value)).withMessage('Invalid Ethereum address'),
        body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
        body('comment').notEmpty().withMessage('Comment is required')
            .isLength({ min: 5, max: 280 }).withMessage('Comment must be between 5 and 280 characters'),
        body('detailedFeedback').optional().isObject().withMessage('Detailed feedback must be an object'),
    ],
    async (req, res) => {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { privateKey, freelancerAddress, rating, comment, detailedFeedback } = req.body;

        try {
            // Create review metadata
            const reviewMetadata = {
                rating,
                comment,
                detailedFeedback: detailedFeedback || {},
                reviewerProvider: req.user.provider, // OAuth provider
                reviewDate: new Date().toISOString()
            };

            // Upload review metadata to IPFS
            const cid = await uploadToIPFS(reviewMetadata);

            // Submit review on blockchain
            await handleContractInteraction(async () => {
                const provider = getProvider();
                const wallet = new ethers.Wallet(privateKey, provider);
                const contract = getContract().connect(wallet);

                // Check if client is registered
                const clientData = await contract.clients(wallet.address);
                if (!clientData.isRegistered) {
                    throw new Error('Client not registered');
                }

                // Check if freelancer exists
                const freelancerData = await contract.freelancers(freelancerAddress);
                if (!freelancerData.isRegistered) {
                    throw new Error('Freelancer not registered');
                }

                // Check if already reviewed
                const hasReviewed = await contract.hasClientReviewedFreelancer(wallet.address, freelancerAddress);
                if (hasReviewed) {
                    throw new Error('You have already reviewed this freelancer');
                }

                // Submit blockchain review (on-chain data)
                const tx = await contract.leaveReview(freelancerAddress, rating, comment);
                const receipt = await tx.wait();

                // Extract event data
                const event = receipt.events.find(e => e.event === 'ReviewSubmitted');

                return {
                    client: wallet.address,
                    freelancer: freelancerAddress,
                    rating,
                    comment,
                    metadataCid: cid, // IPFS CID for additional review metadata
                    transactionHash: receipt.transactionHash,
                    timestamp: event.args.timestamp.toString(),
                    blockNumber: receipt.blockNumber
                };
            }, res);
        } catch (error) {
            console.error('IPFS upload error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to upload review to IPFS'
            });
        }
    }
);

// Get freelancer reputation
router.get(
    '/freelancers/:address/reputation',
    param('address').custom(value => ethers.utils.isAddress(value)).withMessage('Invalid Ethereum address'),
    async (req, res) => {
        // Validate parameters
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { address } = req.params;

        await handleContractInteraction(async () => {
            const contract = getContract();

            // Get on-chain reputation data
            const [averageRating, reviewCount] = await contract.getFreelancerReputation(address);

            // Check if freelancer is registered
            const freelancerData = await contract.freelancers(address);
            if (!freelancerData.isRegistered) {
                return {
                    address,
                    isRegistered: false,
                    averageRating: 0,
                    reviewCount: 0,
                    totalRating: 0
                };
            }

            // In a real application, you would also fetch the IPFS metadata
            // associated with this freelancer address from your database

            return {
                address,
                isRegistered: true,
                averageRating: averageRating.toNumber() / 100, // Convert from scaled integer
                reviewCount: reviewCount.toNumber(),
                totalRating: freelancerData.totalRating.toNumber()
            };
        }, res);
    }
);

// Get freelancer's aggregated reviews
router.get(
    '/freelancers/:address/reviews',
    param('address').custom(value => ethers.utils.isAddress(value)).withMessage('Invalid Ethereum address'),
    async (req, res) => {
        // Validate parameters
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { address } = req.params;

        try {
            // This is a mock implementation since we would need a database to store
            // all client addresses that have reviewed this freelancer
            // In a real application, you would:
            // 1. Query your database for all clients who reviewed this freelancer
            // 2. Fetch each review from the blockchain
            // 3. Fetch the extended metadata from IPFS for each review

            const contract = getContract();

            // Check if freelancer is registered
            const freelancerData = await contract.freelancers(address);
            if (!freelancerData.isRegistered) {
                return res.json({
                    success: true,
                    data: {
                        address,
                        isRegistered: false,
                        reviews: []
                    }
                });
            }

            // Here we would typically retrieve all client addresses from a database
            // For demonstration, we'll use a mock implementation

            // Mock data - In a real app, you'd query your database for this
            const mockReviewers = [
                '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Sample addresses
                '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
            ];

            // Fetch reviews
            const reviews = [];
            for (const clientAddress of mockReviewers) {
                try {
                    const review = await contract.reviews(address, clientAddress);

                    // Skip empty reviews
                    if (review.rating.toNumber() === 0) continue;

                    // In a real app: Fetch IPFS metadata for additional review details
                    // const ipfsMetadata = await fetchIPFSMetadata(reviewMetadataCID);

                    reviews.push({
                        clientAddress,
                        rating: review.rating.toNumber(),
                        comment: review.comment,
                        timestamp: review.timestamp.toString(),
                        // ipfsMetadata would be added here in a real implementation
                    });
                } catch (error) {
                    console.error(`Error fetching review from ${clientAddress}:`, error);
                    // Continue with next review
                }
            }

            // Calculate stats
            let ratingDistribution = [0, 0, 0, 0, 0]; // 1-5 stars
            reviews.forEach(review => {
                if (review.rating >= 1 && review.rating <= 5) {
                    ratingDistribution[review.rating - 1]++;
                }
            });

            return res.json({
                success: true,
                data: {
                    address,
                    isRegistered: true,
                    reviewCount: reviews.length,
                    ratingDistribution,
                    reviews
                }
            });
        } catch (error) {
            console.error('Error fetching reviews:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve freelancer reviews'
            });
        }
    }
);

module.exports = router;