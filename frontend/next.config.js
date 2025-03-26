/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        domains: [
            'randomuser.me',
            'gateway.pinata.cloud',
            'ipfs.io',
            'avatar.tobi.sh',
            'cloudflare-ipfs.com'
        ],
        formats: ['image/avif', 'image/webp'],
    },
    i18n: {
        locales: ['en'],
        defaultLocale: 'en',
    },
    // If using app directory, remove the experimental appDir flag
    experimental: {
        appDir: false,
    }
};

module.exports = nextConfig;