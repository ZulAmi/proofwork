import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useWeb3 } from '../web3Provider';
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';
import { Transition } from '@headlessui/react';
import { useRouter } from 'next/router';
import ConnectWalletModal from './ConnectWalletModal';

export default function Navbar({ onConnectWalletClick }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false); // Manage wallet modal state
    const { isConnected, address, disconnectWallet, ensName, ensAvatar, displayName, network } = useWeb3();
    const router = useRouter();

    const isActive = (path) => router.pathname === path;

    const handleConnectWallet = () => {
        setIsWalletModalOpen(true); // Open the wallet modal
        onConnectWalletClick(); // Trigger wallet connection logic
    };

    const closeWalletModal = () => {
        setIsWalletModalOpen(false); // Close the wallet modal
    };

    return (
        <>
            <nav className="sticky top-0 z-50 bg-white shadow-md dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/" className="flex items-center gap-2">
                                <div className="relative w-10 h-10 overflow-hidden rounded-lg shadow-sm">
                                    <Image
                                        src="/logo.png"
                                        alt="ProofWork Logo"
                                        width={40}
                                        height={40}
                                        className="object-cover"
                                        priority
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xl font-bold text-gray-900 dark:text-white leading-none">
                                        ProofWork
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 leading-none">
                                        Verified Freelancer Marketplace
                                    </span>
                                </div>
                            </Link>
                        </div>

                        <div className="hidden md:flex md:items-center md:space-x-8">
                            <div className="flex space-x-4">
                                <Link href="/" className={`group inline-flex items-center px-2 py-1 text-sm font-medium relative ${isActive('/') ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}`}>
                                    Freelancers
                                </Link>
                                <Link href="/clients" className={`group inline-flex items-center px-2 py-1 text-sm font-medium relative ${isActive('/clients') ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}`}>
                                    Clients
                                </Link>
                            </div>

                            <div className="flex items-center space-x-3">
                                {isConnected ? (
                                    <div className="flex items-center space-x-3">
                                        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full py-1 px-3">
                                            <div className="flex-shrink-0 mr-2">
                                                {ensAvatar ? (
                                                    <Image
                                                        src={ensAvatar}
                                                        alt="ENS Avatar"
                                                        width={28}
                                                        height={28}
                                                        className="rounded-full border-2 border-white dark:border-gray-700 shadow-sm"
                                                    />
                                                ) : (
                                                    <Jazzicon diameter={28} seed={jsNumberForAddress(address)} />
                                                )}
                                            </div>
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[80px] truncate">
                                                {displayName}
                                            </span>
                                        </div>

                                        <button
                                            onClick={disconnectWallet}
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                                        >
                                            Disconnect
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={onConnectWalletClick}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                                    >
                                        Connect Wallet
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        </>
    );
}