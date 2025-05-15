// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Escrow is ReentrancyGuard {
    address public client;
    address public freelancer;
    uint256 public amount;
    bool public isCompleted;
    bool public isRefunded;

    event MarkedAsCompleted(
        address indexed client,
        address indexed freelancer,
        uint256 amount
    );
    event Refunded(address indexed client, uint256 amount);
    event AgreementReached(address indexed client, address indexed freelancer);

    constructor(address _freelancer) payable {
        require(msg.value > 0, "Escrow amount must be greater than zero");
        client = msg.sender;
        freelancer = _freelancer;
        amount = msg.value;
        isCompleted = false;
        isRefunded = false;
    }

    modifier onlyClient() {
        require(msg.sender == client, "Only the client can call this function");
        _;
    }

    modifier onlyFreelancer() {
        require(
            msg.sender == freelancer,
            "Only the freelancer can call this function"
        );
        _;
    }

    function markAsCompleted() external onlyClient nonReentrant {
        require(!isCompleted, "Project already marked as completed");
        require(!isRefunded, "Funds already refunded");

        // Update state before transferring funds
        isCompleted = true;

        // Transfer funds using call()
        (bool success, ) = freelancer.call{value: amount}("");
        require(success, "Transfer to freelancer failed");

        // Emit event
        emit MarkedAsCompleted(client, freelancer, amount);
    }

    function refund() external onlyClient nonReentrant {
        require(!isCompleted, "Project already marked as completed");
        require(!isRefunded, "Funds already refunded");

        // Update state before transferring funds
        isRefunded = true;

        // Transfer funds using call()
        (bool success, ) = client.call{value: amount}("");
        require(success, "Refund to client failed");

        // Emit event
        emit Refunded(client, amount);
    }

    function agreeToComplete() external onlyFreelancer nonReentrant {
        require(!isCompleted, "Project already marked as completed");
        require(!isRefunded, "Funds already refunded");

        // Both parties agree to complete the project
        isCompleted = true;

        // Emit agreement event
        emit AgreementReached(client, freelancer);
    }

    // Fallback function to handle excess funds
    receive() external payable {
        amount += msg.value;
    }
}
