import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function FAQ({ onConnectWalletClick }) {
    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col">
            <Navbar onConnectWalletClick={onConnectWalletClick} />
            <main className="flex-grow max-w-3xl mx-auto px-4 py-12">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Frequently Asked Questions</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-8">This page will answer the most common questions about ProofWork.</p>
                <div className="space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">How does ProofWork verify freelancers?</h2>
                        <p className="text-gray-600 dark:text-gray-300">All reviews and reputation data are stored on the blockchain for transparency and security.</p>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">How do I contact support?</h2>
                        <p className="text-gray-600 dark:text-gray-300">You can reach out via the contact page or email us at support@proofwork.com.</p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}