import { SessionProvider } from "next-auth/react";
import { Web3Provider } from "../web3Provider";
import { QueryClient, QueryClientProvider } from 'react-query';
import '../styles/globals.css';

const queryClient = new QueryClient();

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
    return (
        <SessionProvider session={session}>
            <Web3Provider>
                <QueryClientProvider client={queryClient}>
                    <Component {...pageProps} />
                </QueryClientProvider>
            </Web3Provider>
        </SessionProvider>
    );
}

export default MyApp;