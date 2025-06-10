import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useWeb3 } from '../web3Provider';
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';
import { useRouter } from 'next/router';

export default function Navbar({ onConnectWalletClick }) {
    const { isConnected, address, disconnectWallet, ensName, ensAvatar, displayName, network } = useWeb3();
    const router = useRouter();

    const isActive = (path) => router.pathname === path;

    return (
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
                            {/* Main Pages */}
                            <Link href="/" className={`group inline-flex items-center px-2 py-1 text-sm font-medium relative ${isActive('/') ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}`}>
                                Home
                            </Link>

                            <Link href="/freelancers" className={`group inline-flex items-center px-2 py-1 text-sm font-medium relative ${isActive('/freelancers') ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}`}>
                                Freelancers
                            </Link>

                            <Link href="/clients" className={`group inline-flex items-center px-2 py-1 text-sm font-medium relative ${isActive('/clients') ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}`}>
                                Clients
                            </Link>

                            <Link href="/marketplace" className={`group inline-flex items-center px-2 py-1 text-sm font-medium relative ${isActive('/marketplace') ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}`}>
                                Marketplace
                            </Link>

                            {/* Authentication Pages - Show only if not connected */}
                            {!isConnected && (
                                <>
                                    <Link href="/auth/signin" className={`group inline-flex items-center px-2 py-1 text-sm font-medium relative ${isActive('/auth/signin') ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}`}>
                                        Sign In
                                    </Link>

                                    <Link href="/auth/signup" className={`group inline-flex items-center px-2 py-1 text-sm font-medium relative ${isActive('/auth/signup') ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}`}>
                                        Sign Up
                                    </Link>
                                </>
                            )}

                            {/* Profile/Dashboard - Show only if connected */}
                            {isConnected && (
                                <>
                                    <Link href="/dashboard" className={`group inline-flex items-center px-2 py-1 text-sm font-medium relative ${isActive('/dashboard') ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}`}>
                                        Dashboard
                                    </Link>

                                    <Link href="/profile" className={`group inline-flex items-center px-2 py-1 text-sm font-medium relative ${isActive('/profile') ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}`}>
                                        Profile
                                    </Link>
                                </>
                            )}
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

                    {/* Mobile menu button */}
                    <div className="md:hidden flex items-center">
                        <button
                            type="button"
                            className="bg-white dark:bg-gray-800 rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                            aria-expanded="false"
                        >
                            <span className="sr-only">Open main menu</span>
                            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}