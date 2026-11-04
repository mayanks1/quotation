import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-3" />
        <p className="text-sm font-medium text-slate-400">Loading your workspace...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const params = new URLSearchParams(location.search);
    const recParam = params.get('rec') || params.get('receipt');
    if (recParam) {
      return <Navigate to={`/receipt/${encodeURIComponent(recParam)}/view${location.search}`} replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
