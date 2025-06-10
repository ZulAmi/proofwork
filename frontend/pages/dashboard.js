import React from 'react';
import Navbar from '../components/Navbar';
import { useWeb3 } from '../web3Provider';

export default function Dashboard({ onConnectWalletClick }) {
    const { isConnected, address } = useWeb3();

    if (!isConnected) {
        return (
            <div>
                <Navbar onConnectWalletClick={onConnectWalletClick} />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Connect Your Wallet
                        </h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-300">
                            Please connect your wallet to access your dashboard.
                        </p>
                        <button
                            onClick={onConnectWalletClick}
                            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            Connect Wallet
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Navbar onConnectWalletClick={onConnectWalletClick} />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Dashboard
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                    Welcome back! Address: {address?.substring(0, 6)}...{address?.substring(38)}
                </p>
            </div>
        </div>
    );
}