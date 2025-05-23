// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ProofToken.sol";
import "./FreelancerReputation.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract JobMarketplace is ReentrancyGuard {
    enum JobStatus {
        Open,
        InProgress,
        Completed,
        Cancelled
    }

    struct Job {
        uint256 id;
        address client;
        string title;
        string description;
        uint256 budget; // in PROOF tokens
        uint256 deadline; // timestamp
        address freelancer;
        JobStatus status;
        uint256 escrowedAmount;
    }

    ProofToken public proofToken;
    FreelancerReputationSystem public reputationSystem;
    uint256 public nextJobId;
    mapping(uint256 => Job) public jobs;

    event JobPosted(
        uint256 indexed jobId,
        address indexed client,
        string title,
        uint256 budget,
        uint256 deadline
    );
    event JobApplied(uint256 indexed jobId, address indexed freelancer);
    event JobStarted(uint256 indexed jobId, address indexed freelancer);
    event JobCompleted(uint256 indexed jobId, address indexed freelancer);
    event JobCancelled(uint256 indexed jobId);
    event EscrowFunded(uint256 indexed jobId, uint256 amount);
    event EscrowReleased(
        uint256 indexed jobId,
        address indexed freelancer,
        uint256 amount
    );

    modifier onlyClient(uint256 jobId) {
        require(jobs[jobId].client == msg.sender, "Not job client");
        _;
    }

    modifier onlyFreelancer(uint256 jobId) {
        require(jobs[jobId].freelancer == msg.sender, "Not job freelancer");
        _;
    }

    constructor(address _proofToken, address _reputationSystem) {
        proofToken = ProofToken(_proofToken);
        reputationSystem = FreelancerReputationSystem(_reputationSystem);
        nextJobId = 1;
    }

    function postJob(
        string calldata title,
        string calldata description,
        uint256 budget,
        uint256 deadline
    ) external returns (uint256) {
        require(budget > 0, "Budget must be positive");
        require(deadline > block.timestamp, "Deadline must be in future");

        uint256 jobId = nextJobId++;
        jobs[jobId] = Job({
            id: jobId,
            client: msg.sender,
            title: title,
            description: description,
            budget: budget,
            deadline: deadline,
            freelancer: address(0),
            status: JobStatus.Open,
            escrowedAmount: 0
        });

        emit JobPosted(jobId, msg.sender, title, budget, deadline);
        return jobId;
    }

    function applyForJob(uint256 jobId) external {
        require(jobs[jobId].status == JobStatus.Open, "Job not open");
        require(
            reputationSystem.freelancers(msg.sender).isRegistered,
            "Not a registered freelancer"
        );
        // In a real system, you might want to store applications and let the client choose.
        jobs[jobId].freelancer = msg.sender;
        jobs[jobId].status = JobStatus.InProgress;
        emit JobApplied(jobId, msg.sender);
        emit JobStarted(jobId, msg.sender);
    }

    function fundEscrow(uint256 jobId) external onlyClient(jobId) nonReentrant {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.InProgress, "Job not in progress");
        require(job.escrowedAmount == 0, "Already funded");
        require(
            proofToken.transferFrom(msg.sender, address(this), job.budget),
            "Token transfer failed"
        );
        job.escrowedAmount = job.budget;
        emit EscrowFunded(jobId, job.budget);
    }

    function markJobCompleted(
        uint256 jobId
    ) external onlyFreelancer(jobId) nonReentrant {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.InProgress, "Job not in progress");
        require(job.escrowedAmount > 0, "Escrow not funded");
        job.status = JobStatus.Completed;
        require(
            proofToken.transfer(job.freelancer, job.escrowedAmount),
            "Payout failed"
        );
        emit EscrowReleased(jobId, job.freelancer, job.escrowedAmount);
        emit JobCompleted(jobId, job.freelancer);
    }

    function cancelJob(uint256 jobId) external onlyClient(jobId) nonReentrant {
        Job storage job = jobs[jobId];
        require(
            job.status == JobStatus.Open || job.status == JobStatus.InProgress,
            "Cannot cancel"
        );
        if (job.escrowedAmount > 0) {
            require(
                proofToken.transfer(job.client, job.escrowedAmount),
                "Refund failed"
            );
        }
        job.status = JobStatus.Cancelled;
        emit JobCancelled(jobId);
    }

    // Add more functions for dispute resolution, milestone payments, etc.
}
