// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ProofToken is ERC20, Ownable {
    constructor() ERC20("Proof Token", "PROOF") {
        // Mint initial supply to the owner
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    // Function to mint new tokens (restricted to the owner)
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
