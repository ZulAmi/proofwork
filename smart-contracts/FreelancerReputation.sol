// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FreelancerReputationSystem
 * @dev Contract for managing freelancer registrations and client reviews
 * @custom:security-contact security@example.com
 */
contract FreelancerReputationSystem {
    // ========== STATE VARIABLES ==========

    address public owner;

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

    mapping(address => Freelancer) public freelancers;
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
            freelancers[msg.sender].isRegistered,
            "Freelancer not registered"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ========== REGISTRATION FUNCTIONS ==========

    /**
     * @dev Register a new freelancer
     */
    function registerAsFreelancer() external {
        require(!freelancers[msg.sender].isRegistered, "Already registered");

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
}
