import React from 'react';
import { Dialog, Transition } from '@headlessui/react';

const ConnectWalletModal = ({ isOpen, onClose, onConnect }) => {
    const handleConnect = async (walletType) => {
        try {
            console.log(`Attempting to connect with ${walletType}`);
            
            // Call the onConnect function passed from parent
            if (onConnect) {
                await onConnect(walletType);
            }
            
            // Close the modal after successful connection
            onClose();
        } catch (error) {
            console.error(`Error connecting with ${walletType}:`, error);
            // Keep modal open on error so user can try again
        }
    };

    return (
        <Transition show={isOpen} as={React.Fragment}>
            <Dialog
                as="div"
                className="fixed inset-0 z-50 overflow-y-auto"
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
                        <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50" />
                    </Transition.Child>

                    {/* Centering trick */}
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
                            {/* Close Button */}
                            <div className="absolute top-0 right-0 pt-4 pr-4">
                                <button
                                    type="button"
                                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                                    onClick={onClose}
                                >
                                    <span className="sr-only">Close</span>
                                    <svg
                                        className="h-6 w-6"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>

                            {/* Modal Title */}
                            <Dialog.Title
                                as="h3"
                                className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                            >
                                Connect your wallet
                            </Dialog.Title>

                            {/* Modal Content */}
                            <div className="mt-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Connect with one of the available wallet providers or create a new wallet.
                                </p>

                                {/* Wallet Options */}
                                <div className="mt-6 space-y-4">
                                    {/* MetaMask */}
                                    <button
                                        onClick={() => handleConnect('metamask')}
                                        className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0">
                                                <div className="w-8 h-8 relative">
                                                    {/* MetaMask Logo */}
                                                    <svg
                                                        viewBox="0 0 40 40"
                                                        fill="none"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                    >
                                                        <path
                                                            d="M34.5329 3.5L22.3929 14.12L24.9529 7.8L34.5329 3.5Z"
                                                            fill="#E17726"
                                                            stroke="#E17726"
                                                            strokeWidth="0.25"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                        <path
                                                            d="M5.45996 3.5L17.4933 14.2133L15.0466 7.8L5.45996 3.5Z"
                                                            fill="#E27625"
                                                            stroke="#E27625"
                                                            strokeWidth="0.25"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="ml-3 text-left">
                                                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                                    MetaMask
                                                </h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Connect using browser extension
                                                </p>
                                            </div>
                                        </div>
                                    </button>

                                    {/* WalletConnect */}
                                    <button
                                        onClick={() => handleConnect('walletconnect')}
                                        className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0">
                                                <div className="w-8 h-8 relative">
                                                    {/* WalletConnect Logo */}
                                                    <svg
                                                        viewBox="0 0 40 40"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                    >
                                                        <path
                                                            d="M8.19327 13.2373C15.3836 6.17575 27.0156 6.17575 34.2059 13.2373L34.8317 13.853C35.0687 14.0859 35.0687 14.4676 34.8317 14.7005L32.2655 17.2269C32.147 17.3434 31.9563 17.3434 31.8379 17.2269L30.9612 16.3651C25.932 11.4153 16.467 11.4153 11.438 16.3651L10.4861 17.3023C10.3677 17.4187 10.177 17.4187 10.0586 17.3023L7.49239 14.7759C7.25535 14.5429 7.25535 14.1612 7.49239 13.9283L8.19327 13.2373Z"
                                                            fill="#3B99FC"
                                                        />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="ml-3 text-left">
                                                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                                    WalletConnect
                                                </h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Connect using mobile wallet
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
};

export default ConnectWalletModal;