import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useWeb3 } from '../web3Provider';
import Link from 'next/link';

export default function JobMarketplace() {
    const { isConnected, address } = useWeb3();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Mock fetch jobs (replace with contract call)
    useEffect(() => {
        // TODO: Replace with actual contract call
        setTimeout(() => {
            setJobs([
                {
                    id: 1,
                    title: "Build a Web3 Portfolio",
                    description: "Looking for a React/Web3 developer to build a personal portfolio dApp.",
                    budget: 500,
                    deadline: "2025-06-30",
                    status: "Open",
                },
                {
                    id: 2,
                    title: "Smart Contract Audit",
                    description: "Need an experienced Solidity auditor for a DeFi protocol.",
                    budget: 1200,
                    deadline: "2025-07-10",
                    status: "Open",
                },
            ]);
            setLoading(false);
        }, 800);
    }, []);

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
            <Navbar />
            <main className="flex-grow">
                <div className="relative bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-700 overflow-hidden">
                    <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-4xl font-extrabold text-white sm:text-5xl lg:text-6xl mb-4">
                            Job Marketplace
                        </h1>
                        <p className="max-w-2xl mx-auto text-lg text-indigo-100 mb-8">
                            Discover blockchain jobs, apply as a freelancer, or post your own project. All payments and reputations are secured by smart contracts.
                        </p>
                        <Link href="/post-job">
                            <a className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-lg text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-indigo-700 transition-colors">
                                Post a Job
                            </a>
                        </Link>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Open Jobs</h2>
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="text-gray-500 dark:text-gray-400 text-center py-12">
                            No jobs available at the moment.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {jobs.map((job) => (
                                <div key={job.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-xl font-semibold text-indigo-700 dark:text-indigo-400 mb-2">{job.title}</h3>
                                        <p className="text-gray-700 dark:text-gray-300 mb-4">{job.description}</p>
                                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                                            <span className="mr-4">Budget: <span className="font-medium text-indigo-600 dark:text-indigo-300">${job.budget}</span></span>
                                            <span>Deadline: {job.deadline}</span>
                                        </div>
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${job.status === "Open" ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}`}>
                                            {job.status}
                                        </span>
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <button
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                                            disabled={!isConnected}
                                        >
                                            {isConnected ? "Apply" : "Connect Wallet to Apply"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}