import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function About({ onConnectWalletClick }) {
    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col">
            <Navbar onConnectWalletClick={onConnectWalletClick} />
            <main className="flex-grow max-w-3xl mx-auto px-4 py-12">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">About ProofWork</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-8">
                    ProofWork is a decentralized platform for freelancers and clients to build trust through blockchain-verified reputations.
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                    Our mission is to bring transparency and fairness to the freelance marketplace by leveraging blockchain technology.
                </p>
            </main>
            <Footer />
        </div>
    );
}