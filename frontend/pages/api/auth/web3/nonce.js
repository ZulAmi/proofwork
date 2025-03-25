import { nanoid } from 'nanoid';

// In a production app, you should store nonces in a database with expiry times
const NONCES = new Map();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { address } = req.body;

        if (!address) {
            return res.status(400).json({ error: 'Address is required' });
        }

        // Generate new nonce
        const nonce = nanoid();

        // Store nonce (in a real app, save to database with TTL)
        NONCES.set(address.toLowerCase(), nonce);

        // Clean up old nonces after 5 minutes
        setTimeout(() => {
            NONCES.delete(address.toLowerCase());
        }, 5 * 60 * 1000);

        return res.status(200).json({ nonce });
    } catch (error) {
        console.error('Nonce generation error:', error);
        return res.status(500).json({ error: 'Failed to generate nonce' });
    }
}