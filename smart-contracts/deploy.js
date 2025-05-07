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
    const freelancerReputation = await FreelancerReputationSystem.deploy(proofToken.address);
    await freelancerReputation.deployed();
    console.log(`FreelancerReputationSystem deployed to: ${freelancerReputation.address}`);

    const balanceAfter = await deployer.getBalance();
    const gasCost = balanceBefore.sub(balanceAfter);
    console.log(`Gas used: ${hre.ethers.formatEther(gasCost)} ETH`);

    console.log("Deployment complete!");
}

/**
 * Gets optimized gas settings based on the current network
 */
async function getOptimizedGasSettings() {
    try {
        const feeData = await hre.ethers.provider.getFeeData();

        return {
            gasPrice: feeData.gasPrice
        };
    } catch (error) {
        console.warn("Error getting optimized gas settings:", error.message);
        return {};
    }
}

/**
 * Attempts to verify contract on supported explorers
 */
async function verifyContract(contractAddress) {
    // Skip verification on local networks
    if (['localhost', 'hardhat'].includes(hre.network.name)) {
        console.log('Skipping verification on local network');
        return;
    }

    console.log('Waiting for block confirmations before verification...');
    // Wait for transaction confirmations
    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log('Attempting contract verification...');
    try {
        await hre.run("verify:verify", {
            address: contractAddress,
            constructorArguments: []
        });
        console.log("✅ Contract verified successfully");
    } catch (error) {
        console.warn("⚠️ Verification failed:", error.message);
    }
}

// Execute deployment
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });