import Head from 'next/head';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function HowItWorks() {
    return (
        <>
            <Head>
                <title>How It Works | ProofWork</title>
                <meta name="description" content="Learn how ProofWork connects clients with blockchain-verified freelancers." />
            </Head>
            <div className="flex flex-col min-h-screen">
                {/* Header */}
                <Navbar />

                {/* Hero Section */}
                <header className="relative bg-indigo-600">
                    <div className="absolute inset-0">
                        <img
                            className="w-full h-full object-cover opacity-20"
                            src="/images/how-it-works-bg.jpg"
                            alt="How It Works Background"
                        />
                        <div className="absolute inset-0 bg-indigo-600 mix-blend-multiply"></div>
                    </div>
                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
                        <h1 className="text-4xl font-extrabold text-white sm:text-5xl lg:text-6xl">
                            How It Works
                        </h1>
                        <p className="mt-4 text-lg text-indigo-200">
                            Discover how ProofWork connects clients with blockchain-verified freelancers for secure and transparent collaboration.
                        </p>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-grow bg-gray-50 dark:bg-gray-900">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            {/* Step 1 */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                                <div className="flex justify-center mb-6">
                                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center">
                                        <svg
                                            className="w-8 h-8"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 11c0 1.104-.896 2-2 2s-2-.896-2-2 .896-2 2-2 2 .896 2 2zm0 0c0 1.104.896 2 2 2s2-.896 2-2-.896-2-2-2-2 .896-2 2zm0 0v6m0 0H9m3 0h3"
                                            />
                                        </svg>
                                    </div>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                                    Step 1: Create Your Profile
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Sign up and create a profile showcasing your skills, experience, and portfolio. Verified freelancers can build trust with clients.
                                </p>
                            </div>

                            {/* Step 2 */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                                <div className="flex justify-center mb-6">
                                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center">
                                        <svg
                                            className="w-8 h-8"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12h6m-3-3v6m9-6a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                    </div>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                                    Step 2: Find Work or Hire Talent
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Clients can post jobs and browse freelancers, while freelancers can apply to projects that match their expertise.
                                </p>
                            </div>

                            {/* Step 3 */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                                <div className="flex justify-center mb-6">
                                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center">
                                        <svg
                                            className="w-8 h-8"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                    </div>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                                    Step 3: Build Trust with Blockchain
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    All reviews and ratings are stored on the blockchain, ensuring transparency and trust for both freelancers and clients.
                                </p>
                            </div>
                        </div>

                        <div className="mt-16 text-center">
                            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-6">
                                Ready to Get Started?
                            </h2>
                            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                                Join ProofWork today and experience the future of freelancing.
                            </p>
                            <a
                                href="/"
                                className="inline-block px-8 py-4 text-white bg-indigo-600 hover:bg-indigo-700 rounded-full text-lg font-medium shadow-lg transition"
                            >
                                Get Started
                            </a>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <Footer />
            </div>
        </>
    );
}