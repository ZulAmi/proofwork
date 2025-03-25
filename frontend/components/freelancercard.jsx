import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShieldCheckIcon } from '@heroicons/react/solid';
import { ExternalLinkIcon } from '@heroicons/react/outline';
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';

/**
 * FreelancerCard - Displays a freelancer's information in a card format
 * @param {Object} props
 * @param {Object} props.freelancer - Freelancer data object
 * @param {string} props.freelancer.id - Unique identifier
 * @param {string} props.freelancer.name - Freelancer's name
 * @param {string} props.freelancer.profileImage - URL to profile image
 * @param {string} props.freelancer.address - Blockchain address
 * @param {Array<string>} props.freelancer.skills - Array of skills
 * @param {number} props.freelancer.trustScore - Reputation score (0-100)
 * @param {number} props.freelancer.reviewCount - Number of reviews
 * @param {boolean} props.freelancer.isVerified - Verification status
 * @param {string} props.className - Additional CSS classes
 */
const FreelancerCard = ({ freelancer, className = '' }) => {
    const {
        id,
        name,
        profileImage,
        address,
        skills = [],
        trustScore = 0,
        reviewCount = 0,
        isVerified = false
    } = freelancer;

    // Determine if the freelancer should show an on-chain verification badge
    const isHighlyRated = trustScore >= 80;

    // Calculate display rating out of 5 stars
    const starRating = (trustScore / 20).toFixed(1);

    return (
        <motion.div
            className={`rounded-lg overflow-hidden shadow-md bg-white dark:bg-gray-800 ${className}`}
            whileHover={{
                y: -4,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                transition: { duration: 0.2 }
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="p-5">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        {profileImage ? (
                            <div className="relative h-14 w-14 rounded-full overflow-hidden border-2 border-indigo-100 dark:border-indigo-900">
                                <Image
                                    src={profileImage}
                                    alt={name}
                                    layout="fill"
                                    objectFit="cover"
                                    className="rounded-full"
                                />
                            </div>
                        ) : (
                            <div className="h-14 w-14 rounded-full border-2 border-indigo-100 dark:border-indigo-900 overflow-hidden">
                                <Jazzicon diameter={56} seed={jsNumberForAddress(address)} />
                            </div>
                        )}
                    </div>

                    <div className="ml-4 flex-1">
                        <div className="flex items-center">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate max-w-[180px]">
                                {name}
                            </h3>

                            {/* Verification badges */}
                            <div className="flex ml-2 space-x-1">
                                {isVerified && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                        <ShieldCheckIcon className="h-3 w-3 mr-1" />
                                        Verified
                                    </span>
                                )}

                                {isHighlyRated && (
                                    <motion.span
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                        initial={{ scale: 1 }}
                                        animate={{ scale: [1, 1.1, 1] }}
                                        transition={{ repeat: 3, repeatType: "reverse", duration: 0.6, delay: 0.3 }}
                                    >
                                        On-chain
                                    </motion.span>
                                )}
                            </div>
                        </div>

                        <div className="mt-1 flex items-center">
                            {/* Rating stars */}
                            <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                    <svg
                                        key={i}
                                        className={`h-4 w-4 ${i < Math.round(trustScore / 20)
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
                            <span className="ml-1 text-sm text-gray-600 dark:text-gray-400">
                                {starRating}
                            </span>
                            <span className="ml-1 text-xs text-gray-500 dark:text-gray-500">
                                ({reviewCount})
                            </span>
                        </div>
                    </div>

                    <div className="ml-auto text-right">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Reputation
                        </div>
                        <div className="flex items-center justify-end mt-1">
                            <div className={`text-lg font-bold ${trustScore >= 80 ? 'text-green-600 dark:text-green-400' :
                                trustScore >= 60 ? 'text-indigo-600 dark:text-indigo-400' :
                                    trustScore >= 40 ? 'text-yellow-600 dark:text-yellow-400' :
                                        'text-red-600 dark:text-red-400'
                                }`}>
                                {trustScore}
                            </div>
                            <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">/100</span>
                        </div>
                    </div>
                </div>

                {/* Skills */}
                <div className="mt-4">
                    <div className="flex flex-wrap gap-1.5">
                        {skills.slice(0, 3).map((skill, index) => (
                            <span
                                key={index}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                            >
                                {skill}
                            </span>
                        ))}
                        {skills.length > 3 && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                +{skills.length - 3}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Card footer with View Profile button */}
            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700 flex justify-end">
                <Link href={`/freelancer/${id}`}>
                    <motion.a
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                        whileHover={{ x: 3 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                        View Profile
                        <ExternalLinkIcon className="ml-1.5 h-4 w-4" />
                    </motion.a>
                </Link>
            </div>
        </motion.div>
    );
};

export default FreelancerCard;