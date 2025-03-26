import React from 'react';
import Link from 'next/link';

export default function NotFound() {
    return (
        <div style={{
            padding: '20px',
            maxWidth: '600px',
            margin: '0 auto',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
                404 - Page Not Found
            </h1>
            <p style={{ marginBottom: '2rem' }}>
                The page you're looking for doesn't exist or has been moved.
            </p>
            <Link href="/" style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '0.375rem',
                fontWeight: 'bold'
            }}>
                Go Home
            </Link>
        </div>
    );
}