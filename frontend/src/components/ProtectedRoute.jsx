import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children }) {
  const { user, token } = useAuth();

  // Has token but user not yet loaded — show children optimistically
  // (will redirect to login once auth check completes if token is invalid)
  if (token && !user) {
    return children;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
