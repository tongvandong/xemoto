import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, roles = ['Admin', 'Staff'] }) => {
  const { isAuthenticated, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" role="status">
          <span className="sr-only absolute h-px w-px overflow-hidden whitespace-nowrap">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !hasRole(...roles)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="mb-0 rounded border border-[#ffeeba] bg-[#fff3cd] px-5 py-3 text-[#856404]">
          Bạn không có quyền truy cập khu vực này.
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
