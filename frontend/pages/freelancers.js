import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Freelancers({ onConnectWalletClick }) {
    const freelancers = [
        {
            id: 1,
            name: 'John Doe',
            profileImage: '/images/john-doe.jpg',
            skills: ['Web Development', 'React', 'Node.js'],
            trustScore: 85,
            reviewCount: 12,
            bio: 'Experienced web developer specializing in modern JavaScript frameworks.',
        },
        {
            id: 2,
            name: 'Jane Smith',
            profileImage: '/images/jane-smith.jpg',
            skills: ['Graphic Design', 'UI/UX', 'Adobe Photoshop'],
            trustScore: 90,
            reviewCount: 18,
            bio: 'Creative graphic designer with a passion for crafting stunning visuals.',
        },
        {
            id: 3,
            name: 'Alice Johnson',
            profileImage: '/images/alice-johnson.jpg',
            skills: ['Blockchain Development', 'Solidity', 'Ethereum'],
            trustScore: 95,
            reviewCount: 25,
            bio: 'Blockchain developer with expertise in smart contracts and decentralized applications.',
        },
    ];

    const [searchTerm, setSearchTerm] = useState('');

    const filteredFreelancers = freelancers.filter((freelancer) =>
        freelancer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        freelancer.skills.some((skill) =>
            skill.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col">
            <Navbar onConnectWalletClick={onConnectWalletClick} />
            <main className="flex-grow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Find Freelancers
                    </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">
                        Browse verified freelancers with blockchain-secured reviews.
                    </p>

                    {/* Search Bar */}
                    <div className="mt-6">
                        <input
                            type="text"
                            placeholder="Search freelancers by name or skills..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                        />
                    </div>

                    {/* Freelancer Cards */}
                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredFreelancers.map((freelancer) => (
                            <div
                                key={freelancer.id}
                                className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden"
                            >
                                <div className="relative w-full h-48">
                                    <img
                                        src={freelancer.profileImage}
                                        alt={freelancer.name}
                                        className="object-cover w-full h-full"
                                    />
                                </div>
                                <div className="p-4">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                        {freelancer.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                                        {freelancer.bio}
                                    </p>
                                    <div className="mt-4">
                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                            Skills:
                                        </h4>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {freelancer.skills.map((skill) => (
                                                <span
                                                    key={skill}
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            Trust Score:
                                        </div>
                                        <div className="ml-2 text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                            {freelancer.trustScore}
                                        </div>
                                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                            ({freelancer.reviewCount} reviews)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* No Results Message */}
                    {filteredFreelancers.length === 0 && (
                        <div className="mt-8 text-center">
                            <p className="text-gray-600 dark:text-gray-300">
                                No freelancers found matching your search criteria.
                            </p>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}