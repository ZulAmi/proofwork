const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

async function deployContractFixture() {
    const [owner, freelancer1, freelancer2, client1, client2, client3, unauthorized] = await ethers.getSigners();

    // Deploy ProofToken
    const ProofToken = await ethers.getContractFactory("ProofToken");
    const proofToken = await ProofToken.deploy();

    // Deploy MockV3Aggregator (8 decimals, price = 1e8)
    const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
    const priceFeed = await MockV3Aggregator.deploy(8, 100000000); // Direct number instead of string

    // Deploy FreelancerReputationSystem with mocks
    const FreelancerReputationSystem = await ethers.getContractFactory("FreelancerReputationSystem");
    const freelancerReputation = await FreelancerReputationSystem.deploy(
        await proofToken.getAddress(),
        await priceFeed.getAddress()
    );

    return {
        freelancerReputation,
        proofToken,
        priceFeed,
        owner,
        freelancer1,
        freelancer2,
        client1,
        client2,
        client3,
        unauthorized
    };
}

describe("FreelancerReputationSystem", function () {
    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { freelancerReputation, owner } = await loadFixture(deployContractFixture);
            expect(await freelancerReputation.owner()).to.equal(await owner.getAddress());
        });
    });

    describe("Registration", function () {
        it("Should allow freelancers to register", async function () {
            const { freelancerReputation, freelancer1 } = await loadFixture(deployContractFixture);

            await expect(freelancerReputation.connect(freelancer1).registerAsFreelancer("ipfs://hash"))
                .to.emit(freelancerReputation, "FreelancerRegistered")
                .withArgs(await freelancer1.getAddress(), "ipfs://hash", await ethers.provider.getBlock("latest").then(b => b.timestamp + 1));

            const profile = await freelancerReputation.freelancers(await freelancer1.getAddress());
            expect(profile.isRegistered).to.equal(true);
        });

        it("Should prevent double registration for freelancers", async function () {
            const { freelancerReputation, freelancer1 } = await loadFixture(deployContractFixture);

            await freelancerReputation.connect(freelancer1).registerAsFreelancer("ipfs://hash");

            await expect(
                freelancerReputation.connect(freelancer1).registerAsFreelancer("ipfs://hash2")
            ).to.be.revertedWith("Already registered");
        });

        it("Should allow clients to register", async function () {
            const { freelancerReputation, client1 } = await loadFixture(deployContractFixture);

            await expect(freelancerReputation.connect(client1).registerAsClient())
                .to.emit(freelancerReputation, "ClientRegistered")
                .withArgs(await client1.getAddress(), await ethers.provider.getBlock("latest").then(b => b.timestamp + 1));

            const client = await freelancerReputation.clients(await client1.getAddress());
            expect(client.isRegistered).to.equal(true);
        });

        it("Should prevent double registration for clients", async function () {
            const { freelancerReputation, client1 } = await loadFixture(deployContractFixture);

            await freelancerReputation.connect(client1).registerAsClient();

            await expect(
                freelancerReputation.connect(client1).registerAsClient()
            ).to.be.revertedWith("Already registered");
        });
    });

    describe("Review Submission", function () {
        it("Should allow clients to submit reviews", async function () {
            const { freelancerReputation, freelancer1, client1 } = await loadFixture(deployContractFixture);

            await freelancerReputation.connect(freelancer1).registerAsFreelancer("ipfs://hash");
            await freelancerReputation.connect(client1).registerAsClient();

            const rating = 4;
            const comment = "Great work!";

            await expect(freelancerReputation.connect(client1).leaveReview(await freelancer1.getAddress(), rating, comment))
                .to.emit(freelancerReputation, "ReviewSubmitted")
                .withArgs(
                    await client1.getAddress(),
                    await freelancer1.getAddress(),
                    rating,
                    comment,
                    await ethers.provider.getBlock("latest").then(b => b.timestamp + 1)
                );

            const freelancerData = await freelancerReputation.freelancers(await freelancer1.getAddress());
            expect(freelancerData.totalRating).to.equal(rating);
            expect(freelancerData.reviewCount).to.equal(1);

            const clientData = await freelancerReputation.clients(await client1.getAddress());
            expect(clientData.reviewsGiven).to.equal(1);

            const review = await freelancerReputation.reviews(await freelancer1.getAddress(), await client1.getAddress());
            expect(review.rating).to.equal(rating);
            expect(review.comment).to.equal(comment);
        });

        it("Should prevent reviews from unregistered clients", async function () {
            const { freelancerReputation, freelancer1, client1 } = await loadFixture(deployContractFixture);

            await freelancerReputation.connect(freelancer1).registerAsFreelancer("ipfs://hash");

            await expect(
                freelancerReputation.connect(client1).leaveReview(await freelancer1.getAddress(), 5, "Nice")
            ).to.be.revertedWith("Client not registered");
        });

        it("Should prevent reviews for unregistered freelancers", async function () {
            const { freelancerReputation, freelancer2, client1 } = await loadFixture(deployContractFixture);

            await freelancerReputation.connect(client1).registerAsClient();

            await expect(
                freelancerReputation.connect(client1).leaveReview(await freelancer2.getAddress(), 5, "Nice")
            ).to.be.revertedWith("Freelancer not registered");
        });

        it("Should prevent duplicate reviews from the same client", async function () {
            const { freelancerReputation, freelancer1, client1 } = await loadFixture(deployContractFixture);

            await freelancerReputation.connect(freelancer1).registerAsFreelancer("ipfs://hash");
            await freelancerReputation.connect(client1).registerAsClient();

            await freelancerReputation.connect(client1).leaveReview(await freelancer1.getAddress(), 5, "Nice");

            await expect(
                freelancerReputation.connect(client1).leaveReview(await freelancer1.getAddress(), 4, "Again")
            ).to.be.revertedWith("Already reviewed this freelancer");
        });

        it("Should enforce valid rating range (1-5)", async function () {
            const { freelancerReputation, freelancer1, client1 } = await loadFixture(deployContractFixture);

            await freelancerReputation.connect(freelancer1).registerAsFreelancer("ipfs://hash");
            await freelancerReputation.connect(client1).registerAsClient();

            await expect(
                freelancerReputation.connect(client1).leaveReview(await freelancer1.getAddress(), 0, "Bad")
            ).to.be.revertedWith("Rating must be 1-5");

            await expect(
                freelancerReputation.connect(client1).leaveReview(await freelancer1.getAddress(), 6, "Bad")
            ).to.be.revertedWith("Rating must be 1-5");
        });

        it("Should limit comment length for gas efficiency", async function () {
            const { freelancerReputation, freelancer1, client1 } = await loadFixture(deployContractFixture);

            await freelancerReputation.connect(freelancer1).registerAsFreelancer("ipfs://hash");
            await freelancerReputation.connect(client1).registerAsClient();

            const longComment = "a".repeat(281);

            await expect(
                freelancerReputation.connect(client1).leaveReview(await freelancer1.getAddress(), 5, longComment)
            ).to.be.revertedWith("Comment too long");
        });
    });

    describe("Reputation Calculation", function () {
        it("Should correctly calculate average reputation", async function () {
            const { freelancerReputation, freelancer1, client1, client2 } = await loadFixture(deployContractFixture);

            await freelancerReputation.connect(freelancer1).registerAsFreelancer("ipfs://hash");
            await freelancerReputation.connect(client1).registerAsClient();
            await freelancerReputation.connect(client2).registerAsClient();

            await freelancerReputation.connect(client1).leaveReview(await freelancer1.getAddress(), 4, "Good");
            await freelancerReputation.connect(client2).leaveReview(await freelancer1.getAddress(), 2, "Okay");

            const [average, count] = await freelancerReputation.getFreelancerReputation(await freelancer1.getAddress());
            expect(average).to.equal(300); // (4+2)/2*100 = 300
            expect(count).to.equal(2);
        });

        it("Should handle zero reviews case", async function () {
            const { freelancerReputation, freelancer1 } = await loadFixture(deployContractFixture);

            await freelancerReputation.connect(freelancer1).registerAsFreelancer("ipfs://hash");

            const [average, count] = await freelancerReputation.getFreelancerReputation(await freelancer1.getAddress());
            expect(average).to.equal(0);
            expect(count).to.equal(0);
        });

        it("Should handle unregistered freelancer reputation query", async function () {
            const { freelancerReputation, freelancer2 } = await loadFixture(deployContractFixture);

            const [average, count] = await freelancerReputation.getFreelancerReputation(await freelancer2.getAddress());
            expect(average).to.equal(0);
            expect(count).to.equal(0);
        });
    });

    describe("Client Review Status", function () {
        it("Should correctly track if a client has reviewed a freelancer", async function () {
            const { freelancerReputation, freelancer1, client1 } = await loadFixture(deployContractFixture);

            await freelancerReputation.connect(freelancer1).registerAsFreelancer("ipfs://hash");
            await freelancerReputation.connect(client1).registerAsClient();

            expect(
                await freelancerReputation.hasClientReviewedFreelancer(await client1.getAddress(), await freelancer1.getAddress())
            ).to.equal(false);

            await freelancerReputation.connect(client1).leaveReview(await freelancer1.getAddress(), 5, "Nice");

            expect(
                await freelancerReputation.hasClientReviewedFreelancer(await client1.getAddress(), await freelancer1.getAddress())
            ).to.equal(true);
        });
    });
});