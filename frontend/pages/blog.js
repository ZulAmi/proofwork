import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Blog({ onConnectWalletClick }) {
    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col">
            <Navbar onConnectWalletClick={onConnectWalletClick} />
            <main className="flex-grow max-w-3xl mx-auto px-4 py-12">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Blog</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-8">
                    Stay tuned for updates, news, and insights from the ProofWork team.
                </p>
                <div className="text-gray-500 dark:text-gray-400">No blog posts yet.</div>
            </main>
            <Footer />
        </div>
    );
}