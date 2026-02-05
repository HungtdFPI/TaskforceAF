import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

function TestApp() {
    return (
        <div style={{ backgroundColor: 'green', color: 'white', padding: 20 }}>
            <h1>TEST APPLICATION WORKS</h1>
            <p>React is mounting correctly.</p>
        </div>
    );
}

const root = document.getElementById('root');
if (!root) throw new Error('Root not found');

createRoot(root).render(
    <StrictMode>
        <TestApp />
    </StrictMode>
);
