import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { requestFcmTokenAndRegister } from './firebase.js';

createRoot(document.getElementById('root')).render(
  
    <App />
 
);

// Service worker usage removed per request. FCM registration will still work without SW for foreground usage only.
// If you need background notifications, re-enable SW registration here.
