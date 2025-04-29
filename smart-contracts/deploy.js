const hre = require("hardhat");
require("dotenv").config();

/**
 * Deploys the FreelancerReputationSystem contract to Optimism/Polygon
 */
async function main() {
    try {
        console.log("Starting deployment of FreelancerReputationSystem contract...");
        console.log("Network:", hre.network.name);

        // Get the deployer account
        const [deployer] = await hre.ethers.getSigners();
        console.log(`Deploying with account: ${deployer.address}`);

        // Check balance
        const balanceBefore = await deployer.getBalance();
        console.log(`Deployer balance: ${hre.ethers.formatEther(balanceBefore)} ETH`);

        // Get the contract factory
        const FreelancerReputationSystem = await hre.ethers.getContractFactory("FreelancerReputationSystem");

        // Get optimized gas settings
        const gasSettings = await getOptimizedGasSettings();
        console.log("Using gas settings:", JSON.stringify(gasSettings, null, 2));

        // Deploy the contract with gas optimizations
        console.log("Deploying contract...");
        const freelancerReputation = await FreelancerReputationSystem.deploy(gasSettings);
        const contractAddress = await freelancerReputation.getAddress();

        console.log(`✅ Contract deployed successfully to: ${contractAddress}`);

        // Calculate gas used
        const balanceAfter = await deployer.getBalance();
        const gasCost = balanceBefore - balanceAfter;
        console.log(`Gas used: ${hre.ethers.formatEther(gasCost)} ETH`);

        // Verify contract if not on local network
        await verifyContract(contractAddress);

        return { success: true, contractAddress };
    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
        if (error.code) {
            console.error(`Error code: ${error.code}`);
        }
        if (error.transaction) {
            console.error(`Transaction hash: ${error.transaction.hash}`);
        }
        return { success: false, error };
    }
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
    .then((result) => process.exit(result.success ? 0 : 1))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });