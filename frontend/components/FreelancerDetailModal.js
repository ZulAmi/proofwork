import React, { useState } from 'react';
import Image from 'next/image';
import { Dialog, Transition } from '@headlessui/react';
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';
import { useWeb3 } from '../web3Provider';

const FreelancerDetailModal = ({ freelancer, isOpen, onClose, isConnected, onConnectWallet }) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [reviewText, setReviewText] = useState('');
    const [rating, setRating] = useState(5);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { submitReview, contract } = useWeb3();

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!isConnected) {
            onConnectWallet(); // Trigger wallet connection
            return;
        }

        setIsSubmitting(true);
        try {
            // In a real app, you would call the contract method here
            console.log(`Submitting review for ${freelancer.address}: ${rating} stars - ${reviewText}`);

            // Example contract call (commented out)
            /*
            await submitReview({
              freelancerAddress: freelancer.address,
              rating: rating,
              comment: reviewText,
              onSuccess: () => {
                setReviewText('');
                setRating(5);
                alert('Review submitted successfully!');
              },
              onError: (error) => {
                console.error('Review submission failed:', error);
                alert(`Failed to submit review: ${error.message}`);
              }
            });
            */

            // Mock success
            setTimeout(() => {
                setReviewText('');
                setRating(5);
                alert('Review submitted successfully!');
                setIsSubmitting(false);
            }, 1000);

        } catch (error) {
            console.error('Review submission error:', error);
            alert('Failed to submit review');
            setIsSubmitting(false);
        }
    };

    const handleLeaveReview = () => {
        if (!isConnected) {
            onConnectWallet();
            return;
        }
        // Leave review logic
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
                        <div className="inline-block w-full max-w-3xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl">
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

                            {/* Profile Header */}
                            <div className="flex items-center mb-6">
                                <div className="flex-shrink-0 mr-4">
                                    {freelancer.profileImage ? (
                                        <Image
                                            src={freelancer.profileImage}
                                            alt={freelancer.name}
                                            width={80}
                                            height={80}
                                            className="rounded-full"
                                        />
                                    ) : (
                                        <Jazzicon diameter={80} seed={jsNumberForAddress(freelancer.address)} />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
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
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {freelancer.address.substring(0, 6)}...{freelancer.address.substring(38)}
                                    </p>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="border-b border-gray-200 dark:border-gray-700">
                                <nav className="-mb-px flex space-x-8">
                                    <button
                                        className={`${activeTab === 'profile'
                                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                            } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
                                        onClick={() => setActiveTab('profile')}
                                    >
                                        Profile
                                    </button>
                                    <button
                                        className={`${activeTab === 'reviews'
                                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                            } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
                                        onClick={() => setActiveTab('reviews')}
                                    >
                                        Reviews
                                    </button>
                                    <button
                                        className={`${activeTab === 'leave-review'
                                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                            } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
                                        onClick={() => setActiveTab('leave-review')}
                                    >
                                        Leave a Review
                                    </button>
                                </nav>
                            </div>

                            {/* Tab Content */}
                            <div className="mt-6">
                                {activeTab === 'profile' && (
                                    <div>
                                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">About</h4>
                                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                                            {freelancer.bio || "This freelancer hasn't added a bio yet."}
                                        </p>

                                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Skills</h4>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {freelancer.skills.map((skill) => (
                                                <span
                                                    key={skill}
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>

                                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                            Reputation Score
                                        </h4>
                                        <div className="flex items-center mb-4">
                                            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                                                {freelancer.trustScore}
                                            </div>
                                            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">/100</span>
                                        </div>

                                        <div className="flex justify-end mt-6">
                                            <button
                                                type="button"
                                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                            >
                                                Hire {freelancer.name}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'reviews' && (
                                    <div>
                                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                            Client Reviews ({freelancer.reviewCount})
                                        </h4>

                                        {freelancer.reviews && freelancer.reviews.length > 0 ? (
                                            <div className="space-y-6">
                                                {freelancer.reviews.map((review, index) => (
                                                    <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0">
                                                        <div className="flex items-center mb-2">
                                                            {/* Rating stars */}
                                                            <div className="flex items-center">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <svg
                                                                        key={i}
                                                                        className={`h-5 w-5 ${i < review.rating
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
                                                            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                                                {new Date(review.timestamp * 1000).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-600 dark:text-gray-300">
                                                            {review.comment}
                                                        </p>
                                                        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                            by {review.clientName || review.clientAddress.substring(0, 6) + '...' + review.clientAddress.substring(38)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-10">
                                                <p className="text-gray-500 dark:text-gray-400">No reviews yet</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'leave-review' && (
                                    <div>
                                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                            Leave a Review for {freelancer.name}
                                        </h4>

                                        {!isConnected ? (
                                            <div className="text-center py-10">
                                                <p className="text-gray-500 dark:text-gray-400 mb-4">
                                                    Please connect your wallet to leave a review
                                                </p>
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                    onClick={() => onClose()}
                                                >
                                                    Connect Wallet
                                                </button>
                                            </div>
                                        ) : (
                                            <form onSubmit={handleSubmitReview}>
                                                <div className="mb-4">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                        Rating
                                                    </label>
                                                    <div className="flex items-center">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <button
                                                                key={star}
                                                                type="button"
                                                                onClick={() => setRating(star)}
                                                                className="focus:outline-none"
                                                            >
                                                                <svg
                                                                    className={`h-8 w-8 ${star <= rating
                                                                        ? 'text-yellow-400'
                                                                        : 'text-gray-300 dark:text-gray-600'
                                                                        }`}
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    viewBox="0 0 20 20"
                                                                    fill="currentColor"
                                                                >
                                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                                </svg>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="mb-4">
                                                    <label
                                                        htmlFor="reviewText"
                                                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                                                    >
                                                        Review
                                                    </label>
                                                    <textarea
                                                        id="reviewText"
                                                        rows={4}
                                                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                                                        placeholder="Share your experience working with this freelancer..."
                                                        value={reviewText}
                                                        onChange={(e) => setReviewText(e.target.value)}
                                                        required
                                                    />
                                                </div>

                                                <div className="flex justify-end">
                                                    <button
                                                        type="button"
                                                        className="mr-3 inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                        onClick={onClose}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                        disabled={isSubmitting}
                                                    >
                                                        {isSubmitting ? 'Submitting...' : 'Submit Review'}
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
};

export default FreelancerDetailModal;