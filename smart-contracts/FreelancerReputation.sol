// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ProofToken.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title FreelancerReputationSystem
 * @dev Contract for managing freelancer registrations, staking, and client reviews
 * @custom:security-contact security@example.com
 */
contract FreelancerReputationSystem {
    // ========== STATE VARIABLES ==========

    address public owner;
    ProofToken public proofToken;
    AggregatorV3Interface internal priceFeed;

    struct Freelancer {
        bool isRegistered;
        uint256 totalRating; // Sum of all ratings
        uint256 reviewCount; // Number of reviews received
        mapping(address => bool) clientHasReviewed; // Track which clients have left reviews
    }

    struct Client {
        bool isRegistered;
        uint256 reviewsGiven;
    }

    struct Review {
        uint8 rating; // 1-5 stars
        string comment; // Review comment
        uint256 timestamp; // When the review was created
    }

    struct FreelancerProfile {
        string ipfsHash;
        uint256 reputation;
        uint256 reviewCount;
        address wallet;
        bool isVerified;
        uint256 stakedTokens; // Amount of staked PROOF tokens
    }

    mapping(address => FreelancerProfile) public freelancers;

    event ProfileCreated(address indexed freelancer, string ipfsHash);
    event ProfileUpdated(address indexed freelancer, string ipfsHash);
    event TokensStaked(address indexed freelancer, uint256 amount);
    event TokensUnstaked(address indexed freelancer, uint256 amount);

    mapping(address => Client) public clients;
    mapping(address => mapping(address => Review)) public reviews; // freelancer => client => review

    // ========== EVENTS ==========

    event FreelancerRegistered(address indexed freelancer, uint256 timestamp);
    event ClientRegistered(address indexed client, uint256 timestamp);
    event ReviewSubmitted(
        address indexed client,
        address indexed freelancer,
        uint8 rating,
        string comment,
        uint256 timestamp
    );

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
            freelancers[msg.sender].wallet != address(0),
            "Freelancer not registered"
        );
        _;
    }

    constructor(address _proofTokenAddress, address _priceFeedAddress) {
        owner = msg.sender;
        proofToken = ProofToken(_proofTokenAddress);
        priceFeed = AggregatorV3Interface(_priceFeedAddress);
    }

    // ========== REGISTRATION FUNCTIONS ==========

    /**
     * @dev Register a new freelancer
     */
    function registerAsFreelancer() external {
        require(
            freelancers[msg.sender].wallet == address(0),
            "Already registered"
        );

        freelancers[msg.sender].isRegistered = true;
        freelancers[msg.sender].totalRating = 0;
        freelancers[msg.sender].reviewCount = 0;

        emit FreelancerRegistered(msg.sender, block.timestamp);
    }

    /**
     * @dev Register a new client
     */
    function registerAsClient() external {
        require(!clients[msg.sender].isRegistered, "Already registered");

        clients[msg.sender].isRegistered = true;
        clients[msg.sender].reviewsGiven = 0;

        emit ClientRegistered(msg.sender, block.timestamp);
    }

    // ========== REVIEW FUNCTIONS ==========

    /**
     * @dev Submit a review for a freelancer
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
        require(rating >= 1 && rating <= 5, "Rating must be between 1-5");
        require(
            !freelancers[freelancer].clientHasReviewed[msg.sender],
            "Already reviewed this freelancer"
        );
        require(bytes(comment).length <= 280, "Comment too long");

        // Store the review
        reviews[freelancer][msg.sender] = Review({
            rating: rating,
            comment: comment,
            timestamp: block.timestamp
        });

        // Update freelancer's reputation stats
        freelancers[freelancer].totalRating += rating;
        freelancers[freelancer].reviewCount += 1;
        freelancers[freelancer].clientHasReviewed[msg.sender] = true;

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
     * @dev Get a freelancer's reputation score
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

        average =
            (freelancers[freelancer].totalRating * 100) /
            freelancers[freelancer].reviewCount;
        count = freelancers[freelancer].reviewCount;
    }

    /**
     * @dev Check if a client has already reviewed a freelancer
     */
    function hasClientReviewedFreelancer(
        address client,
        address freelancer
    ) external view returns (bool) {
        return freelancers[freelancer].clientHasReviewed[client];
    }

    function setProfile(string calldata _ipfsHash) external {
        FreelancerProfile storage profile = freelancers[msg.sender];

        if (profile.wallet == address(0)) {
            profile.wallet = msg.sender;
            profile.reputation = 0;
            profile.reviewCount = 0;
            profile.isVerified = false;
            profile.stakedTokens = 0;
            emit ProfileCreated(msg.sender, _ipfsHash);
        } else {
            emit ProfileUpdated(msg.sender, _ipfsHash);
        }

        profile.ipfsHash = _ipfsHash;
    }

    // ========== PRICE FEED FUNCTIONS ==========

    /**
     * @dev Get the latest price of the PROOF token in USD
     * @return price The price of 1 PROOF token in USD (8 decimals)
     */
    function getProofTokenPrice() public view returns (uint256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        return uint256(price);
    }

    // ========== STAKING FUNCTIONS ==========

    /**
     * @dev Stake tokens in USD-equivalent amounts
     * @param usdAmount The amount in USD to stake
     */
    function stakeTokensInUSD(
        uint256 usdAmount
    ) external onlyRegisteredFreelancer {
        require(usdAmount > 0, "Amount must be greater than zero");

        uint256 proofTokenPrice = getProofTokenPrice(); // Get the current price of PROOF in USD
        uint256 tokenAmount = (usdAmount * 1e18) / proofTokenPrice; // Convert USD to token amount

        // Transfer PROOF tokens from the freelancer to the contract
        proofToken.transferFrom(msg.sender, address(this), tokenAmount);

        // Update staked tokens
        freelancers[msg.sender].stakedTokens += tokenAmount;

        emit TokensStaked(msg.sender, tokenAmount);
    }

    /**
     * @dev Unstake tokens
     * @param _amount The amount of tokens to unstake
     */
    function unstakeTokens(uint256 _amount) external onlyRegisteredFreelancer {
        require(_amount > 0, "Amount must be greater than zero");
        FreelancerProfile storage profile = freelancers[msg.sender];
        require(profile.stakedTokens >= _amount, "Insufficient staked tokens");

        // Update staked tokens
        profile.stakedTokens -= _amount;

        // Transfer PROOF tokens back to the freelancer
        proofToken.transfer(msg.sender, _amount);

        emit TokensUnstaked(msg.sender, _amount);
    }

    function getStakedTokens(
        address _freelancer
    ) external view returns (uint256) {
        return freelancers[_freelancer].stakedTokens;
    }
}
