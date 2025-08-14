import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { requestFcmTokenAndRegister } from './firebase.js';

createRoot(document.getElementById('root')).render(
  
    <App />
 
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => {
        console.log('[PWA] Service Worker registered', reg.scope);
  // Attempt FCM registration (non-blocking)
  requestFcmTokenAndRegister();
      })
      .catch(err => console.error('[PWA] SW register failed', err));
  });
 
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SW_UPDATE_READY') {
      // Simple auto-refresh approach; could show toast instead
      console.log('[PWA] New version available, updating...');
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg && reg.waiting) {
          reg.waiting.postMessage('SKIP_WAITING');
          // After skipWaiting, reload to get new assets
          setTimeout(() => window.location.reload(), 600);
        }
      });
    } else if (event.data && event.data.type === 'OPEN_CHAT') {
      const targetUrl = event.data.url || '/';
      if (window.__APP_NAVIGATE) {
        // Use React Router navigate exposed by App
        window.__APP_NAVIGATE(targetUrl);
      } else {
        // Fallback: manipulate history (may not trigger rerender until user interacts)
        if (window.location.pathname + window.location.search !== targetUrl) {
          window.history.pushState({}, '', targetUrl);
        }
      }
      window.dispatchEvent(new CustomEvent('chat-open-from-notification', { detail: event.data }));
    }
  });
}
