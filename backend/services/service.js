const { ethers } = require('ethers');
const axios = require('axios');
const WebSocket = require('ws');
const contractABI = require('../../artifacts/contracts/FreelancerReputationSystem.sol/FreelancerReputationSystem.json').abi;
const { createClient } = require('redis');
const EventEmitter = require('events');
const winston = require('winston');
const { MongoClient } = require('mongodb');

/**
 * FreelancerReputationService
 * Handles fetching, analyzing, and calculating comprehensive reputation scores for freelancers
 * Integrates with blockchain data, AI sentiment analysis, and real-time WebSocket updates
 */
class FreelancerReputationService {
    constructor() {
        // Configure logging
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({ filename: 'reputation-service.log' })
            ]
        });

        // Initialize event emitter for internal communication
        this.events = new EventEmitter();

        // Initialize blockchain provider
        this.initializeProvider();

        // Initialize contract
        this.initializeContract();

        // Initialize Redis for caching (optional but recommended for performance)
        this.initializeCache();

        // Initialize AI service connection
        this.initializeAIService();

        // Initialize WebSocket server
        this.initializeWebSocket();

        // Initialize database
        this.initializeDatabase();

        // Constants for reputation calculation
        this.DECAY_FACTOR = 0.1; // Controls how quickly older reviews lose weight
        this.TIME_UNIT = 1000 * 60 * 60 * 24 * 30; // 30 days in milliseconds
        this.SENTIMENT_WEIGHT = 0.3; // How much the sentiment analysis affects the score
        this.DEFAULT_CREDIBILITY = 70; // Default credibility for clients without history

        // Cache reputation scores in memory for quick access
        this.reputationCache = new Map();

        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Initialize blockchain provider based on environment
     */
    initializeProvider() {
        const network = process.env.BLOCKCHAIN_NETWORK || 'hardhat';

        const providers = {
            optimism: new ethers.providers.JsonRpcProvider(
                process.env.OPTIMISM_RPC_URL || 'https://optimism-mainnet.infura.io/v3/your-key'
            ),
            polygon: new ethers.providers.JsonRpcProvider(
                process.env.POLYGON_RPC_URL || 'https://polygon-mainnet.infura.io/v3/your-key'
            ),
            hardhat: new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545')
        };

        this.provider = providers[network];
        this.network = network;

        this.logger.info(`Provider initialized for network: ${network}`);
    }

    /**
     * Initialize smart contract instance
     */
    initializeContract() {
        const contractAddress = process.env[`${this.network.toUpperCase()}_CONTRACT_ADDRESS`] || '';
        this.contract = new ethers.Contract(contractAddress, contractABI, this.provider);

        this.logger.info(`Contract initialized at address: ${contractAddress}`);

        // Set up contract event listeners for real-time updates
        this.contract.on('ReviewSubmitted', this.handleNewReview.bind(this));
    }

    /**
     * Initialize Redis cache
     */
    async initializeCache() {
        try {
            this.redisClient = createClient({
                url: process.env.REDIS_URL || 'redis://localhost:6379'
            });

            await this.redisClient.connect();
            this.logger.info('Redis cache initialized successfully');
        } catch (error) {
            this.logger.warn(`Redis initialization failed: ${error.message}. Continuing without cache.`);
            this.redisClient = null;
        }
    }

    /**
     * Initialize connection to AI sentiment analysis service
     */
    initializeAIService() {
        this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5000/analyze';
        this.aiServiceApiKey = process.env.AI_SERVICE_API_KEY;

        this.logger.info(`AI service configured at: ${this.aiServiceUrl}`);

        // Test connection to AI service
        this.testAIServiceConnection();
    }

    /**
     * Test connection to AI service
     */
    async testAIServiceConnection() {
        try {
            const response = await axios.get(`${this.aiServiceUrl.replace('/analyze', '')}/health`, {
                headers: this.aiServiceApiKey ? { 'Authorization': `Bearer ${this.aiServiceApiKey}` } : {}
            });

            if (response.status === 200) {
                this.logger.info('AI service connection successful');
            } else {
                this.logger.warn('AI service returned non-200 status');
            }
        } catch (error) {
            this.logger.error(`AI service connection failed: ${error.message}`);
        }
    }

    /**
     * Initialize WebSocket server for real-time updates
     */
    initializeWebSocket() {
        const wssPort = process.env.WEBSOCKET_PORT || 8080;

        this.wss = new WebSocket.Server({ port: wssPort });

        this.wss.on('connection', (ws) => {
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);

                    // Handle subscription requests
                    if (data.type === 'subscribe' && data.freelancerAddress) {
                        // Store the subscription
                        ws.freelancerAddress = data.freelancerAddress;

                        this.logger.info(`Client subscribed to updates for ${data.freelancerAddress}`);

                        // Send the current reputation score immediately
                        this.getFreelancerReputation(data.freelancerAddress)
                            .then(reputation => {
                                ws.send(JSON.stringify({
                                    type: 'reputation_update',
                                    freelancerAddress: data.freelancerAddress,
                                    reputation
                                }));
                            })
                            .catch(error => {
                                this.logger.error(`Error fetching initial reputation: ${error.message}`);
                            });
                    }
                } catch (error) {
                    this.logger.error(`WebSocket message parsing error: ${error.message}`);
                }
            });

            // Send welcome message
            ws.send(JSON.stringify({ type: 'connection_established' }));
        });

        this.logger.info(`WebSocket server started on port ${wssPort}`);
    }

    /**
     * Initialize database connection
     */
    async initializeDatabase() {
        this.db = await MongoClient.connect(process.env.MONGODB_URI);
        this.reviews = this.db.collection('reviews');

        // Create indexes
        await this.reviews.createIndex({ freelancerAddress: 1 });
        await this.reviews.createIndex({ clientAddress: 1 });

        this.logger.info('Database initialized successfully');
    }

    /**
     * Set up internal event listeners
     */
    setupEventListeners() {
        this.events.on('reputation_updated', (freelancerAddress, reputation) => {
            // Update cache
            this.reputationCache.set(freelancerAddress, {
                reputation,
                timestamp: Date.now()
            });

            // Store in Redis if available
            if (this.redisClient) {
                this.redisClient.set(
                    `reputation:${freelancerAddress}`,
                    JSON.stringify({ reputation, timestamp: Date.now() }),
                    { EX: 3600 } // 1 hour expiration
                ).catch(err => this.logger.error(`Redis cache update failed: ${err.message}`));
            }

            // Broadcast to relevant WebSocket clients
            this.broadcastReputationUpdate(freelancerAddress, reputation);
        });
    }

    /**
     * Broadcast reputation updates to subscribed WebSocket clients
     * @param {string} freelancerAddress - The freelancer's address
     * @param {object} reputation - The updated reputation data
     */
    broadcastReputationUpdate(freelancerAddress, reputation) {
        const message = JSON.stringify({
            type: 'reputation_update',
            freelancerAddress,
            reputation,
            timestamp: Date.now()
        });

        this.wss.clients.forEach(client => {
            if (
                client.readyState === WebSocket.OPEN &&
                client.freelancerAddress === freelancerAddress
            ) {
                client.send(message);
            }
        });

        this.logger.info(`Broadcasted update for ${freelancerAddress} to ${Array.from(this.wss.clients).filter(c => c.freelancerAddress === freelancerAddress).length
            } clients`);
    }

    /**
     * Handle new review events from the blockchain
     * @param {string} client - Client address
     * @param {string} freelancer - Freelancer address
     * @param {number} rating - Review rating (1-5)
     * @param {string} comment - Review comment
     * @param {BigNumber} timestamp - Timestamp of the review
     */
    async handleNewReview(client, freelancer, rating, comment, timestamp) {
        this.logger.info(`New review detected for ${freelancer} from ${client}`);

        // Invalidate cache for this freelancer
        this.reputationCache.delete(freelancer);
        if (this.redisClient) {
            await this.redisClient.del(`reputation:${freelancer}`);
        }

        // Recalculate reputation score
        const reputation = await this.getFreelancerReputation(freelancer);

        // Emit internal event
        this.events.emit('reputation_updated', freelancer, reputation);
    }

    /**
     * Get comprehensive reputation for a freelancer
     * @param {string} freelancerAddress - Ethereum address of the freelancer
     * @returns {Promise<object>} - Reputation data
     */
    async getFreelancerReputation(freelancerAddress) {
        // Check cache first
        const cachedData = this.reputationCache.get(freelancerAddress);
        if (cachedData && Date.now() - cachedData.timestamp < 5 * 60 * 1000) { // 5 minutes cache
            this.logger.debug(`Returning cached reputation for ${freelancerAddress}`);
            return cachedData.reputation;
        }

        // Check Redis cache
        if (this.redisClient) {
            const redisData = await this.redisClient.get(`reputation:${freelancerAddress}`);
            if (redisData) {
                const parsed = JSON.parse(redisData);
                if (Date.now() - parsed.timestamp < 5 * 60 * 1000) { // 5 minutes cache
                    this.logger.debug(`Returning Redis cached reputation for ${freelancerAddress}`);
                    return parsed.reputation;
                }
            }
        }

        // Fetch on-chain reputation data
        const [averageRating, reviewCount] = await this.contract.getFreelancerReputation(freelancerAddress);

        // If no reviews, return default reputation
        if (reviewCount.toNumber() === 0) {
            const defaultReputation = {
                address: freelancerAddress,
                trustScore: 50, // Neutral starting score
                rawScore: 0,
                weightedScore: 0,
                reviewCount: 0,
                aiAdjustment: 0,
                timeDecayFactor: 1,
                credibilityFactor: 1,
                latestUpdate: Date.now()
            };

            return defaultReputation;
        }

        // Fetch all reviews for this freelancer
        const reviews = await this.fetchAllReviews(freelancerAddress);

        // Calculate advanced reputation metrics
        const reputation = await this.calculateAdvancedReputation(freelancerAddress, reviews);

        // Update cache
        this.reputationCache.set(freelancerAddress, {
            reputation,
            timestamp: Date.now()
        });

        // Update Redis if available
        if (this.redisClient) {
            await this.redisClient.set(
                `reputation:${freelancerAddress}`,
                JSON.stringify({ reputation, timestamp: Date.now() }),
                { EX: 3600 } // 1 hour expiration
            );
        }

        return reputation;
    }

    /**
     * Fetch all reviews for a freelancer from the blockchain and relevant data sources
     * @param {string} freelancerAddress - Freelancer's address
     * @returns {Promise<Array>} - Array of review objects
     */
    async fetchAllReviews(freelancerAddress) {
        try {
            // Get all reviews from database
            const reviews = await this.reviews.find({
                freelancerAddress: freelancerAddress
            }).toArray();

            // Process each review
            const processedReviews = [];
            for (const review of reviews) {
                // Calculate time-based decay
                const age = (Date.now() / 1000) - review.timestamp;
                const decay = Math.exp(-this.DECAY_FACTOR * (age / this.TIME_UNIT));

                // Fetch additional data
                const clientCredibility = await this.getClientCredibility(review.clientAddress);
                const disputeData = await this.getDisputeData(review.freelancerAddress, review.clientAddress);

                processedReviews.push({
                    ...review,
                    age,
                    decay,
                    clientCredibility,
                    hasDispute: disputeData.hasDispute,
                    disputeResolution: disputeData.resolution
                });
            }

            this.logger.info(`Fetched ${processedReviews.length} reviews for ${freelancerAddress}`);
            return processedReviews;
        } catch (error) {
            this.logger.error(`Error fetching reviews: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get client credibility score based on their review history
     * @param {string} clientAddress - Client's address
     * @returns {Promise<number>} - Client credibility score (0-100)
     */
    async getClientCredibility(clientAddress) {
        try {
            // In a real system, this would query a database of client behavior
            // For example, factors could include:
            // - Consistency of their ratings (do they always give 1-star or 5-star?)
            // - How long they've been on the platform
            // - Whether their reviews get disputed
            // - Verification level of the client

            // For this example, we'll return a synthetic credibility score
            // In a real implementation, you would query your database

            // Get client data from contract
            const clientData = await this.contract.clients(clientAddress);
            const reviewsGiven = clientData.reviewsGiven.toNumber();

            // Account age factor - older accounts are more credible
            // This would typically come from your user database
            const accountAgeFactor = 0.8; // Placeholder

            // Reviews given factor - clients who give more reviews are slightly more credible
            const reviewsFactor = Math.min(1.0, 0.5 + (reviewsGiven * 0.05));

            // Verification factor - verified clients have higher credibility
            const verificationFactor = 1.0; // Placeholder - would come from your verification system

            // Calculate overall credibility
            let credibility = this.DEFAULT_CREDIBILITY * accountAgeFactor * reviewsFactor * verificationFactor;

            // Ensure within 0-100 range
            credibility = Math.max(0, Math.min(100, credibility));

            return credibility;
        } catch (error) {
            this.logger.error(`Error calculating client credibility: ${error.message}`);
            return this.DEFAULT_CREDIBILITY; // Return default on error
        }
    }

    /**
     * Get dispute data between a freelancer and client
     * @param {string} freelancerAddress - Freelancer's address
     * @param {string} clientAddress - Client's address
     * @returns {Promise<object>} - Dispute information
     */
    async getDisputeData(freelancerAddress, clientAddress) {
        // In a real system, this would query a disputes database
        // For this example, we'll return mock data
        return {
            hasDispute: false,
            resolution: null
        };
    }

    /**
     * Calculate advanced reputation score with all factors
     * @param {string} freelancerAddress - Freelancer's address
     * @param {Array} reviews - Array of review objects
     * @returns {Promise<object>} - Comprehensive reputation data
     */
    async calculateAdvancedReputation(freelancerAddress, reviews) {
        // Get the raw blockchain reputation as baseline
        const [averageRating, reviewCount] = await this.contract.getFreelancerReputation(freelancerAddress);
        const rawScore = averageRating.toNumber() / 100; // Convert from contract's scaled integer

        // If no reviews, return default
        if (reviewCount.toNumber() === 0) {
            return {
                address: freelancerAddress,
                trustScore: 50,
                rawScore: 0,
                weightedScore: 0,
                reviewCount: 0,
                aiAdjustment: 0,
                timeDecayFactor: 1,
                credibilityFactor: 1,
                latestUpdate: Date.now()
            };
        }

        // Calculate time-weighted score
        let weightedSum = 0;
        let weightSum = 0;
        let sentimentSum = 0;
        let recentReviews = 0;

        // Process each review
        for (const review of reviews) {
            // Apply time decay weight
            const timeWeight = review.decay;

            // Apply client credibility weight (0.5-1.5 range to not overpower other factors)
            const credibilityWeight = 0.5 + (review.clientCredibility / 100);

            // Handle disputes - reduce weight if there was a dispute
            const disputeWeight = review.hasDispute ? 0.7 : 1.0;

            // Calculate the total weight for this review
            const totalWeight = timeWeight * credibilityWeight * disputeWeight;

            // Add to weighted sum
            weightedSum += review.rating * totalWeight;
            weightSum += totalWeight;

            // Track recency
            if (review.age < (60 * 60 * 24 * 90)) { // Last 90 days
                recentReviews++;
            }

            // Perform sentiment analysis if we have comments
            if (review.comment && review.comment.length > 0) {
                try {
                    const sentiment = await this.analyzeSentiment(review.comment);
                    sentimentSum += sentiment * totalWeight;
                } catch (error) {
                    this.logger.warn(`Sentiment analysis failed: ${error.message}`);
                    // Use rating as fallback for sentiment
                    sentimentSum += ((review.rating - 3) / 2) * totalWeight; // Convert 1-5 to -1 to 1 range
                }
            }
        }

        // Calculate weighted rating
        const weightedRating = weightSum > 0 ? weightedSum / weightSum : 0;

        // Calculate average sentiment (-1 to 1 scale)
        const averageSentiment = weightSum > 0 ? sentimentSum / weightSum : 0;

        // Apply sentiment adjustment (adjust by up to +/- 0.5 stars)
        const sentimentAdjustment = averageSentiment * this.SENTIMENT_WEIGHT;

        // Calculate activity factor (boosts score if freelancer has recent reviews)
        const activityFactor = Math.min(1.1, 1 + (recentReviews / 10));

        // Calculate final weighted score (1-5 scale)
        const finalWeightedScore = Math.max(1, Math.min(5, (weightedRating + sentimentAdjustment) * activityFactor));

        // Convert to 0-100 trust score
        const trustScore = Math.round((finalWeightedScore - 1) * 25);

        // Return comprehensive reputation data
        return {
            address: freelancerAddress,
            trustScore,
            rawScore,
            weightedScore: finalWeightedScore,
            reviewCount: reviews.length,
            aiAdjustment: sentimentAdjustment,
            sentimentScore: averageSentiment,
            timeDecayFactor: weightSum > 0 ? weightedSum / (reviews.length * 5) : 1,
            credibilityFactor: activityFactor,
            recentReviews,
            latestUpdate: Date.now()
        };
    }

    /**
     * Analyze sentiment of review text using external AI service
     * @param {string} text - Review text to analyze
     * @returns {Promise<number>} - Sentiment score (-1 to 1)
     */
    async analyzeSentiment(text) {
        try {
            const headers = {};
            if (this.aiServiceApiKey) {
                headers['Authorization'] = `Bearer ${this.aiServiceApiKey}`;
            }

            const response = await axios.post(
                this.aiServiceUrl,
                { text },
                { headers }
            );

            if (response.status === 200 && response.data && typeof response.data.sentiment === 'number') {
                return response.data.sentiment; // Expect -1 (negative) to 1 (positive)
            } else {
                throw new Error('Invalid response from AI service');
            }
        } catch (error) {
            this.logger.error(`AI sentiment analysis failed: ${error.message}`);
            // Fall back to neutral sentiment
            return 0;
        }
    }

    /**
     * Clean up resources when service is shutting down
     */
    async shutdown() {
        // Remove event listeners
        this.contract.removeAllListeners();

        // Close WebSocket server
        if (this.wss) {
            this.wss.close();
        }

        // Close Redis connection
        if (this.redisClient) {
            await this.redisClient.quit();
        }

        // Close database connection
        if (this.db) {
            await this.db.close();
        }

        this.logger.info('Reputation service shut down successfully');
    }
}

module.exports = new FreelancerReputationService();