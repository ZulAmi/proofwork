import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Clients({ onConnectWalletClick }) {
    const companies = [
        {
            id: 1,
            name: 'TechCorp Solutions',
            logo: '/images/techcorp-logo.jpg',
            industry: 'Software Development',
            description: 'Innovative software solutions for businesses worldwide.',
            trustScore: 92,
            reviewCount: 15,
        },
        {
            id: 2,
            name: 'Designify Studio',
            logo: '/images/designify-logo.jpg',
            industry: 'Graphic Design',
            description: 'Creative design agency specializing in branding and UI/UX.',
            trustScore: 88,
            reviewCount: 20,
        },
        {
            id: 3,
            name: 'Blockchain Innovators',
            logo: '/images/blockchain-logo.jpg',
            industry: 'Blockchain Technology',
            description: 'Leading blockchain company focused on decentralized solutions.',
            trustScore: 95,
            reviewCount: 25,
        },
    ];

    const [searchTerm, setSearchTerm] = useState('');

    const filteredCompanies = companies.filter((company) =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.industry.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col">
            <Navbar onConnectWalletClick={onConnectWalletClick} />
            <main className="flex-grow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Our Clients
                    </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">
                        Explore trusted companies working with verified freelancers.
                    </p>

                    {/* Search Bar */}
                    <div className="mt-6">
                        <input
                            type="text"
                            placeholder="Search clients by name or industry..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                        />
                    </div>

                    {/* Company Cards */}
                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCompanies.map((company) => (
                            <div
                                key={company.id}
                                className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden"
                            >
                                <div className="relative w-full h-48 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                                    <img
                                        src={company.logo}
                                        alt={company.name}
                                        className="object-contain w-32 h-32"
                                    />
                                </div>
                                <div className="p-4">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                        {company.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                                        {company.description}
                                    </p>
                                    <div className="mt-4">
                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                            Industry:
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                            {company.industry}
                                        </p>
                                    </div>
                                    <div className="mt-4 flex items-center">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            Trust Score:
                                        </div>
                                        <div className="ml-2 text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                            {company.trustScore}
                                        </div>
                                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                            ({company.reviewCount} reviews)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* No Results Message */}
                    {filteredCompanies.length === 0 && (
                        <div className="mt-8 text-center">
                            <p className="text-gray-600 dark:text-gray-300">
                                No clients found matching your search criteria.
                            </p>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}