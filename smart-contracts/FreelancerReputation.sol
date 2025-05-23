// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ProofToken.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title FreelancerReputationSystem
 * @dev Contract for managing freelancer registrations, staking, and client reviews
 */
contract FreelancerReputationSystem {
    // ========== STATE VARIABLES ==========

    address public owner;
    ProofToken public proofToken;
    AggregatorV3Interface internal priceFeed;

    struct FreelancerProfile {
        string ipfsHash;
        uint256 reputation; // average rating * 100
        uint256 totalRating;
        uint256 reviewCount;
        address wallet;
        bool isVerified;
        uint256 stakedTokens;
        bool isRegistered;
    }

    struct Client {
        bool isRegistered;
        uint256 reviewsGiven;
    }

    struct Review {
        uint8 rating; // 1-5 stars
        string comment;
        uint256 timestamp;
    }

    mapping(address => FreelancerProfile) public freelancers;
    mapping(address => Client) public clients;
    mapping(address => mapping(address => Review)) public reviews; // freelancer => client => review
    mapping(address => mapping(address => bool)) public clientHasReviewed; // freelancer => client => bool

    // ========== EVENTS ==========

    event FreelancerRegistered(
        address indexed freelancer,
        string ipfsHash,
        uint256 timestamp
    );
    event ClientRegistered(address indexed client, uint256 timestamp);
    event ReviewSubmitted(
        address indexed client,
        address indexed freelancer,
        uint8 rating,
        string comment,
        uint256 timestamp
    );
    event ProfileUpdated(
        address indexed freelancer,
        string ipfsHash,
        uint256 timestamp
    );
    event TokensStaked(address indexed freelancer, uint256 amount);
    event TokensUnstaked(address indexed freelancer, uint256 amount);

    // ========== MODIFIERS ==========

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    modifier onlyRegisteredClient() {
        require(clients[msg.sender].isRegistered, "Client not registered");
        _;
    }

    modifier onlyRegisteredFreelancer() {
        require(
            freelancers[msg.sender].isRegistered,
            "Freelancer not registered"
        );
        _;
    }

    // ========== CONSTRUCTOR ==========

    /**
     * @notice Deploy the contract
     * @param _proofTokenAddress Address of the ProofToken contract
     * @param _priceFeedAddress Address of the Chainlink price feed
     */
    constructor(address _proofTokenAddress, address _priceFeedAddress) {
        owner = msg.sender;
        proofToken = ProofToken(_proofTokenAddress);
        priceFeed = AggregatorV3Interface(_priceFeedAddress);
    }

    // ========== REGISTRATION FUNCTIONS ==========

    /**
     * @notice Register a new freelancer
     * @param _ipfsHash The IPFS hash pointing to the freelancer's profile data
     */
    function registerAsFreelancer(string calldata _ipfsHash) external {
        require(!freelancers[msg.sender].isRegistered, "Already registered");
        freelancers[msg.sender] = FreelancerProfile({
            ipfsHash: _ipfsHash,
            reputation: 0,
            totalRating: 0,
            reviewCount: 0,
            wallet: msg.sender,
            isVerified: false,
            stakedTokens: 0,
            isRegistered: true
        });
        emit FreelancerRegistered(msg.sender, _ipfsHash, block.timestamp);
    }

    /**
     * @notice Register a new client
     */
    function registerAsClient() external {
        require(!clients[msg.sender].isRegistered, "Already registered");
        clients[msg.sender].isRegistered = true;
        clients[msg.sender].reviewsGiven = 0;
        emit ClientRegistered(msg.sender, block.timestamp);
    }

    // ========== REVIEW FUNCTIONS ==========

    /**
     * @notice Submit a review for a freelancer
     * @param freelancer The address of the freelancer
     * @param rating The rating (1-5) to give
     * @param comment The review comment
     */
    function leaveReview(
        address freelancer,
        uint8 rating,
        string calldata comment
    ) external onlyRegisteredClient {
        require(
            freelancers[freelancer].isRegistered,
            "Freelancer not registered"
        );
        require(
            !clientHasReviewed[freelancer][msg.sender],
            "Already reviewed this freelancer"
        );
        require(rating >= 1 && rating <= 5, "Rating must be 1-5");
        require(bytes(comment).length <= 280, "Comment too long");

        // Store the review
        reviews[freelancer][msg.sender] = Review({
            rating: rating,
            comment: comment,
            timestamp: block.timestamp
        });
        freelancers[freelancer].totalRating += rating;
        freelancers[freelancer].reviewCount += 1;
        freelancers[freelancer].reputation =
            (freelancers[freelancer].totalRating * 100) /
            freelancers[freelancer].reviewCount;
        clientHasReviewed[freelancer][msg.sender] = true;

        // Update client stats
        clients[msg.sender].reviewsGiven += 1;

        emit ReviewSubmitted(
            msg.sender,
            freelancer,
            rating,
            comment,
            block.timestamp
        );
    }

    // ========== VIEW FUNCTIONS ==========

    /**
     * @notice Get a freelancer's reputation score
     * @param freelancer The address of the freelancer
     * @return average The average rating (0 if no reviews)
     * @return count The number of reviews
     */
    function getFreelancerReputation(
        address freelancer
    ) external view returns (uint256 average, uint256 count) {
        if (freelancers[freelancer].reviewCount == 0) {
            return (0, 0);
        }
        average = freelancers[freelancer].reputation;
        count = freelancers[freelancer].reviewCount;
    }

    /**
     * @notice Check if a client has reviewed a freelancer
     * @param client The address of the client
     * @param freelancer The address of the freelancer
     * @return True if reviewed, false otherwise
     */
    function hasClientReviewedFreelancer(
        address client,
        address freelancer
    ) external view returns (bool) {
        return clientHasReviewed[freelancer][client];
    }

    /**
     * @notice Get the freelancer's profile
     * @param _freelancer The address of the freelancer
     * @return The freelancer's profile
     */
    function getProfile(
        address _freelancer
    ) external view returns (FreelancerProfile memory) {
        return freelancers[_freelancer];
    }

    // ========== PROFILE MANAGEMENT ==========

    /**
     * @notice Update the freelancer's profile
     * @param _ipfsHash The new IPFS hash pointing to the updated profile data
     */
    function updateProfile(
        string calldata _ipfsHash
    ) external onlyRegisteredFreelancer {
        freelancers[msg.sender].ipfsHash = _ipfsHash;
        emit ProfileUpdated(msg.sender, _ipfsHash, block.timestamp);
    }

    // ========== PRICE FEED FUNCTIONS ==========

    /**
     * @notice Get the latest price of the PROOF token in USD
     * @return price The price of 1 PROOF token in USD (8 decimals)
     */
    function getProofTokenPrice() public view returns (uint256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        return uint256(price);
    }

    // ========== STAKING FUNCTIONS ==========

    /**
     * @notice Stake tokens in USD-equivalent amounts
     * @param usdAmount The amount in USD to stake
     */
    function stakeTokensInUSD(
        uint256 usdAmount
    ) external onlyRegisteredFreelancer {
        require(usdAmount > 0, "Amount must be greater than zero");
        uint256 proofTokenPrice = getProofTokenPrice(); // Get the current price of PROOF in USD
        uint256 tokenAmount = (usdAmount * 1e18) / proofTokenPrice; // Convert USD to token amount

        // Transfer PROOF tokens from the freelancer to the contract
        require(
            proofToken.transferFrom(msg.sender, address(this), tokenAmount),
            "Token transfer failed"
        );

        // Update staked tokens
        freelancers[msg.sender].stakedTokens += tokenAmount;

        emit TokensStaked(msg.sender, tokenAmount);
    }

    /**
     * @notice Unstake tokens
     * @param _amount The amount of tokens to unstake
     */
    function unstakeTokens(uint256 _amount) external onlyRegisteredFreelancer {
        require(_amount > 0, "Amount must be greater than zero");
        FreelancerProfile storage profile = freelancers[msg.sender];
        require(profile.stakedTokens >= _amount, "Insufficient staked tokens");

        // Update staked tokens
        profile.stakedTokens -= _amount;

        // Transfer PROOF tokens back to the freelancer
        require(
            proofToken.transfer(msg.sender, _amount),
            "Token transfer failed"
        );

        emit TokensUnstaked(msg.sender, _amount);
    }

    /**
     * @notice Get the amount of staked tokens for a freelancer
     * @param _freelancer The address of the freelancer
     * @return The amount of staked tokens
     */
    function getStakedTokens(
        address _freelancer
    ) external view returns (uint256) {
        return freelancers[_freelancer].stakedTokens;
    }
}
