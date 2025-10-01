import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  // Frontend gate: rely on localStorage flag set on successful login.
  const ok = !!localStorage.getItem('auth') && !!localStorage.getItem('token');
  if (!ok) return <Navigate to="/login" replace />;
  return children;
};

export default ProtectedRoute;
