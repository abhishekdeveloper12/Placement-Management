import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import pmoService from '../../services/pmo.service';
import Badge from '../../components/common/Badge';
import {
  Building2,
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  Lock,
  Layers,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Plus,
} from 'lucide-react';

export default function PMOHome() {
  const user = useSelector(selectCurrentUser);

  const [stats, setStats] = useState({
    totalTeamMembers: 0,
    activeTeamMembers: 0,
    inactiveTeamMembers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await pmoService.getDashboardStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Failed to load PMO dashboard stats:', err);
      setError(err.response?.data?.error?.message || 'Failed to load team metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-6">
      {/* Scope & Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              PMO Administration — {user?.organization?.name || 'Organization Workspace'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Placement Office operations, team member provisioning, and corporate outreach management.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/pmo/team-members"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Manage Team Members</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Error Alert if stats failed */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchStats}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Team Member Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total Team Members */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Team Members
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {loading ? '...' : stats.totalTeamMembers}
            </div>
            <span className="text-xs text-slate-400 mt-0.5 inline-block">
              Operational outreach staff
            </span>
          </div>
          <div className="w-11 h-11 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Active Team Members */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Active Members
            </span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {loading ? '...' : stats.activeTeamMembers}
            </div>
            <span className="text-xs text-slate-400 mt-0.5 inline-block">
              Authorized for outreach
            </span>
          </div>
          <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Inactive Team Members */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Inactive Members
            </span>
            <div className="text-2xl font-bold text-rose-600 mt-1">
              {loading ? '...' : stats.inactiveTeamMembers}
            </div>
            <span className="text-xs text-slate-400 mt-0.5 inline-block">
              Access suspended
            </span>
          </div>
          <div className="w-11 h-11 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <UserX className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Card */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Team Member Onboarding & Roster
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-xl">
            Provision caller accounts, view team members, reset credentials, or deactivate accounts when team structure changes. All members created are strictly scoped to your institution.
          </p>
        </div>
        <Link
          to="/pmo/team-members"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Go to Team Members</span>
        </Link>
      </div>

      {/* Identity & Scope Verification Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Authenticated PMO Identity
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Placement Officer:</span>
              <span className="font-semibold text-slate-900">{user?.name}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Email:</span>
              <span className="font-mono text-slate-700">{user?.email}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Assigned Role:</span>
              <Badge variant="PMO">PMO</Badge>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Organization:</span>
              <span className="font-semibold text-slate-900">{user?.organization?.name}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Tenant Code / ID:</span>
              <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                {user?.organization?.code} ({user?.organizationId})
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Account Status:</span>
              <Badge variant={user?.status || 'ACTIVE'}>{user?.status || 'ACTIVE'}</Badge>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" />
            Tenant Isolation Guardrails Active
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            As a <strong className="text-slate-900">PMO</strong>, all operations are cryptographically bound to <strong className="text-slate-900">{user?.organization?.name}</strong>. All API queries automatically inject your server-derived <code className="text-xs bg-slate-100 px-1 py-0.5 rounded font-mono">organizationId</code>, preventing data crossover with other educational institutions.
          </p>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800">Tenant Security Rules:</div>
            <div>&bull; Team members created belong exclusively to your organization.</div>
            <div>&bull; PMO cannot view or modify team members belonging to other organizations.</div>
            <div>&bull; PMO cannot grant PMO or Super Admin privileges.</div>
            <div>&bull; Inactive team members are blocked from logging in.</div>
          </div>
        </div>
      </div>

      {/* Milestone Roadmap Notice */}
      <div className="p-5 rounded-xl border border-blue-100 bg-blue-50/50 flex items-start gap-3.5">
        <div className="p-2 rounded-lg bg-blue-100 text-blue-700 mt-0.5">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-blue-950">Foundation & Team Member Module Operational</h3>
          <p className="text-xs text-blue-900/80 mt-1 leading-relaxed">
            Team Member Management is active. Next milestones will add Company Master import, company assignment engine, and HR outreach call logging as defined in <code className="bg-blue-100 px-1 rounded">PROJECT_CONTEXT.md</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
