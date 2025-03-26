import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import Image from 'next/image';

const ConnectWalletModal = ({ isOpen, onClose, onConnect }) => {
    const handleConnect = async (walletType) => {
        try {
            await onConnect();
            onClose();
        } catch (error) {
            console.error(`Error connecting with ${walletType}:`, error);
        }
    };

    return (
        <Transition show={isOpen} as={React.Fragment}>
            <Dialog
                as="div"
                className="fixed inset-0 z-10 overflow-y-auto"
                onClose={onClose}
            >
                <div className="min-h-screen px-4 text-center">
                    <Transition.Child
                        as={React.Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
                    </Transition.Child>

                    {/* This element is to trick the browser into centering the modal contents. */}
                    <span
                        className="inline-block h-screen align-middle"
                        aria-hidden="true"
                    >
                        &#8203;
                    </span>

                    <Transition.Child
                        as={React.Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl">
                            <div className="absolute top-0 right-0 pt-4 pr-4">
                                <button
                                    type="button"
                                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                                    onClick={onClose}
                                >
                                    <span className="sr-only">Close</span>
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                                Connect your wallet
                            </Dialog.Title>

                            <div className="mt-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Connect with one of the available wallet providers or create a new wallet.
                                </p>

                                <div className="mt-6 space-y-4">
                                    <button
                                        onClick={() => handleConnect('metamask')}
                                        className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0">
                                                <div className="w-8 h-8 relative">
                                                    {/* Placeholder for MetaMask logo */}
                                                    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M34.5329 3.5L22.3929 14.12L24.9529 7.8L34.5329 3.5Z" fill="#E17726" stroke="#E17726" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d="M5.45996 3.5L17.4933 14.2133L15.0466 7.8L5.45996 3.5Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d="M29.8534 27.24L26.28 32.8666L33.7067 35.0266L35.8667 27.3733L29.8534 27.24Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d="M4.14667 27.3733L6.29334 35.0266L13.7067 32.8666L10.1467 27.24L4.14667 27.3733Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d="M13.24 17.84L11.0267 21.1733L18.3733 21.5333L18.1067 13.6133L13.24 17.84Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d="M26.7466 17.84L21.8 13.52L21.6133 21.5333L28.96 21.1733L26.7466 17.84Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d="M13.7067 32.8666L17.88 30.6133L14.2667 27.4266L13.7067 32.8666Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d="M22.1067 30.6133L26.28 32.8666L25.72 27.4266L22.1067 30.6133Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="ml-3 text-left">
                                                <h4 className="text-sm font-medium text-gray-900 dark:text-white">MetaMask</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Connect using browser extension</p>
                                            </div>
                                        </div>
                                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </button>

                                    <button
                                        onClick={() => handleConnect('walletconnect')}
                                        className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0">
                                                <div className="w-8 h-8 relative">
                                                    {/* Placeholder for WalletConnect logo */}
                                                    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M8.19327 13.2373C15.3836 6.17575 27.0156 6.17575 34.2059 13.2373L34.8317 13.853C35.0687 14.0859 35.0687 14.4676 34.8317 14.7005L32.2655 17.2269C32.147 17.3434 31.9563 17.3434 31.8379 17.2269L30.9612 16.3651C25.932 11.4153 16.467 11.4153 11.438 16.3651L10.4861 17.3023C10.3677 17.4187 10.177 17.4187 10.0586 17.3023L7.49239 14.7759C7.25535 14.5429 7.25535 14.1612 7.49239 13.9283L8.19327 13.2373ZM39.1287 18.0908L41.3991 20.324C41.6361 20.5569 41.6361 20.9387 41.3991 21.1716L30.1093 32.2488C29.8722 32.4817 29.4855 32.4817 29.2485 32.2488L21.366 24.5078C21.3068 24.4496 21.2124 24.4496 21.1532 24.5078L13.2709 32.2488C13.0338 32.4817 12.6471 32.4817 12.4101 32.2488C12.4101 32.2488 12.4101 32.2488 12.4101 32.2488L1.11909 21.1716C0.882052 20.9387 0.882052 20.5569 1.11909 20.324L3.38958 18.0908C3.62664 17.8579 4.0133 17.8579 4.25036 18.0908L12.1401 25.8318C12.1992 25.89 12.2937 25.89 12.3528 25.8318L20.2351 18.0908C20.4721 17.8579 20.8588 17.8579 21.0958 18.0908C21.0958 18.0908 21.0958 18.0908 21.0958 18.0908L28.9782 25.8318C29.0373 25.89 29.1318 25.89 29.1909 25.8318L37.0803 18.0908C37.3174 17.8579 37.704 17.8579 37.9411 18.0908L39.1287 18.0908Z" fill="#3B99FC" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="ml-3 text-left">
                                                <h4 className="text-sm font-medium text-gray-900 dark:text-white">WalletConnect</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Connect using mobile wallet</p>
                                            </div>
                                        </div>
                                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </button>

                                    <button
                                        onClick={() => handleConnect('coinbase')}
                                        className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0">
                                                <div className="w-8 h-8 relative">
                                                    {/* Placeholder for Coinbase Wallet logo */}
                                                    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <rect width="40" height="40" rx="20" fill="#0052FF" />
                                                        <path d="M20 34C27.732 34 34 27.732 34 20C34 12.268 27.732 6 20 6C12.268 6 6 12.268 6 20C6 27.732 12.268 34 20 34Z" fill="#0052FF" />
                                                        <path d="M20.0001 26.369C23.5151 26.369 26.3691 23.515 26.3691 20C26.3691 16.485 23.5151 13.631 20.0001 13.631C16.4851 13.631 13.6311 16.485 13.6311 20C13.6311 23.515 16.4851 26.369 20.0001 26.369Z" fill="white" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="ml-3 text-left">
                                                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Coinbase Wallet</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Connect using Coinbase</p>
                                            </div>
                                        </div>
                                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                    By connecting your wallet, you agree to our Terms of Service and our Privacy Policy.
                                </p>
                            </div>
                        </div>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
};

export default ConnectWalletModal;