import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import LinkedInProvider from 'next-auth/providers/linkedin';
import CredentialsProvider from 'next-auth/providers/credentials';
import { ethers } from 'ethers';

// Function to verify the signature from the Web3 wallet
const verifySignature = (address, signature, nonce) => {
    try {
        // The message that was signed
        const message = `Sign this message to verify your ownership of this wallet: ${nonce}`;

        // Recover the address from the signature
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);

        // Check if the recovered address matches the provided address
        return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
};

export default NextAuth({
    providers: [
        // OAuth providers
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        LinkedInProvider({
            clientId: process.env.LINKEDIN_CLIENT_ID,
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
            scope: 'r_emailaddress r_liteprofile',
        }),

        // Web3 wallet auth using Credentials provider
        CredentialsProvider({
            name: 'Web3',
            credentials: {
                address: { label: 'Address', type: 'text' },
                signature: { label: 'Signature', type: 'text' },
                nonce: { label: 'Nonce', type: 'text' }
            },
            async authorize(credentials) {
                if (!credentials?.address || !credentials?.signature || !credentials?.nonce) {
                    throw new Error('Missing credentials');
                }

                // Verify the signature
                const isValid = verifySignature(
                    credentials.address,
                    credentials.signature,
                    credentials.nonce
                );

                if (!isValid) {
                    throw new Error('Invalid signature');
                }

                // Get user from database or create if doesn't exist
                const user = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/web3`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        address: credentials.address,
                    }),
                }).then(res => res.json());

                // Return user object for session
                return {
                    id: user.id,
                    address: credentials.address,
                    name: user.name || `${credentials.address.slice(0, 6)}...${credentials.address.slice(-4)}`,
                    image: user.image,
                };
            },
        }),
    ],

    // Configure JWT
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },

    // Customize the JWT
    callbacks: {
        async jwt({ token, user, account }) {
            // Initial sign in
            if (account && user) {
                // Add auth provider details
                token.provider = account.provider;

                // Add Web3 address for wallet login
                if (account.provider === 'credentials' && user.address) {
                    token.address = user.address;
                }
            }
            return token;
        },
        async session({ session, token }) {
            // Add provider and address to client-side session
            session.provider = token.provider;
            if (token.address) {
                session.address = token.address;
            }
            return session;
        },
    },

    // Custom pages
    pages: {
        signIn: '/login',
        error: '/login',  // Error code passed in query string as ?error=
    },

    // Security
    secret: process.env.NEXTAUTH_SECRET,

    // Debug mode in development
    debug: process.env.NODE_ENV === 'development',
});