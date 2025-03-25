import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XIcon } from '@heroicons/react/outline';
import { useWeb3 } from '../web3Provider';
import { ethers } from 'ethers';

const StarRating = ({ rating, setRating, disabled }) => {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="flex items-center">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => setRating(star)}
          className={`${disabled ? 'cursor-not-allowed opacity-60' : 'hover:text-yellow-500'
            } p-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-full`}
        >
          <svg
            className={`h-8 w-8 ${star <= rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
              } transition-colors duration-150`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
      <span className="ml-2 text-gray-600 dark:text-gray-400 font-medium">
        {rating > 0 ? `${rating} stars` : 'Select rating'}
      </span>
    </div>
  );
};

export default function ReviewModal({ isOpen, onClose, freelancer }) {
  const {
    isConnected,
    address,
    contract,
    network,
    networkConfig,
    connectWallet,
    submitReview,
    transactionStatus
  } = useWeb3();

  // Form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Gas estimation state
  const [gasEstimate, setGasEstimate] = useState(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimationError, setEstimationError] = useState(null);
  const [showGasDetails, setShowGasDetails] = useState(false);

  // Transaction stages
  const [txStage, setTxStage] = useState('initial'); // initial, estimating, ready, submitting, pending, success, error

  // Reset form when modal opens/closes or freelancer changes
  useEffect(() => {
    if (isOpen) {
      setRating(5);
      setComment('');
      setError(null);
      setGasEstimate(null);
      setTxStage('initial');
    }
  }, [isOpen, freelancer]);

  // Handle gas estimation
  const estimateGasFees = async () => {
    if (!freelancer || !isConnected || !contract) {
      setError('Wallet not connected or contract not loaded');
      return;
    }

    try {
      setIsEstimating(true);
      setEstimationError(null);
      setTxStage('estimating');

      // Call the submitReview function with a special flag to only estimate gas
      const estimate = await submitReview({
        freelancerAddress: freelancer.address,
        rating,
        comment,
        estimateOnly: true,
        onSuccess: (data) => {
          setGasEstimate(data);
          setTxStage('ready');
        },
        onError: (error) => {
          setEstimationError(error.message);
          setTxStage('error');
        }
      });

      // Keep this line only if submitReview returns the estimate directly
      // and doesn't use callbacks
      if (estimate) {
        setGasEstimate(estimate);
        setTxStage('ready');
      }
    } catch (err) {
      console.error('Gas estimation failed:', err);
      setEstimationError(err.message || 'Failed to estimate gas fees');
      setTxStage('error');
    } finally {
      setIsEstimating(false);
    }
  };

  // Handle review submission
  const handleSubmitReview = async (e) => {
    e.preventDefault();

    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (rating < 1) {
      setError('Please select a rating');
      return;
    }

    if (!comment.trim()) {
      setError('Please enter a comment');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setTxStage('submitting');

      await submitReview({
        freelancerAddress: freelancer.address,
        rating,
        comment,
        onSuccess: (data) => {
          if (data.isPending) {
            setTxStage('pending');
          } else {
            setTxStage('success');
            // Wait a moment before closing modal
            setTimeout(() => {
              onClose();
            }, 3000);
          }
        },
        onError: (error) => {
          setError(error.message);
          setTxStage('error');
        }
      });
    } catch (err) {
      console.error('Review submission failed:', err);
      setError(err.message || 'Failed to submit review');
      setTxStage('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format the gas cost for display
  const formatGasCost = (wei) => {
    if (!wei) return 'Unknown';
    const ethValue = ethers.utils.formatEther(wei);
    return `${parseFloat(ethValue).toFixed(6)} ${networkConfig?.currency || 'ETH'}`;
  };

  // Reset the form
  const resetForm = () => {
    setRating(5);
    setComment('');
    setError(null);
    setGasEstimate(null);
    setTxStage('initial');
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="fixed z-50 inset-0 overflow-y-auto"
        onClose={() => {
          if (!isSubmitting && txStage !== 'pending') {
            onClose();
          }
        }}
      >
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          {/* Center modal */}
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
            &#8203;
          </span>

          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  {txStage === 'success'
                    ? 'Review Submitted!'
                    : `Rate ${freelancer?.name || 'Freelancer'}`}
                </Dialog.Title>
                <button
                  type="button"
                  className="bg-white dark:bg-gray-800 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={onClose}
                  disabled={isSubmitting || txStage === 'pending'}
                >
                  <span className="sr-only">Close</span>
                  <XIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>

              {/* Transaction success message */}
              {txStage === 'success' && (
                <div className="mt-4 text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900">
                    <svg className="h-6 w-6 text-green-600 dark:text-green-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Thank you for your review!</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Your review has been successfully submitted to the blockchain.
                  </p>
                  {transactionStatus.hash && (
                    <a
                      href={`${networkConfig?.blockExplorer}/tx/${transactionStatus.hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      View on {networkConfig?.name.split(' ')[0]} Explorer
                    </a>
                  )}
                </div>
              )}

              {/* Transaction pending message */}
              {txStage === 'pending' && (
                <div className="mt-4 text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900">
                    <div className="h-6 w-6 border-2 border-yellow-600 dark:border-yellow-300 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Transaction In Progress</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Your review is being recorded on the blockchain. Please wait...
                  </p>
                  {transactionStatus.hash && (
                    <a
                      href={`${networkConfig?.blockExplorer}/tx/${transactionStatus.hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 block"
                    >
                      View transaction status
                    </a>
                  )}
                </div>
              )}

              {/* Form content when not in success or pending state */}
              {txStage !== 'success' && txStage !== 'pending' && (
                <>
                  {/* Wallet connection prompt */}
                  {!isConnected ? (
                    <div className="mt-4 text-center py-4">
                      <p className="mb-4 text-gray-700 dark:text-gray-300">
                        Please connect your wallet to submit a review.
                      </p>
                      <button
                        type="button"
                        onClick={connectWallet}
                        className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Connect Wallet
                      </button>
                    </div>
                  ) : (
                    <>
                      <form onSubmit={handleSubmitReview}>
                        <div className="mt-4">
                          {/* Profile display */}
                          <div className="flex items-center mb-6">
                            <div className="flex-shrink-0">
                              {freelancer?.profileImage ? (
                                <img
                                  src={freelancer.profileImage}
                                  alt={freelancer.name}
                                  className="h-16 w-16 rounded-full"
                                />
                              ) : (
                                <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400">
                                  <span className="text-xl">{freelancer?.name?.charAt(0) || 'F'}</span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                                {freelancer?.name}
                                {freelancer?.isVerified && (
                                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    Verified
                                  </span>
                                )}
                              </h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {freelancer?.skills?.slice(0, 3).join(', ')}
                                {freelancer?.skills?.length > 3 ? ', ...' : ''}
                              </p>
                            </div>
                          </div>

                          {/* Rating selector */}
                          <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Your Rating
                            </label>
                            <StarRating
                              rating={rating}
                              setRating={setRating}
                              disabled={isSubmitting || txStage === 'estimating' || txStage === 'submitting'}
                            />
                          </div>

                          {/* Comment input */}
                          <div className="mb-6">
                            <label
                              htmlFor="comment"
                              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                            >
                              Your Review
                            </label>
                            <textarea
                              id="comment"
                              name="comment"
                              rows={4}
                              className="shadow-sm block w-full focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                              placeholder="Share your experience working with this freelancer..."
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              disabled={isSubmitting || txStage === 'estimating' || txStage === 'submitting'}
                              required
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Max 280 characters. Your review will be permanently recorded on the blockchain.
                            </p>
                          </div>

                          {/* Gas estimation section */}
                          {txStage === 'estimating' ? (
                            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div>
                                <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                                  Estimating gas fees...
                                </span>
                              </div>
                            </div>
                          ) : gasEstimate ? (
                            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Estimated transaction fee:
                                </span>
                                <span className="text-sm text-gray-900 dark:text-gray-100 font-semibold">
                                  {formatGasCost(gasEstimate.estimatedCostWei)}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => setShowGasDetails(!showGasDetails)}
                                className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 inline-flex items-center"
                              >
                                {showGasDetails ? 'Hide details' : 'Show details'}
                                <svg
                                  className={`ml-1 h-4 w-4 transform ${showGasDetails ? 'rotate-180' : ''} transition-transform`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>

                              {showGasDetails && (
                                <div className="mt-2 text-xs space-y-1 text-gray-500 dark:text-gray-400">
                                  <div className="flex justify-between">
                                    <span>Gas limit:</span>
                                    <span>{gasEstimate.gasLimit}</span>
                                  </div>
                                  {gasEstimate.gasPrice && (
                                    <div className="flex justify-between">
                                      <span>Gas price:</span>
                                      <span>{ethers.utils.formatUnits(gasEstimate.gasPrice, 'gwei')} gwei</span>
                                    </div>
                                  )}
                                  {gasEstimate.maxFeePerGas && (
                                    <div className="flex justify-between">
                                      <span>Max fee per gas:</span>
                                      <span>{ethers.utils.formatUnits(gasEstimate.maxFeePerGas, 'gwei')} gwei</span>
                                    </div>
                                  )}
                                  {gasEstimate.maxPriorityFeePerGas && (
                                    <div className="flex justify-between">
                                      <span>Priority fee:</span>
                                      <span>{ethers.utils.formatUnits(gasEstimate.maxPriorityFeePerGas, 'gwei')} gwei</span>
                                    </div>
                                  )}
                                  <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-600">
                                    <span>Network: {network}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : null}

                          {/* Error display */}
                          {(error || estimationError) && (
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 rounded-md">
                              <div className="flex">
                                <div className="flex-shrink-0">
                                  <svg className="h-5 w-5 text-red-400 dark:text-red-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                <div className="ml-3">
                                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                                    Error
                                  </h3>
                                  <p className="text-sm text-red-700 dark:text-red-300">
                                    {error || estimationError}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex justify-end mt-8 space-x-3">
                            {txStage === 'initial' ? (
                              <button
                                type="button"
                                onClick={estimateGasFees}
                                disabled={!isConnected || !comment.trim() || rating < 1}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Continue
                              </button>
                            ) : txStage === 'ready' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGasEstimate(null);
                                    setTxStage('initial');
                                  }}
                                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                  Back
                                </button>
                                <button
                                  type="submit"
                                  disabled={isSubmitting || !isConnected}
                                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isSubmitting ? 'Submitting...' : 'Confirm Submission'}
                                </button>
                              </>
                            ) : txStage === 'error' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={resetForm}
                                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                  Go Back
                                </button>
                                <button
                                  type="button"
                                  onClick={estimateGasFees}
                                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                  Try Again
                                </button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </form>

                      {/* Blockchain verification notice */}
                      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                          <svg className="h-4 w-4 mr-1 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Your review will be verified with your wallet signature and permanently recorded on the {network} blockchain.
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}