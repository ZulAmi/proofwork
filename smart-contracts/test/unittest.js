const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("FreelancerReputationSystem", function () {
    // Define test fixture to reuse the same setup in multiple tests
    async function deployContractFixture() {
        // Get signers for testing
        const [owner, freelancer1, freelancer2, client1, client2, client3, unauthorized] = await ethers.getSigners();

        // Deploy the contract
        const FreelancerReputationSystem = await ethers.getContractFactory("FreelancerReputationSystem");
        const freelancerReputation = await FreelancerReputationSystem.deploy();

        return {
            freelancerReputation,
            owner,
            freelancer1,
            freelancer2,
            client1,
            client2,
            client3,
            unauthorized
        };
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { freelancerReputation, owner } = await loadFixture(deployContractFixture);
            expect(await freelancerReputation.owner()).to.equal(owner.address);
        });
    });

    describe("Registration", function () {
        it("Should allow freelancers to register", async function () {
            const { freelancerReputation, freelancer1 } = await loadFixture(deployContractFixture);

            // Register freelancer
            await expect(freelancerReputation.connect(freelancer1).registerAsFreelancer())
                .to.emit(freelancerReputation, "FreelancerRegistered")
                .withArgs(freelancer1.address, await time.latest() + 1);

            // Check if registered
            const freelancerData = await freelancerReputation.freelancers(freelancer1.address);
            expect(freelancerData.isRegistered).to.be.true;
            expect(freelancerData.totalRating).to.equal(0);
            expect(freelancerData.reviewCount).to.equal(0);
        });

        it("Should prevent double registration for freelancers", async function () {
            const { freelancerReputation, freelancer1 } = await loadFixture(deployContractFixture);

            // Register once
            await freelancerReputation.connect(freelancer1).registerAsFreelancer();

            // Try to register again
            await expect(
                freelancerReputation.connect(freelancer1).registerAsFreelancer()
            ).to.be.revertedWith("Already registered");
        });

        it("Should allow clients to register", async function () {
            const { freelancerReputation, client1 } = await loadFixture(deployContractFixture);

            // Register client
            await expect(freelancerReputation.connect(client1).registerAsClient())
                .to.emit(freelancerReputation, "ClientRegistered")
                .withArgs(client1.address, await time.latest() + 1);

            // Check if registered
            const clientData = await freelancerReputation.clients(client1.address);
            expect(clientData.isRegistered).to.be.true;
            expect(clientData.reviewsGiven).to.equal(0);
        });

        it("Should prevent double registration for clients", async function () {
            const { freelancerReputation, client1 } = await loadFixture(deployContractFixture);

            // Register once
            await freelancerReputation.connect(client1).registerAsClient();

            // Try to register again
            await expect(
                freelancerReputation.connect(client1).registerAsClient()
            ).to.be.revertedWith("Already registered");
        });
    });

    describe("Review Submission", function () {
        it("Should allow clients to submit reviews", async function () {
            const { freelancerReputation, freelancer1, client1 } = await loadFixture(deployContractFixture);

            // Register freelancer and client
            await freelancerReputation.connect(freelancer1).registerAsFreelancer();
            await freelancerReputation.connect(client1).registerAsClient();

            // Submit a review
            const rating = 4;
            const comment = "Great work!";

            await expect(freelancerReputation.connect(client1).leaveReview(freelancer1.address, rating, comment))
                .to.emit(freelancerReputation, "ReviewSubmitted")
                .withArgs(client1.address, freelancer1.address, rating, comment, await time.latest() + 1);

            // Check freelancer stats
            const freelancerData = await freelancerReputation.freelancers(freelancer1.address);
            expect(freelancerData.totalRating).to.equal(rating);
            expect(freelancerData.reviewCount).to.equal(1);

            // Check client stats
            const clientData = await freelancerReputation.clients(client1.address);
            expect(clientData.reviewsGiven).to.equal(1);

            // Check review details
            const review = await freelancerReputation.reviews(freelancer1.address, client1.address);
            expect(review.rating).to.equal(rating);
            expect(review.comment).to.equal(comment);
        });

        it("Should prevent reviews from unregistered clients", async function () {
            const { freelancerReputation, freelancer1, unauthorized } = await loadFixture(deployContractFixture);

            // Register freelancer
            await freelancerReputation.connect(freelancer1).registerAsFreelancer();

            // Attempt to submit a review as unauthorized user
            await expect(
                freelancerReputation.connect(unauthorized).leaveReview(freelancer1.address, 5, "Excellent!")
            ).to.be.revertedWith("Client not registered");
        });

        it("Should prevent reviews for unregistered freelancers", async function () {
            const { freelancerReputation, client1, unauthorized } = await loadFixture(deployContractFixture);

            // Register client
            await freelancerReputation.connect(client1).registerAsClient();

            // Attempt to review an unregistered freelancer
            await expect(
                freelancerReputation.connect(client1).leaveReview(unauthorized.address, 5, "Great!")
            ).to.be.revertedWith("Freelancer not registered");
        });

        it("Should prevent duplicate reviews from the same client", async function () {
            const { freelancerReputation, freelancer1, client1 } = await loadFixture(deployContractFixture);

            // Register freelancer and client
            await freelancerReputation.connect(freelancer1).registerAsFreelancer();
            await freelancerReputation.connect(client1).registerAsClient();

            // Submit first review
            await freelancerReputation.connect(client1).leaveReview(freelancer1.address, 4, "Good work!");

            // Attempt to submit second review
            await expect(
                freelancerReputation.connect(client1).leaveReview(freelancer1.address, 5, "Excellent!")
            ).to.be.revertedWith("Already reviewed this freelancer");
        });

        it("Should enforce valid rating range (1-5)", async function () {
            const { freelancerReputation, freelancer1, client1 } = await loadFixture(deployContractFixture);

            // Register freelancer and client
            await freelancerReputation.connect(freelancer1).registerAsFreelancer();
            await freelancerReputation.connect(client1).registerAsClient();

            // Try to submit invalid ratings
            await expect(
                freelancerReputation.connect(client1).leaveReview(freelancer1.address, 0, "Invalid!")
            ).to.be.revertedWith("Rating must be between 1-5");

            await expect(
                freelancerReputation.connect(client1).leaveReview(freelancer1.address, 6, "Invalid!")
            ).to.be.revertedWith("Rating must be between 1-5");
        });

        it("Should limit comment length for gas efficiency", async function () {
            const { freelancerReputation, freelancer1, client1 } = await loadFixture(deployContractFixture);

            // Register freelancer and client
            await freelancerReputation.connect(freelancer1).registerAsFreelancer();
            await freelancerReputation.connect(client1).registerAsClient();

            // Create a comment that exceeds the limit (280 chars)
            const longComment = "a".repeat(281);

            // Try to submit with long comment
            await expect(
                freelancerReputation.connect(client1).leaveReview(freelancer1.address, 5, longComment)
            ).to.be.revertedWith("Comment too long");
        });
    });

    describe("Reputation Calculation", function () {
        it("Should correctly calculate average reputation", async function () {
            const { freelancerReputation, freelancer1, client1, client2, client3 } = await loadFixture(deployContractFixture);

            // Register freelancer and clients
            await freelancerReputation.connect(freelancer1).registerAsFreelancer();
            await freelancerReputation.connect(client1).registerAsClient();
            await freelancerReputation.connect(client2).registerAsClient();
            await freelancerReputation.connect(client3).registerAsClient();

            // Submit reviews
            await freelancerReputation.connect(client1).leaveReview(freelancer1.address, 4, "Good");
            await freelancerReputation.connect(client2).leaveReview(freelancer1.address, 5, "Excellent");
            await freelancerReputation.connect(client3).leaveReview(freelancer1.address, 3, "Average");

            // Check reputation calculation
            const [avgRating, reviewCount] = await freelancerReputation.getFreelancerReputation(freelancer1.address);

            // Expected average: (4 + 5 + 3) / 3 = 4 * 100 = 400 (scaled by 100)
            expect(avgRating).to.equal(400);
            expect(reviewCount).to.equal(3);
        });

        it("Should handle zero reviews case", async function () {
            const { freelancerReputation, freelancer1 } = await loadFixture(deployContractFixture);

            // Register freelancer without any reviews
            await freelancerReputation.connect(freelancer1).registerAsFreelancer();

            // Check reputation calculation
            const [avgRating, reviewCount] = await freelancerReputation.getFreelancerReputation(freelancer1.address);

            expect(avgRating).to.equal(0);
            expect(reviewCount).to.equal(0);
        });

        it("Should handle unregistered freelancer reputation query", async function () {
            const { freelancerReputation, unauthorized } = await loadFixture(deployContractFixture);

            // Check reputation for unregistered address
            const [avgRating, reviewCount] = await freelancerReputation.getFreelancerReputation(unauthorized.address);

            expect(avgRating).to.equal(0);
            expect(reviewCount).to.equal(0);
        });
    });

    describe("Client Review Status", function () {
        it("Should correctly track if a client has reviewed a freelancer", async function () {
            const { freelancerReputation, freelancer1, client1, client2 } = await loadFixture(deployContractFixture);

            // Register users
            await freelancerReputation.connect(freelancer1).registerAsFreelancer();
            await freelancerReputation.connect(client1).registerAsClient();
            await freelancerReputation.connect(client2).registerAsClient();

            // Submit review from client1 only
            await freelancerReputation.connect(client1).leaveReview(freelancer1.address, 5, "Great!");

            // Check client review status
            expect(await freelancerReputation.hasClientReviewedFreelancer(client1.address, freelancer1.address)).to.be.true;
            expect(await freelancerReputation.hasClientReviewedFreelancer(client2.address, freelancer1.address)).to.be.false;
        });
    });
});