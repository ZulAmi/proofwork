import React from 'react';

function Error({ statusCode }) {
    return (
        <div style={{
            padding: '20px',
            maxWidth: '600px',
            margin: '0 auto',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
                {statusCode
                    ? `${statusCode} - Server Error`
                    : 'An Error Occurred'}
            </h1>
            <p style={{ marginBottom: '2rem' }}>
                {statusCode
                    ? `A server error occurred`
                    : 'A client-side error occurred'}
            </p>
            <button
                onClick={() => window.location.href = '/'}
                style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                }}
            >
                Go Home
            </button>
        </div>
    );
}

Error.getInitialProps = ({ res, err }) => {
    const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
    return { statusCode };
};

export default Error;