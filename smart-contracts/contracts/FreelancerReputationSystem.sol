// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ProofToken.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract FreelancerReputationSystem {
    // ========== STATE VARIABLES ==========
    address public owner;
    ProofToken public proofToken;
    AggregatorV3Interface internal priceFeed;

    uint256 public constant MAX_COMMENT_LENGTH = 280;

    struct FreelancerProfile {
        string ipfsHash;
        uint256 totalRating;
        uint256 reviewCount;
        bool isRegistered;
        uint256 stakedTokens;
    }

    struct ClientProfile {
        bool isRegistered;
        uint256 reviewsGiven;
    }

    struct Review {
        uint8 rating;
        string comment;
        uint256 timestamp;
    }

    mapping(address => FreelancerProfile) public freelancers;
    mapping(address => ClientProfile) public clients;
    mapping(address => mapping(address => Review)) public reviews; // freelancer => client => review

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

    // ========== CONSTRUCTOR ==========
    constructor(address _proofTokenAddress, address _priceFeedAddress) {
        owner = msg.sender;
        proofToken = ProofToken(_proofTokenAddress);
        priceFeed = AggregatorV3Interface(_priceFeedAddress);
    }

    // ========== FUNCTIONS ==========
    function registerAsFreelancer(string memory ipfsHash) external {
        require(!freelancers[msg.sender].isRegistered, "Already registered");

        freelancers[msg.sender] = FreelancerProfile({
            ipfsHash: ipfsHash,
            totalRating: 0,
            reviewCount: 0,
            isRegistered: true,
            stakedTokens: 0
        });

        emit FreelancerRegistered(msg.sender, ipfsHash, block.timestamp);
    }

    function registerAsClient() external {
        require(!clients[msg.sender].isRegistered, "Already registered");

        clients[msg.sender] = ClientProfile({
            isRegistered: true,
            reviewsGiven: 0
        });

        emit ClientRegistered(msg.sender, block.timestamp);
    }

    function leaveReview(
        address freelancerAddress,
        uint8 rating,
        string memory comment
    ) external {
        require(clients[msg.sender].isRegistered, "Client not registered");
        require(
            freelancers[freelancerAddress].isRegistered,
            "Freelancer not registered"
        );
        require(rating >= 1 && rating <= 5, "Rating must be 1-5");
        require(
            bytes(comment).length <= MAX_COMMENT_LENGTH,
            "Comment too long"
        );
        require(
            reviews[freelancerAddress][msg.sender].timestamp == 0,
            "Already reviewed this freelancer"
        );

        reviews[freelancerAddress][msg.sender] = Review({
            rating: rating,
            comment: comment,
            timestamp: block.timestamp
        });

        freelancers[freelancerAddress].totalRating += rating;
        freelancers[freelancerAddress].reviewCount++;
        clients[msg.sender].reviewsGiven++;

        emit ReviewSubmitted(
            msg.sender,
            freelancerAddress,
            rating,
            comment,
            block.timestamp
        );
    }

    function getFreelancerReputation(
        address freelancerAddress
    ) external view returns (uint256, uint256) {
        FreelancerProfile memory freelancer = freelancers[freelancerAddress];

        if (freelancer.reviewCount == 0) {
            return (0, 0);
        }

        // Calculate average rating * 100 to preserve precision
        uint256 avgRating = (freelancer.totalRating * 100) /
            freelancer.reviewCount;

        return (avgRating, freelancer.reviewCount);
    }

    function hasClientReviewedFreelancer(
        address clientAddress,
        address freelancerAddress
    ) external view returns (bool) {
        return reviews[freelancerAddress][clientAddress].timestamp > 0;
    }
}
