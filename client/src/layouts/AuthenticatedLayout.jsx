import React from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser, logoutUser } from '../features/auth/authSlice';
import { LogOut, Building2, Globe, Shield, User as UserIcon, LayoutDashboard, Users, PhoneCall, CheckSquare, Briefcase, Activity, Database } from 'lucide-react';
import NotificationBell from '../components/common/NotificationBell';

export default function AuthenticatedLayout() {
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <Globe className="w-3 h-3" />
            SUPER ADMIN (Global)
          </span>
        );
      case 'PMO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Shield className="w-3 h-3" />
            PMO (Org Admin)
          </span>
        );
      case 'TEAM_MEMBER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <UserIcon className="w-3 h-3" />
            TEAM MEMBER (Outreach)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      {/* Top Application Bar */}
      <header className="bg-white border-b border-slate-200 shadow-xs sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              PM
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 tracking-tight">
                Placement Management System
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                Multi-Tenant SaaS
              </span>
            </div>
          </div>

          {/* User Identity & Logout Controls */}
          <div className="flex items-center gap-4">
            {/* Notification Bell Dropdown */}
            <NotificationBell />

            {/* User Profile Info */}
            <div className="flex items-center gap-3 text-right">
              <div className="hidden md:block">
                <div className="text-sm font-semibold text-slate-900">{user?.name}</div>
                <div className="text-xs text-slate-500">{user?.email}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {getRoleBadge(user?.role)}
                {user?.organization && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    <Building2 className="w-3 h-3 text-slate-500" />
                    {user.organization.name}
                  </span>
                )}
              </div>
            </div>

            {/* Logout Action */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors shadow-2xs cursor-pointer"
              title="Log out of application"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Role-Specific Navigation Sub-bar */}
        {user?.role === 'SUPER_ADMIN' && (
          <nav className="bg-slate-50/80 border-t border-slate-100 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto flex items-center gap-6 h-11 text-xs font-semibold">
              <NavLink
                to="/super-admin"
                end
                className={({ isActive }) =>
                  `flex items-center gap-1.5 h-full border-b-2 transition-colors ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`
                }
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </NavLink>
              <NavLink
                to="/super-admin/organizations"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 h-full border-b-2 transition-colors ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`
                }
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Organizations</span>
              </NavLink>
              <NavLink
                to="/super-admin/companies"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 h-full border-b-2 transition-colors ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`
                }
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Company Master</span>
              </NavLink>
              <NavLink
                to="/super-admin/audit-logs"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 h-full border-b-2 transition-colors ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`
                }
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Audit Logs</span>
              </NavLink>
              <NavLink
                to="/super-admin/data-management"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 h-full border-b-2 transition-colors ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`
                }
              >
                <Database className="w-3.5 h-3.5 text-purple-600" />
                <span>Data Management</span>
              </NavLink>
            </div>
          </nav>
        )}

        {user?.role === 'PMO' && (
          <nav className="bg-slate-50/80 border-t border-slate-100 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto flex items-center gap-6 h-11 text-xs font-semibold overflow-x-auto">
              <NavLink
                to="/pmo"
                end
                className={({ isActive }) =>
                  `flex items-center gap-1.5 h-full border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`
                }
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </NavLink>
              <NavLink
                to="/pmo/team-members"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 h-full border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`
                }
              >
                <Users className="w-3.5 h-3.5" />
                <span>Team Members</span>
              </NavLink>
              <NavLink
                to="/pmo/companies"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 h-full border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`
                }
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Company Database</span>
              </NavLink>
              <NavLink
                to="/pmo/opportunities"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 h-full border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`
                }
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Job Opportunities</span>
              </NavLink>
              <NavLink
                to="/pmo/follow-ups"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 h-full border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`
                }
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Follow-Ups</span>
              </NavLink>
              <NavLink
                to="/pmo/interactions"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 h-full border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`
                }
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Interactions Log</span>
              </NavLink>
              <NavLink
                to="/pmo/audit-logs"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 h-full border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`
                }
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Audit Logs</span>
              </NavLink>
              <NavLink
                to="/pmo/job-roles"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 h-full border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`
                }
              >
                <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                <span>Job Roles</span>
              </NavLink>
            </div>
          </nav>
        )}

        {user?.role === 'TEAM_MEMBER' && (
          <nav className="bg-slate-50/80 border-t border-slate-100 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto flex items-center gap-6 h-11 text-xs font-semibold overflow-x-auto">
              <NavLink
                to="/team-member"
                end
                className={({ isActive }) =>
                  `flex items-center gap-1.5 h-full border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`
                }
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </NavLink>
              <NavLink
                to="/team-member/companies"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 h-full border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`
                }
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>My Companies</span>
              </NavLink>
              <NavLink
                to="/team-member/outreach"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 h-full border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`
                }
              >
                <PhoneCall className="w-3.5 h-3.5 text-indigo-600" />
                <span>My Outreach</span>
              </NavLink>
              <NavLink
                to="/team-member/opportunities"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 h-full border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`
                }
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Job Opportunities</span>
              </NavLink>
              <NavLink
                to="/team-member/follow-ups"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 h-full border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`
                }
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Follow-Ups</span>
              </NavLink>
            </div>
          </nav>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Placement Management System &bull; Tenant Isolation & RBAC Verified
      </footer>
    </div>
  );
}
