import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { signIn, useSession, getProviders } from 'next-auth/react';
import { useWeb3 } from '../web3Provider';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';

export default function Login() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const { isConnected, address, connectWallet, signMessage } = useWeb3();

    const [providers, setProviders] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [walletAuthenticating, setWalletAuthenticating] = useState(false);

    // Redirect if already logged in
    useEffect(() => {
        if (session) {
            const returnUrl = router.query.returnUrl || '/dashboard';
            router.push(returnUrl);
        }
    }, [session, router]);

    // Load OAuth providers
    useEffect(() => {
        const setupProviders = async () => {
            const res = await getProviders();
            setProviders(res);
        };

        setupProviders();
    }, []);

    // Clear error when user changes auth method
    useEffect(() => {
        if (error) {
            setError('');
        }
    }, [walletAuthenticating]);

    // Handle OAuth login
    const handleOAuthLogin = async (providerId) => {
        try {
            setIsLoading(true);
            setError('');

            const result = await signIn(providerId, {
                callbackUrl: router.query.returnUrl || '/dashboard',
                redirect: false
            });

            if (result?.error) {
                setError(result.error);
                setIsLoading(false);
            }

            // Redirect happens automatically on success

        } catch (err) {
            console.error('Authentication error:', err);
            setError('Authentication failed. Please try again.');
            setIsLoading(false);
        }
    };

    // Handle Web3 wallet authentication
    const handleWalletLogin = async () => {
        try {
            setIsLoading(true);
            setWalletAuthenticating(true);
            setError('');

            // Connect wallet if not connected
            if (!isConnected) {
                await connectWallet();
                // Return early - the useEffect for isConnected will trigger next steps
                return;
            }

            // Generate nonce from backend
            const nonceRes = await fetch('/api/auth/web3/nonce', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address })
            });

            if (!nonceRes.ok) {
                throw new Error('Failed to generate authentication nonce');
            }

            const { nonce } = await nonceRes.json();

            // Create message to sign
            const message = `Sign this message to verify your ownership of this wallet: ${nonce}`;

            // Request signature
            const signature = await signMessage(message);

            // Verify signature with backend & get JWT
            const result = await signIn('credentials', {
                address,
                signature,
                nonce,
                redirect: false
            });

            if (result?.error) {
                throw new Error(result.error);
            }

            // Redirect on success
            router.push(router.query.returnUrl || '/dashboard');

        } catch (err) {
            console.error('Web3 authentication error:', err);
            setError(err.message || 'Wallet authentication failed. Please try again.');
            setIsLoading(false);
            setWalletAuthenticating(false);
        }
    };

    // Effect to continue wallet auth flow once connected
    useEffect(() => {
        if (walletAuthenticating && isConnected) {
            handleWalletLogin();
        }
    }, [isConnected, walletAuthenticating]);

    // Don't render login UI if already authenticated or loading session
    if (status === 'loading' || session) {
        return (
            <div className="min-h-screen flex justify-center items-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>Log In - ProofWork</title>
            </Head>

            <div className="min-h-screen flex flex-col justify-center bg-gray-50 dark:bg-gray-900 py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <Link href="/">
                        <a className="flex justify-center">
                            <Image
                                src="/logo.png"
                                height={48}
                                width={48}
                                alt="ProofWork"
                                className="rounded-lg shadow-md"
                            />
                        </a>
                    </Link>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                        Sign in to your account
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                        Or{' '}
                        <Link href="/register">
                            <a className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                                create a new account
                            </a>
                        </Link>
                    </p>
                </div>

                <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
                        {/* Error Alert */}
                        {error && (
                            <div className="mb-6 bg-red-50 dark:bg-red-900 border-l-4 border-red-400 p-4">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-red-700 dark:text-red-200">
                                            {error}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-6">
                            {/* Web3 Wallet Authentication */}
                            <div>
                                <button
                                    type="button"
                                    onClick={handleWalletLogin}
                                    disabled={isLoading}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 dark:disabled:bg-indigo-800"
                                >
                                    {isLoading && walletAuthenticating ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {isConnected ? 'Verifying wallet...' : 'Connecting wallet...'}
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                            </svg>
                                            Connect with Web3 Wallet
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                        Or continue with
                                    </span>
                                </div>
                            </div>

                            {/* OAuth Providers */}
                            {providers && Object.values(providers)
                                .filter(provider => ['google', 'linkedin'].includes(provider.id))
                                .map(provider => (
                                    <div key={provider.id}>
                                        <button
                                            type="button"
                                            onClick={() => handleOAuthLogin(provider.id)}
                                            disabled={isLoading}
                                            className="w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                        >
                                            {provider.id === 'google' && (
                                                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                                                    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                                                        <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"></path>
                                                        <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"></path>
                                                        <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"></path>
                                                        <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"></path>
                                                    </g>
                                                </svg>
                                            )}

                                            {provider.id === 'linkedin' && (
                                                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
                                                </svg>
                                            )}

                                            <span>
                                                Sign in with {provider.name}
                                            </span>
                                        </button>
                                    </div>
                                ))
                            }
                        </div>

                        {/* Terms of service link */}
                        <div className="mt-6">
                            <p className="text-center text-xs text-gray-600 dark:text-gray-400">
                                By signing in, you agree to our{' '}
                                <Link href="/terms">
                                    <a className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                                        Terms of Service
                                    </a>
                                </Link>
                                {' '}and{' '}
                                <Link href="/privacy">
                                    <a className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                                        Privacy Policy
                                    </a>
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}