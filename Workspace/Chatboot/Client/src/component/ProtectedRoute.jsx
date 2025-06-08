// filepath: /home/vikas07/Public/Chatboot/Client/src/component/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');

  // If there is no token, redirect to the login page
  if (!token) {
    return <Navigate to="/login" />;
  }

  // If there is a token, render the children components
  return children;
};

export default ProtectedRoute;