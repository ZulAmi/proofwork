import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useWeb3 } from '../web3Provider';
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';
import { Transition } from '@headlessui/react';

export default function Navbar({ onConnectWalletClick }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const {
        isConnected,
        address,
        disconnectWallet,
        ensName,
        ensAvatar,
        displayName,
        network
    } = useWeb3();

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

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex md:items-center md:space-x-8">
                        <div className="flex space-x-4">
                            <Link href="/" className="group inline-flex items-center px-2 py-1 text-sm font-medium text-gray-900 dark:text-white relative">
                                <span>Freelancers</span>
                                <span className="absolute bottom-0 left-0 h-0.5 w-full transform scale-x-100 bg-indigo-600 transition-transform"></span>
                            </Link>
                            <Link href="/clients" className="group inline-flex items-center px-2 py-1 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white relative">
                                <span>Clients</span>
                                <span className="absolute bottom-0 left-0 h-0.5 w-full transform scale-x-0 bg-indigo-600 transition-transform group-hover:scale-x-100"></span>
                            </Link>
                            <Link href="/how-it-works" className="group inline-flex items-center px-2 py-1 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white relative">
                                <span>How It Works</span>
                                <span className="absolute bottom-0 left-0 h-0.5 w-full transform scale-x-0 bg-indigo-600 transition-transform group-hover:scale-x-100"></span>
                            </Link>
                            <Link href="/job-marketplace" className="group inline-flex items-center px-2 py-1 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white relative">
                                <span>Job Marketplace</span>
                                <span className="absolute bottom-0 left-0 h-0.5 w-full transform scale-x-0 bg-indigo-600 transition-transform group-hover:scale-x-100"></span>
                            </Link>
                        </div>

                        <div className="flex items-center space-x-3">
                            {isConnected ? (
                                <div className="flex items-center space-x-3">
                                    {network && (
                                        <div className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                            {network.charAt(0).toUpperCase() + network.slice(1)}
                                        </div>
                                    )}

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
                                    <svg className="mr-2 -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                    </svg>
                                    Connect Wallet
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                            aria-expanded="false"
                        >
                            <span className="sr-only">Open main menu</span>
                            {isMenuOpen ? (
                                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            <Transition
                show={isMenuOpen}
                enter="transition duration-200 ease-out"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="transition duration-150 ease-in"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
            >
                <div className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <Link href="/" className="block px-3 py-2 rounded-md text-base font-medium text-white bg-indigo-600">
                            Freelancers
                        </Link>
                        <Link href="/clients" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                            Clients
                        </Link>
                        <Link href="/how-it-works" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                            How It Works
                        </Link>
                    </div>
                    <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
                        {isConnected ? (
                            <div>
                                <div className="flex items-center px-4 py-2">
                                    <div className="flex-shrink-0">
                                        {ensAvatar ? (
                                            <Image
                                                src={ensAvatar}
                                                alt="ENS Avatar"
                                                width={36}
                                                height={36}
                                                className="rounded-full border-2 border-white dark:border-gray-700"
                                            />
                                        ) : (
                                            <Jazzicon diameter={36} seed={jsNumberForAddress(address)} />
                                        )}
                                    </div>
                                    <div className="ml-3">
                                        <div className="text-base font-medium text-gray-800 dark:text-white">{displayName}</div>
                                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                                            {address}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3 px-2 space-y-1">
                                    <button
                                        onClick={disconnectWallet}
                                        className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    >
                                        Disconnect Wallet
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="px-2">
                                <button
                                    onClick={onConnectWalletClick}
                                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Connect Wallet
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </Transition>
        </nav>
    );
}