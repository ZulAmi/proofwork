import { SessionProvider } from "next-auth/react";
import { Web3Provider } from "../web3Provider";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Analytics } from '@vercel/analytics/react';
import NProgress from 'nprogress';
import '../styles/globals.css';
import { NotificationProvider } from "../context/NotificationsContext";
import NotificationBanner from "../components/NotificationBanner";
import React from 'react';
import ConnectWalletModal from '../components/ConnectWalletModal';

// Loading bar configuration
NProgress.configure({
    showSpinner: false,
    trickleSpeed: 100
});

// Create a separate component that uses useWeb3
function AppContent({ Component, pageProps }) {
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

    const handleConnectWallet = () => {
        setIsWalletModalOpen(true);
    };

    const closeWalletModal = () => {
        setIsWalletModalOpen(false);
    };

    const handleWalletConnect = async (walletType) => {
        try {
            // For now, just log the wallet type
            // The actual connection logic should be handled in the Web3Provider
            console.log(`Attempting to connect with ${walletType}`);

            // You can implement the actual wallet connection logic here
            // or call a function from your Web3Provider context

        } catch (error) {
            console.error('Failed to connect wallet:', error);
            throw error;
        }
    };

    // Check if the component has a layout
    const getLayout = Component.getLayout || ((page) => page);

    return (
        <>
            <NotificationBanner />
            {getLayout(<Component {...pageProps} onConnectWalletClick={handleConnectWallet} />)}
            <ConnectWalletModal
                isOpen={isWalletModalOpen}
                onClose={closeWalletModal}
                onConnect={handleWalletConnect}
            />
        </>
    );
}

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
    // Create a client for each request instead of sharing one
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                refetchOnWindowFocus: false,
                staleTime: 30000,
            },
        },
    }));

    // Page loading indicator
    const router = useRouter();

    useEffect(() => {
        const handleStart = () => NProgress.start();
        const handleComplete = () => NProgress.done();

        router.events.on('routeChangeStart', handleStart);
        router.events.on('routeChangeComplete', handleComplete);
        router.events.on('routeChangeError', handleComplete);

        return () => {
            router.events.off('routeChangeStart', handleStart);
            router.events.off('routeChangeComplete', handleComplete);
            router.events.off('routeChangeError', handleComplete);
        };
    }, [router]);

    return (
        <>
            <Head>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
                <meta name="description" content="Find top freelancers with verified blockchain-secured reviews and transparent reputation scores that can't be manipulated." />
                <link rel="icon" href="/favicon.ico" />
                <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#4f46e5" />
                <title>ProofWork | Blockchain-Verified Freelance Platform</title>
            </Head>

            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <SessionProvider session={session}>
                    <Web3Provider>
                        <QueryClientProvider client={queryClient}>
                            <NotificationProvider>
                                <AppContent Component={Component} pageProps={pageProps} />
                                <Analytics />
                            </NotificationProvider>
                        </QueryClientProvider>
                    </Web3Provider>
                </SessionProvider>
            </ThemeProvider>
        </>
    );
}

export default MyApp;