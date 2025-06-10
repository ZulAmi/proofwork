import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Marketplace({ onConnectWalletClick }) {
    const items = [
        {
            id: 1,
            name: 'Custom Website Design',
            image: '/images/website-design.jpg',
            price: '0.5 ETH',
            description: 'Get a professionally designed website tailored to your needs.',
        },
        {
            id: 2,
            name: 'Logo Design Package',
            image: '/images/logo-design.jpg',
            price: '0.2 ETH',
            description: 'Unique and creative logo designs for your brand.',
        },
        {
            id: 3,
            name: 'Smart Contract Development',
            image: '/images/smart-contract.jpg',
            price: '1 ETH',
            description: 'Develop secure and efficient smart contracts for your blockchain projects.',
        },
    ];

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col">
            <Navbar onConnectWalletClick={onConnectWalletClick} />
            <main className="flex-grow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Marketplace
                    </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">
                        Explore services and products offered by verified freelancers.
                    </p>

                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden"
                            >
                                <div className="relative w-full h-48">
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="object-cover w-full h-full"
                                    />
                                </div>
                                <div className="p-4">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                        {item.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                                        {item.description}
                                    </p>
                                    <div className="mt-4 text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                        {item.price}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}