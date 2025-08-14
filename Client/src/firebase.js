// Firebase client initialization and FCM token helper
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Expect config via Vite env vars
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let messaging;
let app;
export function initFirebase() {
  if (typeof window === 'undefined') return { app: null, messaging: null };
  if (!app) {
    if (!firebaseConfig.apiKey) {
      console.warn('Firebase config missing env vars. Skipping init.');
      return { app: null, messaging: null };
    }
    app = initializeApp(firebaseConfig);
    try {
  messaging = getMessaging(app);
    } catch (e) {
      console.warn('FCM init failed', e.message);
    }
  }
  return { app, messaging };
}

export async function requestFcmTokenAndRegister() {
  initFirebase();
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY; // public key
    // Use existing registered service worker (our custom one) instead of firebase-messaging-sw.js to avoid MIME error
    let swReg = await navigator.serviceWorker.getRegistration();
    if (!swReg) {
      swReg = await navigator.serviceWorker.register('/service-worker.js');
    }
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg });
    if (token) {
      await fetch(`${import.meta.env.VITE_BACKEND_URL}/fcm/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fcmToken: token }),
        credentials: 'include'
      });
    }
    return token;
  } catch (e) {
    console.warn('FCM token error', e.message);
    return null;
  }
}

export function onForegroundMessage(cb) {
  initFirebase();
  if (!messaging) return () => {};
  return onMessage(messaging, payload => {
    cb(payload);
  });
}
