// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Escrow {
    address public client;
    address public freelancer;
    uint256 public amount;
    bool public isCompleted;
    bool public isRefunded;

    constructor(address _freelancer) payable {
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

    function markAsCompleted() external onlyClient {
        require(!isCompleted, "Project already marked as completed");
        require(!isRefunded, "Funds already refunded");
        isCompleted = true;
        payable(freelancer).transfer(amount);
    }

    function refund() external onlyClient {
        require(!isCompleted, "Project already marked as completed");
        require(!isRefunded, "Funds already refunded");
        isRefunded = true;
        payable(client).transfer(amount);
    }
}
