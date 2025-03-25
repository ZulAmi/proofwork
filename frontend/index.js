import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useWeb3 } from '../web3Provider';
import { Transition } from '@headlessui/react';
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';
import { useQuery } from 'react-query';
import axios from 'axios';

// Lazy-loaded components
const FreelancerDetailModal = dynamic(() => import('../components/FreelancerDetailModal'), { ssr: false });
const ConnectWalletModal = dynamic(() => import('../components/ConnectWalletModal'), { ssr: false });
const FilterPanel = dynamic(() => import('../components/FilterPanel'));

// Constants
const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'wss://api.yourapp.com/ws';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.yourapp.com';

export default function Home() {
    const router = useRouter();
    const {
        isConnected,
        address,
        connectWallet,
        disconnectWallet,
        ensName,
        ensAvatar,
        displayName,
        network
    } = useWeb3();

    // State variables
    const [selectedFreelancer, setSelectedFreelancer] = useState(null);
    const [isConnectWalletModalOpen, setIsConnectWalletModalOpen] = useState(false);
    const [filters, setFilters] = useState({
        skills: [],
        minRating: 0,
        maxRating: 5,
        verified: false,
        sortBy: 'trustScore',
        sortDirection: 'desc'
    });

    // WebSocket connection for real-time updates
    const websocket = useRef(null);
    const [wsConnected, setWsConnected] = useState(false);

    // Fetch freelancer data
    const {
        data: freelancers = [],
        isLoading,
        isError,
        error,
        refetch
    } = useQuery(
        ['freelancers', filters],
        async () => {
            const params = new URLSearchParams();

            if (filters.skills.length > 0) {
                params.append('skills', filters.skills.join(','));
            }
            params.append('minRating', filters.minRating.toString());
            params.append('maxRating', filters.maxRating.toString());
            params.append('verified', filters.verified.toString());
            params.append('sortBy', filters.sortBy);
            params.append('sortDirection', filters.sortDirection);

            const response = await axios.get(`${API_BASE_URL}/freelancers`, { params });
            return response.data;
        },
        {
            staleTime: 60000,
            refetchOnWindowFocus: false
        }
    );

    // Filter and sort freelancers
    const filteredFreelancers = useMemo(() => {
        if (!freelancers || freelancers.length === 0) return [];

        return freelancers
            .filter(freelancer => {
                // Filter by skills if skills filter is active
                if (filters.skills.length > 0) {
                    const hasSkill = freelancer.skills.some(skill =>
                        filters.skills.includes(skill.toLowerCase())
                    );
                    if (!hasSkill) return false;
                }

                // Filter by rating
                if (freelancer.trustScore < filters.minRating * 20 ||
                    freelancer.trustScore > filters.maxRating * 20) {
                    return false;
                }

                // Filter by verification
                if (filters.verified && !freelancer.isVerified) {
                    return false;
                }

                return true;
            });
    }, [freelancers, filters]);

    // WebSocket setup for real-time updates
    useEffect(() => {
        // Initialize WebSocket connection
        websocket.current = new WebSocket(WEBSOCKET_URL);

        // Connection opened
        websocket.current.addEventListener('open', () => {
            setWsConnected(true);
            console.log('WebSocket connected');
            // Subscribe to freelancer updates
            websocket.current.send(JSON.stringify({
                type: 'subscribe',
                channel: 'freelancer-updates'
            }));
        });

        // Listen for messages
        websocket.current.addEventListener('message', (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'freelancer-update') {
                    // Refetch the data to get the latest rankings
                    refetch();
                }
            } catch (error) {
                console.error('WebSocket message error:', error);
            }
        });

        // Connection closed
        websocket.current.addEventListener('close', () => {
            setWsConnected(false);
            console.log('WebSocket disconnected');
        });

        // Clean up on unmount
        return () => {
            if (websocket.current) {
                websocket.current.close();
            }
        };
    }, [refetch]);

    // Handler for freelancer sign-up button
    const handleFreelancerSignUp = () => {
        if (!isConnected) {
            setIsConnectWalletModalOpen(true);
            return;
        }

        router.push('/register-freelancer');
    };

    // Get unique skills for filter
    const availableSkills = useMemo(() => {
        if (!freelancers || freelancers.length === 0) return [];

        const skillSet = new Set();
        freelancers.forEach(freelancer => {
            if (freelancer.skills && Array.isArray(freelancer.skills)) {
                freelancer.skills.forEach(skill => skillSet.add(skill.toLowerCase()));
            }
        });

        return Array.from(skillSet).sort();
    }, [freelancers]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Navigation */}
            <nav className="bg-white shadow-sm dark:bg-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <Link href="/">
                                <a className="flex-shrink-0 flex items-center">
                                    <Image
                                        src="/logo.png"
                                        alt="ProofWork Logo"
                                        width={40}
                                        height={40}
                                        className="rounded-full"
                                    />
                                    <span className="ml-3 text-xl font-bold text-gray-900 dark:text-white">
                                        ProofWork
                                    </span>
                                </a>
                            </Link>

                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                <Link href="/">
                                    <a className="border-indigo-500 text-gray-900 dark:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                        Freelancers
                                    </a>
                                </Link>
                                <Link href="/clients">
                                    <a className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                        Clients
                                    </a>
                                </Link>
                                <Link href="/how-it-works">
                                    <a className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                        How It Works
                                    </a>
                                </Link>
                            </div>
                        </div>

                        <div className="flex items-center">
                            {isConnected ? (
                                <div className="flex items-center space-x-4">
                                    <span className="hidden md:block text-sm text-gray-500 dark:text-gray-300">
                                        {network && `${network.charAt(0).toUpperCase() + network.slice(1)}`}
                                    </span>

                                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full py-0.5 pl-0.5 pr-2">
                                        {ensAvatar ? (
                                            <Image
                                                src={ensAvatar}
                                                alt="ENS Avatar"
                                                width={28}
                                                height={28}
                                                className="rounded-full"
                                            />
                                        ) : (
                                            <Jazzicon diameter={28} seed={jsNumberForAddress(address)} />
                                        )}
                                        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {displayName}
                                        </span>
                                    </div>

                                    <button
                                        onClick={disconnectWallet}
                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsConnectWalletModalOpen(true)}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Connect Wallet
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="relative bg-indigo-800">
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-indigo-700 mix-blend-multiply" aria-hidden="true"></div>
                </div>
                <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
                    <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                        Trustless Reputations for the Digital Economy
                    </h1>
                    <p className="mt-6 max-w-3xl text-xl text-indigo-100">
                        Find top freelancers with verified blockchain-secured reviews and transparent reputation scores.
                    </p>
                    <div className="mt-10 flex space-x-4">
                        <button
                            onClick={handleFreelancerSignUp}
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-indigo-700"
                        >
                            Sign Up as Freelancer
                        </button>
                        <Link href="/how-it-works">
                            <a className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 bg-opacity-20 hover:bg-opacity-30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-indigo-700">
                                Learn More
                            </a>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="py-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Top-Rated Freelancers</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Browse our verified freelancers with blockchain-secured reputation scores
                            </p>
                        </div>
                        <div className="mt-4 md:mt-0 flex items-center space-x-2">
                            <span className={`flex h-3 w-3 relative ${wsConnected ? 'text-green-500' : 'text-red-500'}`}>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-current"></span>
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {wsConnected ? 'Live updates active' : 'Connecting...'}
                            </span>
                        </div>
                    </div>

                    {/* Filters */}
                    <FilterPanel
                        availableSkills={availableSkills}
                        filters={filters}
                        setFilters={setFilters}
                    />

                    {/* Freelancer List */}
                    <div className="mt-6">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4 border-t-indigo-500"></div>
                            </div>
                        ) : isError ? (
                            <div className="text-center py-10 px-6 bg-red-50 dark:bg-red-900 rounded-lg">
                                <div className="text-lg font-medium text-red-800 dark:text-red-200">
                                    Error loading freelancers
                                </div>
                                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                                    {error?.message || 'Please try again later'}
                                </div>
                                <button
                                    onClick={() => refetch()}
                                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : filteredFreelancers.length === 0 ? (
                            <div className="text-center py-10 px-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                    No freelancers match your filters
                                </div>
                                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    Try adjusting your filter criteria
                                </div>
                                <button
                                    onClick={() => setFilters({
                                        skills: [],
                                        minRating: 0,
                                        maxRating: 5,
                                        verified: false,
                                        sortBy: 'trustScore',
                                        sortDirection: 'desc'
                                    })}
                                    className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {filteredFreelancers.map((freelancer) => (
                                    <div
                                        key={freelancer.address}
                                        className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                                        onClick={() => setSelectedFreelancer(freelancer)}
                                    >
                                        <div className="px-4 py-5 sm:p-6">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0">
                                                    {freelancer.profileImage ? (
                                                        <Image
                                                            src={freelancer.profileImage}
                                                            alt={freelancer.name}
                                                            width={60}
                                                            height={60}
                                                            className="rounded-full"
                                                        />
                                                    ) : (
                                                        <Jazzicon diameter={60} seed={jsNumberForAddress(freelancer.address)} />
                                                    )}
                                                </div>
                                                <div className="ml-5 flex-1">
                                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                                        {freelancer.name}
                                                        {freelancer.isVerified && (
                                                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                                Verified
                                                            </span>
                                                        )}
                                                    </h3>
                                                    <div className="mt-1 flex items-center">
                                                        {/* Rating stars */}
                                                        <div className="flex items-center">
                                                            {[...Array(5)].map((_, i) => (
                                                                <svg
                                                                    key={i}
                                                                    className={`h-5 w-5 ${i < Math.round(freelancer.trustScore / 20)
                                                                            ? 'text-yellow-400'
                                                                            : 'text-gray-300 dark:text-gray-600'
                                                                        }`}
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    viewBox="0 0 20 20"
                                                                    fill="currentColor"
                                                                >
                                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                                </svg>
                                                            ))}
                                                        </div>
                                                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                                            {(freelancer.trustScore / 20).toFixed(1)}
                                                        </span>
                                                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-500">
                                                            ({freelancer.reviewCount} reviews)
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {freelancer.skills.slice(0, 3).map((skill) => (
                                                        <span
                                                            key={skill}
                                                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                                                        >
                                                            {skill}
                                                        </span>
                                                    ))}
                                                    {freelancer.skills.length > 3 && (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                                            +{freelancer.skills.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-4 flex justify-between items-center">
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    Reputation Score
                                                </div>
                                                <div className="flex items-center">
                                                    <div className="text-lg font-medium text-indigo-600 dark:text-indigo-400">
                                                        {freelancer.trustScore}
                                                    </div>
                                                    <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">/100</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 text-right">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedFreelancer(freelancer);
                                                }}
                                                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                                            >
                                                View Profile →
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Call to Action */}
            <div className="bg-indigo-700 dark:bg-indigo-800">
                <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                        <span className="block">Showcase your skills.</span>
                        <span className="block">Build your reputation on the blockchain.</span>
                    </h2>
                    <p className="mt-4 text-lg leading-6 text-indigo-200">
                        Join thousands of freelancers building verifiable reputations that can't be faked or manipulated.
                    </p>
                    <button
                        onClick={handleFreelancerSignUp}
                        className="mt-8 w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-white hover:bg-indigo-50 sm:w-auto"
                    >
                        Sign Up as Freelancer
                    </button>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-white dark:bg-gray-800">
                <div className="max-w-7xl mx-auto py-12 px-4 overflow-hidden sm:px-6 lg:px-8">
                    <nav className="flex flex-wrap justify-center">
                        <div className="px-5 py-2">
                            <Link href="/about">
                                <a className="text-base text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                                    About
                                </a>
                            </Link>
                        </div>
                        <div className="px-5 py-2">
                            <Link href="/faq">
                                <a className="text-base text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                                    FAQ
                                </a>
                            </Link>
                        </div>
                        <div className="px-5 py-2">
                            <Link href="/contact">
                                <a className="text-base text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                                    Contact
                                </a>
                            </Link>
                        </div>
                        <div className="px-5 py-2">
                            <Link href="/terms">
                                <a className="text-base text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                                    Terms
                                </a>
                            </Link>
                        </div>
                        <div className="px-5 py-2">
                            <Link href="/privacy">
                                <a className="text-base text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                                    Privacy
                                </a>
                            </Link>
                        </div>
                    </nav>
                    <div className="mt-8 flex justify-center space-x-6">
                        <a href="#" className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                            <span className="sr-only">Twitter</span>
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                            </svg>
                        </a>
                        <a href="#" className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                            <span className="sr-only">GitHub</span>
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                <path
                                    fillRule="evenodd"
                                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </a>
                        <a href="#" className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                            <span className="sr-only">Discord</span>
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
                            </svg>
                        </a>
                    </div>
                    <p className="mt-8 text-center text-base text-gray-400">
                        &copy; 2025 ProofWork, Inc. All rights reserved.
                    </p>
                </div>
            </footer>

            {/* Modals */}
            {selectedFreelancer && (
                <FreelancerDetailModal
                    freelancer={selectedFreelancer}
                    isOpen={!!selectedFreelancer}
                    onClose={() => setSelectedFreelancer(null)}
                    isConnected={isConnected}
                />
            )}

            <ConnectWalletModal
                isOpen={isConnectWalletModalOpen}
                onClose={() => setIsConnectWalletModalOpen(false)}
                onConnect={connectWallet}
            />
        </div>
    );
}

// Sample FilterPanel component implementation
const FilterPanelImpl = ({ availableSkills, filters, setFilters }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="mt-6 bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="p-4 flex justify-between items-center cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}>
                <div className="font-medium">Filter Freelancers</div>
                <svg
                    className={`h-5 w-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </div>

            <Transition
                show={isExpanded}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Skills filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Skills
                            </label>
                            <select
                                multiple
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                value={filters.skills}
                                onChange={(e) => {
                                    const selectedSkills = Array.from(
                                        e.target.selectedOptions,
                                        (option) => option.value
                                    );
                                    setFilters({ ...filters, skills: selectedSkills });
                                }}
                            >
                                {availableSkills.map((skill) => (
                                    <option key={skill} value={skill}>
                                        {skill}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Hold Ctrl/Cmd to select multiple
                            </p>
                        </div>

                        {/* Rating range */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Rating Range
                            </label>
                            <div className="flex items-center mt-1 space-x-2">
                                <select
                                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                    value={filters.minRating}
                                    onChange={(e) => setFilters({ ...filters, minRating: Number(e.target.value) })}
                                >
                                    {[0, 1, 2, 3, 4].map((rating) => (
                                        <option key={rating} value={rating}>
                                            {rating} ★
                                        </option>
                                    ))}
                                </select>
                                <span className="text-gray-500">to</span>
                                <select
                                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                    value={filters.maxRating}
                                    onChange={(e) => setFilters({ ...filters, maxRating: Number(e.target.value) })}
                                >
                                    {[1, 2, 3, 4, 5].map((rating) => (
                                        <option key={rating} value={rating}>
                                            {rating} ★
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Verification filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Verification
                            </label>
                            <div className="mt-1">
                                <label className="inline-flex items-center">
                                    <input
                                        type="checkbox"
                                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded"
                                        checked={filters.verified}
                                        onChange={(e) => setFilters({ ...filters, verified: e.target.checked })}
                                    />
                                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                        Only verified freelancers
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Sort options */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Sort By
                            </label>
                            <select
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                value={`${filters.sortBy}-${filters.sortDirection}`}
                                onChange={(e) => {
                                    const [sortBy, sortDirection] = e.target.value.split('-');
                                    setFilters({ ...filters, sortBy, sortDirection });
                                }}
                            >
                                <option value="trustScore-desc">Trust Score: High to Low</option>
                                <option value="trustScore-asc">Trust Score: Low to High</option>
                                <option value="reviewCount-desc">Most Reviews</option>
                                <option value="reviewCount-asc">Fewest Reviews</option>
                                <option value="recent-desc">Recently Active</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={() => setFilters({
                                skills: [],
                                minRating: 0,
                                maxRating: 5,
                                verified: false,
                                sortBy: 'trustScore',
                                sortDirection: 'desc'
                            })}
                            className="mr-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Reset
                        </button>
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            </Transition>
        </div>
    );
};