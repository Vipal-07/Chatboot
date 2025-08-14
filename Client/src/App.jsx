import './App.css'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Signup from './component/Signup'
import Login from './component/Login'
import CardRearch from './component/CardRearch'
import MassagePage from './component/MassagePage'
import ProtectedRoute from './component/ProtectedRoute';
import toast, { Toaster } from 'react-hot-toast';
import WeatherApp from './component/WeatherApp';
import { useEffect } from 'react';
import { onForegroundMessage } from './firebase.js';


function AppInner() {
  useEffect(() => {
    // Foreground FCM messages -> show toast
    const unsub = onForegroundMessage(payload => {
      const title = payload?.notification?.title || 'New Message';
      const body = payload?.notification?.body || '';
      toast(`${title}: ${body}`);
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/weather" element={<WeatherApp />} />
        <Route
          path="/card"
          element={
            <ProtectedRoute>
              <CardRearch />
            </ProtectedRoute>
          }
        />
        <Route
          path="/card/:userId"
          element={
            <ProtectedRoute>
              <MassagePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<WeatherApp />} />
      </Routes>
    </>
  )
}

// Root component single Router
function App() {
  return (
    <Router>
      <RouterIntegration />
      <AppInner />
    </Router>
  );
}

function RouterIntegration() {
  const navigate = useNavigate();
  useEffect(() => {
    window.__APP_NAVIGATE = (path) => navigate(path);
    // Listen to SW OPEN_CHAT events dispatched as custom event (fallback if main listener runs before navigate exposed)
    const handler = (e) => {
      const url = e.detail?.url || '/';
      navigate(url);
    };
    window.addEventListener('chat-open-from-notification', handler);
    return () => window.removeEventListener('chat-open-from-notification', handler);
  }, [navigate]);
  return null;
}

export default App
