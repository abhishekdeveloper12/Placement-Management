import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCurrentUser, setUninitialized, selectAuth } from './features/auth/authSlice';

// Components & Layouts
import ProtectedRoute from './components/common/ProtectedRoute';
import AuthenticatedLayout from './layouts/AuthenticatedLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import SuperAdminHome from './pages/super-admin/SuperAdminHome';
import OrganizationListPage from './pages/super-admin/OrganizationListPage';
import OrganizationDetailPage from './pages/super-admin/OrganizationDetailPage';
import CompanyListPage from './pages/companies/CompanyListPage';
import CompanyDetailPage from './pages/companies/CompanyDetailPage';
import BulkCompanyImportPage from './pages/companies/BulkCompanyImportPage';
import PMOHome from './pages/pmo/PMOHome';
import PMODashboardPage from './pages/pmo/PMODashboardPage';
import TeamMemberListPage from './pages/pmo/TeamMemberListPage';
import TeamMemberDetailPage from './pages/pmo/TeamMemberDetailPage';
import TeamMemberHome from './pages/team-member/TeamMemberHome';
import TeamMemberCompanyListPage from './pages/team-member/TeamMemberCompanyListPage';
import TeamMemberCompanyDetailPage from './pages/team-member/TeamMemberCompanyDetailPage';
import PMOFollowUpListPage from './pages/pmo/PMOFollowUpListPage';
import PMOInteractionListPage from './pages/pmo/PMOInteractionListPage';
import PMOOpportunityListPage from './pages/pmo/PMOOpportunityListPage';
import TeamMemberFollowUpListPage from './pages/team-member/TeamMemberFollowUpListPage';
import TeamMemberInteractionListPage from './pages/team-member/TeamMemberInteractionListPage';
import TeamMemberOpportunityListPage from './pages/team-member/TeamMemberOpportunityListPage';
import OpportunityDetailPage from './pages/opportunities/OpportunityDetailPage';
import SuperAdminAuditLogPage from './pages/super-admin/SuperAdminAuditLogPage';
import DataManagementPage from './pages/super-admin/DataManagementPage';
import PMOAuditLogPage from './pages/pmo/PMOAuditLogPage';
import JobRoleListPage from './pages/pmo/JobRoleListPage';
import HealthMonitorPage from './pages/HealthMonitorPage';
import NotificationsPage from './pages/NotificationsPage';

export default function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, isInitializing, user } = useSelector(selectAuth);

  // Initialize session on application mount
  useEffect(() => {
    const token = localStorage.getItem('placement_access_token');
    if (token) {
      dispatch(fetchCurrentUser());
    } else {
      dispatch(setUninitialized());
    }
  }, [dispatch]);

  // Root redirect resolver based on authenticated role
  const getHomeRoute = () => {
    if (!isAuthenticated || !user) return <Navigate to="/login" replace />;

    switch (user.role) {
      case 'SUPER_ADMIN':
        return <Navigate to="/super-admin" replace />;
      case 'PMO':
        return <Navigate to="/pmo" replace />;
      case 'TEAM_MEMBER':
        return <Navigate to="/team-member" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* System Health Monitor */}
        <Route path="/health" element={<HealthMonitorPage />} />

        {/* Authenticated Root Scope */}
        <Route path="/" element={getHomeRoute()} />

        {/* Role-Protected Routes with Authenticated Shell */}
        <Route element={<AuthenticatedLayout />}>
          {/* Super Admin Routes */}
          <Route
            path="/super-admin"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <SuperAdminHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <SuperAdminHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/organizations"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <OrganizationListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/organizations/:id"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <OrganizationDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/companies"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <CompanyListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/companies/import"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <BulkCompanyImportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/companies/:id"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <CompanyDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <SuperAdminAuditLogPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/data-management"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <DataManagementPage />
              </ProtectedRoute>
            }
          />

          {/* PMO Routes */}
          <Route
            path="/pmo"
            element={
              <ProtectedRoute allowedRoles={['PMO']}>
                <PMODashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pmo/dashboard"
            element={
              <ProtectedRoute allowedRoles={['PMO']}>
                <PMODashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pmo/team-members"
            element={
              <ProtectedRoute allowedRoles={['PMO']}>
                <TeamMemberListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pmo/team-members/:id"
            element={
              <ProtectedRoute allowedRoles={['PMO']}>
                <TeamMemberDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pmo/companies"
            element={
              <ProtectedRoute allowedRoles={['PMO']}>
                <CompanyListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pmo/companies/import"
            element={
              <ProtectedRoute allowedRoles={['PMO']}>
                <BulkCompanyImportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pmo/companies/:id"
            element={
              <ProtectedRoute allowedRoles={['PMO']}>
                <CompanyDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pmo/follow-ups"
            element={
              <ProtectedRoute allowedRoles={['PMO']}>
                <PMOFollowUpListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pmo/interactions"
            element={
              <ProtectedRoute allowedRoles={['PMO']}>
                <PMOInteractionListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pmo/opportunities"
            element={
              <ProtectedRoute allowedRoles={['PMO']}>
                <PMOOpportunityListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pmo/opportunities/:id"
            element={
              <ProtectedRoute allowedRoles={['PMO']}>
                <OpportunityDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pmo/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['PMO']}>
                <PMOAuditLogPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pmo/job-roles"
            element={
              <ProtectedRoute allowedRoles={['PMO']}>
                <JobRoleListPage />
              </ProtectedRoute>
            }
          />

          {/* Team Member Routes */}
          <Route
            path="/team-member"
            element={
              <ProtectedRoute allowedRoles={['TEAM_MEMBER']}>
                <TeamMemberHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team-member/companies"
            element={
              <ProtectedRoute allowedRoles={['TEAM_MEMBER']}>
                <TeamMemberCompanyListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team-member/companies/:id"
            element={
              <ProtectedRoute allowedRoles={['TEAM_MEMBER']}>
                <TeamMemberCompanyDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team-member/follow-ups"
            element={
              <ProtectedRoute allowedRoles={['TEAM_MEMBER']}>
                <TeamMemberFollowUpListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team-member/outreach"
            element={
              <ProtectedRoute allowedRoles={['TEAM_MEMBER']}>
                <TeamMemberInteractionListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team-member/interactions"
            element={
              <ProtectedRoute allowedRoles={['TEAM_MEMBER']}>
                <TeamMemberInteractionListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team-member/opportunities"
            element={
              <ProtectedRoute allowedRoles={['TEAM_MEMBER']}>
                <TeamMemberOpportunityListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team-member/opportunities/:id"
            element={
              <ProtectedRoute allowedRoles={['TEAM_MEMBER']}>
                <OpportunityDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'PMO', 'TEAM_MEMBER']}>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Unmatched / 404 Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
