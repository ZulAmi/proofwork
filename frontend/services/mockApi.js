// Mock freelancer data for development
const mockFreelancers = [
    {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        name: 'Zulhilmi Zulhilmi',
        isVerified: true,
        profileImage: 'https://randomuser.me/api/portraits/men/1.jpg',
        skills: ['React', 'Node.js', 'Solidity'],
        trustScore: 88,
        reviewCount: 24,
        bio: 'Full-stack developer with 6+ years of experience. Specialized in blockchain applications and smart contracts.',
        reviews: [
            {
                clientAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
                clientName: 'Tech Innovations Ltd',
                rating: 5,
                comment: 'Excellent work on our DeFi project. Delivered on time and with high quality.',
                timestamp: Math.floor(Date.now() / 1000) - 604800 // 1 week ago
            }
        ]
    },
    {
        address: '0x2345678901abcdef2345678901abcdef23456789',
        name: 'Zulhilmi Zulhilmi',
        isVerified: true,
        profileImage: 'https://randomuser.me/api/portraits/women/2.jpg',
        skills: ['UI/UX Design', 'React', 'TypeScript'],
        trustScore: 92,
        reviewCount: 31,
        bio: 'UI/UX designer with a focus on creating intuitive interfaces for Web3 applications.',
        reviews: [
            {
                clientAddress: '0xbcdef1234567890abcdef1234567890abcdef123',
                clientName: 'Crypto Wallet Inc',
                rating: 5,
                comment: 'Sarah redesigned our wallet interface and increased user engagement by 40%.',
                timestamp: Math.floor(Date.now() / 1000) - 1209600 // 2 weeks ago
            }
        ]
    },
    {
        address: '0x3456789012abcdef3456789012abcdef34567890',
        name: 'Zulhilmi Zulhilmi',
        isVerified: false,
        profileImage: 'https://randomuser.me/api/portraits/men/3.jpg',
        skills: ['Smart Contract Audit', 'Solidity', 'Security'],
        trustScore: 76,
        reviewCount: 8,
        bio: 'Smart contract security specialist. Former auditor at a major blockchain security firm.',
        reviews: []
    },
    {
        address: '0x456789012abcdef456789012abcdef456789012a',
        name: 'Zulhilmi Zulhilmi',
        isVerified: true,
        profileImage: 'https://randomuser.me/api/portraits/women/4.jpg',
        skills: ['Blockchain Development', 'Rust', 'WebAssembly'],
        trustScore: 95,
        reviewCount: 42,
        bio: 'Blockchain developer specializing in Rust and WebAssembly. Contributor to several open-source projects.',
        reviews: []
    },
    {
        address: '0x567890123abcdef567890123abcdef567890123a',
        name: 'Fran Fran',
        isVerified: false,
        profileImage: 'https://randomuser.me/api/portraits/men/5.jpg',
        skills: ['Frontend', 'React', 'DApp Development'],
        trustScore: 81,
        reviewCount: 15,
        bio: 'Frontend developer focused on creating beautiful and functional decentralized applications.',
        reviews: []
    }
];

export const mockApiService = {
    getFreelancers: async (filters) => {
        console.log('Mock API called with filters:', filters);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // Apply filters
        let results = [...mockFreelancers];

        // Filter by skills
        if (filters.skills && filters.skills.length > 0) {
            results = results.filter(freelancer =>
                freelancer.skills.some(skill =>
                    filters.skills.includes(skill.toLowerCase())
                )
            );
        }

        // Filter by rating
        results = results.filter(freelancer =>
            freelancer.trustScore >= filters.minRating * 20 &&
            freelancer.trustScore <= filters.maxRating * 20
        );

        // Filter by verification
        if (filters.verified) {
            results = results.filter(freelancer => freelancer.isVerified);
        }

        // Apply sorting
        const sortField = filters.sortBy === 'recent' ? 'reviewCount' : filters.sortBy;
        results.sort((a, b) => {
            return filters.sortDirection === 'asc'
                ? a[sortField] - b[sortField]
                : b[sortField] - a[sortField];
        });

        return results;
    }
};