const hre = require("hardhat");
require("dotenv").config();

/**
 * Deploys the FreelancerReputationSystem contract to Optimism/Polygon
 */
async function main() {
    console.log("Starting deployment...");

    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deploying with account: ${deployer.address}`);
    const balanceBefore = await deployer.getBalance();
    console.log(`Deployer balance: ${hre.ethers.formatEther(balanceBefore)} ETH`);

    // Deploy ProofToken
    console.log("Deploying ProofToken...");
    const ProofToken = await hre.ethers.getContractFactory("ProofToken");
    const proofToken = await ProofToken.deploy();
    await proofToken.deployed();
    console.log(`ProofToken deployed to: ${proofToken.address}`);

    // Deploy FreelancerReputationSystem
    console.log("Deploying FreelancerReputationSystem...");
    const FreelancerReputationSystem = await hre.ethers.getContractFactory("FreelancerReputationSystem");

    // Replace with the Chainlink Price Feed address for your network
    const priceFeedAddress = "0xYourChainlinkPriceFeedAddress"; // Example: ETH/USD price feed address
    const freelancerReputation = await FreelancerReputationSystem.deploy(proofToken.address, priceFeedAddress);
    await freelancerReputation.deployed();
    console.log(`FreelancerReputationSystem deployed to: ${freelancerReputation.address}`);

    const balanceAfter = await deployer.getBalance();
    const gasCost = balanceBefore.sub(balanceAfter);
    console.log(`Gas used: ${hre.ethers.formatEther(gasCost)} ETH`);

    console.log("Deployment complete!");
}

// Execute deployment
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });