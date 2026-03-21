import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
        <div className="text-center">
          <div className="flex items-center gap-[6px] mx-auto mb-4 justify-center">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-[8px] h-[8px] rounded-full bg-[#B5A68C]" style={{ animation: `typingPulse 1.4s ease-in-out ${i * 0.15}s infinite`, opacity: 0.25 }} />
            ))}
          </div>
          <style>{`@keyframes typingPulse { 0%, 80%, 100% { opacity: 0.25; } 40% { opacity: 0.9; } }`}</style>
          <p className="text-[#8C7E6A] text-sm">Lade...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
