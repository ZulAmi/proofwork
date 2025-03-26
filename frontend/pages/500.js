import React from 'react';

export default function Custom500() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4">
            <h1 className="text-4xl font-bold mb-6">500 - Server Error</h1>
            <p className="text-xl mb-8">
                Sorry, something went wrong on our server. We're working to fix it!
            </p>
            <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
                Try Again
            </button>
        </div>
    );
}