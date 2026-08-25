import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Clean up stale or legacy service workers (e.g. coi-serviceworker) from origin
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  }).catch((err) => {
    console.warn('[ServiceWorker] Cleanup warning:', err);
  });
}

// Prevent iOS Safari & Android mobile browser whole-page pinch gestures
if (typeof document !== 'undefined') {
  document.addEventListener('gesturestart', (e) => { e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturechange', (e) => { e.preventDefault(); }, { passive: false });
  document.addEventListener('gestureend', (e) => { e.preventDefault(); }, { passive: false });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);