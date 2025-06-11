import React, { useState } from 'react';
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

    const [searchTerm, setSearchTerm] = useState('');

    const filteredItems = items.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

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

                    {/* Search Bar */}
                    <div className="mt-6">
                        <input
                            type="text"
                            placeholder="Search marketplace by name or description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                        />
                    </div>

                    {/* Marketplace Items */}
                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredItems.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden"
                            >
                                <div className="relative w-full h-48 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="object-contain w-full h-full"
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

                    {/* No Results Message */}
                    {filteredItems.length === 0 && (
                        <div className="mt-8 text-center">
                            <p className="text-gray-600 dark:text-gray-300">
                                No marketplace items found matching your search criteria.
                            </p>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}