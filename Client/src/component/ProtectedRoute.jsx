import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';

const ProtectedRoute = ({ children }) => {
  const [auth, setAuth] = useState({ loading: true, ok: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/me`, { withCredentials: true });
        if (!cancelled) setAuth({ loading: false, ok: !!res.data?.success });
      } catch {
        if (!cancelled) setAuth({ loading: false, ok: false });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (auth.loading) return null; // or a spinner
  if (!auth.ok) return <Navigate to="/login" replace />;
  return children;
};

export default ProtectedRoute;