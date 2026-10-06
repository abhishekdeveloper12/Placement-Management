import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectAuth } from '../../features/auth/authSlice';
import { Loader2, ShieldAlert } from 'lucide-react';

/**
 * ProtectedRoute Component
 * Guards routes against unauthenticated access and enforces role-based permissions
 *
 * @param {Array<string>} [allowedRoles] - Roles permitted to view this route
 * @param {React.ReactNode} [children] - Optional nested route elements
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, isInitializing, user } = useSelector(selectAuth);
  const location = useLocation();

  // Show clean loading state while verifying initial authentication state
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">Verifying session...</p>
      </div>
    );
  }

  // Not authenticated: Redirect to login preserving intended path
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role validation: If allowedRoles specified and user role not present
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Access Denied (403)</h2>
          <p className="text-sm text-slate-600 mb-6">
            Your role (<code className="font-semibold text-slate-800">{user.role}</code>) does not have permission to access this area.
          </p>
          <a
            href={
              user.role === 'SUPER_ADMIN'
                ? '/super-admin'
                : user.role === 'PMO'
                ? '/pmo'
                : '/team-member'
            }
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
          >
            Return to Authorized Workspace
          </a>
        </div>
      </div>
    );
  }

  return children ? children : <Outlet />;
}
