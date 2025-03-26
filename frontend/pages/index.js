import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useWeb3 } from '../web3Provider';
import { Transition } from '@headlessui/react';
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { mockApiService } from '../services/mockApi';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

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
    } = useQuery({
        queryKey: ['freelancers', filters],
        queryFn: async () => {
            // Use mock data in development or when API_BASE_URL is not available
            const isDev = process.env.NODE_ENV === 'development';

            if (isDev && (!API_BASE_URL || API_BASE_URL.includes('yourapp.com'))) {
                return mockApiService.getFreelancers(filters);
            }

            // For production or if API_BASE_URL is available
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
        staleTime: 60000,
        refetchOnWindowFocus: false
    });

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
        // Skip WebSocket in development with default URLs
        const isDev = process.env.NODE_ENV === 'development';
        if (isDev && (!WEBSOCKET_URL || WEBSOCKET_URL.includes('yourapp.com'))) {
            console.log('WebSocket connection skipped in development');
            setWsConnected(true); // Fake connected state
            return;
        }

        // Initialize WebSocket connection
        try {
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

            // Error handling
            websocket.current.addEventListener('error', (error) => {
                console.error('WebSocket error:', error);
                setWsConnected(false);
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
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            setWsConnected(false);
        }
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
        <>
            <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
                <Navbar onConnectWalletClick={() => setIsConnectWalletModalOpen(true)} />

                <main className="flex-grow">
                    {/* Hero Section */}
                    <div className="relative bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-700 overflow-hidden">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-10">
                            <svg className="h-full w-full" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <pattern id="hexa" width="40" height="40" patternUnits="userSpaceOnUse">
                                        <path d="M0,20 L20,0 L40,20 L20,40 Z" fill="none" stroke="white" strokeWidth="0.5" />
                                    </pattern>
                                </defs>
                                <rect width="100%" height="100%" fill="url(#hexa)" />
                            </svg>
                        </div>

                        <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
                            <div className="md:w-3/5">
                                <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                                    <span className="block">Trustless Reputations</span>
                                    <span className="block text-indigo-200">for the Digital Economy</span>
                                </h1>
                                <p className="mt-6 max-w-3xl text-xl text-indigo-100">
                                    Find top freelancers with verified blockchain-secured reviews and transparent reputation scores that can't be manipulated.
                                </p>
                                <div className="mt-10 flex flex-col sm:flex-row gap-4">
                                    <button
                                        onClick={handleFreelancerSignUp}
                                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-indigo-700 transition-colors"
                                    >
                                        <svg className="mr-2 -ml-1 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                                        </svg>
                                        Sign Up as Freelancer
                                    </button>
                                    <Link href="/how-it-works" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 bg-opacity-20 hover:bg-opacity-30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-indigo-700 transition-colors">
                                        <svg className="mr-2 -ml-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                        Learn More
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Wave Shape Divider */}
                        <div className="absolute bottom-0 left-0 w-full overflow-hidden">
                            <svg className="relative block w-full h-16 sm:h-24" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                                <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="#f9fafb" className="dark:fill-gray-900"></path>
                            </svg>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                            <div>
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Top-Rated Freelancers</h2>
                                <p className="text-md text-gray-600 dark:text-gray-400 mt-2">
                                    Browse our verified freelancers with blockchain-secured reputation scores
                                </p>
                            </div>
                            <div className="mt-4 md:mt-0 flex items-center">
                                <div className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-full shadow-sm">
                                    <span className={`h-3 w-3 relative rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}>
                                        {wsConnected && (
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        )}
                                    </span>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {wsConnected ? 'Live updates active' : 'Connecting...'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <FilterPanel
                            availableSkills={availableSkills}
                            filters={filters}
                            setFilters={setFilters}
                        />

                        {/* Freelancer List */}
                        <div className="mt-8">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg shadow p-8">
                                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading freelancers...</p>
                                </div>
                            ) : isError ? (
                                <div className="text-center py-10 px-6 bg-red-50 dark:bg-red-900 rounded-lg shadow">
                                    <svg className="mx-auto h-12 w-12 text-red-600 dark:text-red-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <div className="mt-4 text-lg font-medium text-red-800 dark:text-red-200">
                                        Error loading freelancers
                                    </div>
                                    <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                                        {error?.message || 'Please try again later'}
                                    </div>
                                    <button
                                        onClick={() => refetch()}
                                        className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                                    >
                                        <svg className="mr-2 -ml-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                        </svg>
                                        Retry
                                    </button>
                                </div>
                            ) : filteredFreelancers.length === 0 ? (
                                <div className="text-center py-12 px-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
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
                                        className="mt-6 inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                                    >
                                        <svg className="mr-2 -ml-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                        </svg>
                                        Reset Filters
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    {filteredFreelancers.map((freelancer) => (
                                        <div
                                            key={freelancer.address}
                                            className="relative group bg-white dark:bg-gray-800 overflow-hidden shadow-md hover:shadow-xl rounded-lg transition-all duration-300 transform hover:-translate-y-1"
                                            onClick={() => setSelectedFreelancer(freelancer)}
                                        >
                                            <div className="absolute top-0 right-0 mt-4 mr-4 z-10">
                                                {freelancer.isVerified && (
                                                    <div className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
                                                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                        </svg>
                                                        Verified
                                                    </div>
                                                )}
                                            </div>

                                            <div className="px-6 py-6">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 relative">
                                                        {freelancer.profileImage ? (
                                                            <Image
                                                                src={freelancer.profileImage}
                                                                alt={freelancer.name}
                                                                width={70}
                                                                height={70}
                                                                className="rounded-full border-2 border-white dark:border-gray-700 shadow-sm object-cover"
                                                            />
                                                        ) : (
                                                            <Jazzicon diameter={70} seed={jsNumberForAddress(freelancer.address)} />
                                                        )}
                                                    </div>
                                                    <div className="ml-5 flex-1">
                                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                            {freelancer.name}
                                                        </h3>
                                                        <div className="mt-1 flex items-center">
                                                            {/* Rating stars */}
                                                            <div className="flex items-center">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <svg
                                                                        key={i}
                                                                        className={`h-4 w-4 ${i < Math.round(freelancer.trustScore / 20)
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
                                                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
                                                                {(freelancer.trustScore / 20).toFixed(1)}
                                                            </span>
                                                            <span className="ml-1 text-sm text-gray-500 dark:text-gray-500">
                                                                ({freelancer.reviewCount})
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

                                                <div className="mt-4">
                                                    <div className="flex flex-wrap gap-2">
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

                                                <div className="mt-5 flex justify-between items-center">
                                                    <div className="flex items-center">
                                                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wider">
                                                            Reputation
                                                        </span>
                                                        <div className="ml-2 h-2 w-24 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-indigo-600 rounded-full"
                                                                style={{ width: `${freelancer.trustScore}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                                            {freelancer.trustScore}
                                                        </div>
                                                        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">/100</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-750 flex justify-end">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedFreelancer(freelancer);
                                                    }}
                                                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center"
                                                >
                                                    View Profile
                                                    <svg className="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Call to Action */}
                    <div className="bg-indigo-700 dark:bg-indigo-800 relative overflow-hidden">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-10">
                            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                                <path d="M0,0 L100,0 L100,100 L0,100 Z" fill="none" stroke="white" strokeWidth="0.25" strokeDasharray="5,5" />
                            </svg>
                        </div>

                        <div className="relative max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8 text-center">
                            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                                <span className="block">Showcase your skills.</span>
                                <span className="block">Build your reputation on the blockchain.</span>
                            </h2>
                            <p className="mt-4 text-lg leading-6 text-indigo-200 max-w-2xl mx-auto">
                                Join thousands of freelancers building verifiable reputations that can't be faked or manipulated. Stand out with blockchain-verified credentials.
                            </p>
                            <div className="mt-10">
                                <button
                                    onClick={handleFreelancerSignUp}
                                    className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-lg text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-indigo-700 transition-colors"
                                >
                                    <svg className="mr-2 -ml-1 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                                    </svg>
                                    Sign Up as Freelancer
                                </button>
                            </div>
                        </div>
                    </div>
                </main>

                <Footer />

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
        </>
    );
}