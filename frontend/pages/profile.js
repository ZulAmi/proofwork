import React from 'react';
import Navbar from '../components/Navbar';
import { useWeb3 } from '../web3Provider';

export default function Profile({ onConnectWalletClick }) {
    const { isConnected, address, displayName } = useWeb3();

    return (
        <div>
            <Navbar onConnectWalletClick={onConnectWalletClick} />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Profile
                </h1>
                {isConnected && (
                    <div className="mt-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            Name: {displayName}
                        </p>
                        <p className="text-gray-600 dark:text-gray-300">
                            Address: {address}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}