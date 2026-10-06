import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import interactionService from '../../services/interaction.service';
import {
  UserCheck,
  ShieldCheck,
  PhoneCall,
  Layers,
  Building2,
  CheckSquare,
  Clock,
  TrendingUp,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

export default function TeamMemberHome() {
  const user = useSelector(selectCurrentUser);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const res = await interactionService.getTeamMemberOutreachStats();
        if (res.success) {
          setStats(res.data);
        }
      } catch (err) {
        console.error('Failed to load outreach stats for dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Scope Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Team Member Outreach Workspace — {user?.organization?.name || 'Assigned Institution'}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Corporate outreach pipeline, high-velocity HR call capture, and interaction tracking.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            Tenant Scope: {user?.organization?.code || 'Active'}
          </span>
        </div>
      </div>

      {/* Live Outreach KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Allocated vs Contacted Coverage Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Outreach Coverage</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {loading ? '...' : stats?.contactedCompanies ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              / {loading ? '...' : stats?.assignedCompanies ?? 0} Companies Contacted
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${stats?.coveragePercentage ?? 0}%` }}
            ></div>
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between pt-1">
            <span>{stats?.coveragePercentage ?? 0}% Contacted</span>
            <span>{stats?.uncontactedCompanies ?? 0} Never Contacted</span>
          </div>
        </div>

        {/* Total Calls & Feedback */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Calls & Feedback</span>
            <PhoneCall className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {loading ? '...' : stats?.totalCalls ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">Calls Logged</span>
          </div>
          <div className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md font-medium border border-emerald-100">
            {loading ? '...' : stats?.feedbackSubmitted ?? 0} Total Feedback Submissions
          </div>
        </div>

        {/* Follow-Ups Due Today */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Callbacks Due Today</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-amber-600">
              {loading ? '...' : stats?.followUpsDueToday ?? 0}
            </span>
            <span className="text-xs text-slate-600 font-semibold">Due Today</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span className="text-rose-600 font-semibold">{stats?.overdueFollowUps ?? 0} Overdue</span>
            <span className="text-slate-600 font-medium">{stats?.upcomingFollowUps ?? 0} Upcoming</span>
          </div>
        </div>

        {/* Dedicated Quick Link */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-5 rounded-xl text-white shadow-2xs flex flex-col justify-between">
          <div>
            <div className="text-xs text-indigo-300 font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              <span>Outreach Hub</span>
            </div>
            <div className="text-sm font-bold mt-1">My Outreach Center</div>
            <p className="text-[11px] text-slate-300 mt-1">
              View all submitted call feedback, HR contacts, and follow-up schedules.
            </p>
          </div>
          <Link
            to="/team-member/outreach"
            className="mt-3 text-xs font-semibold text-indigo-300 hover:text-white flex items-center gap-1"
          >
            <span>Open My Outreach &rarr;</span>
          </Link>
        </div>
      </div>

      {/* Identity & Scope Verification Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            Authenticated Identity Details
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
              <span className="font-semibold text-emerald-700">{user?.role}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Organization:</span>
              <span className="font-semibold text-slate-900">{user?.organization?.name}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Tenant ID:</span>
              <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                {user?.organizationId}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Account Status:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                {user?.status}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-emerald-600" />
            Operational Outreach Scope
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            As a <strong className="text-slate-900">TEAM_MEMBER</strong>, your daily workflow centers on your allocated corporate accounts. You are secured within <strong className="text-slate-900">{user?.organization?.name}</strong> and cannot inspect accounts belonging to other institutions or unrelated team members without PMO delegation.
          </p>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800">Operational Outreach Modules:</div>
            <div>&bull; Assigned Calling Queue & Corporate Contact Directory</div>
            <div>&bull; High-Velocity HR Call Logging Modal (&lt; 30s)</div>
            <div>&bull; Dedicated My Outreach Feedback Center</div>
            <div>&bull; Scheduled Callback Alerts & Follow-up Task Timeline</div>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/team-member/companies"
          className="bg-white border border-slate-200 hover:border-indigo-300 p-4 rounded-xl shadow-2xs hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div>
            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">My Companies</div>
            <div className="text-xs text-slate-500 mt-0.5">Assigned corporate accounts & contacts</div>
          </div>
          <Building2 className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
        </Link>
        <Link
          to="/team-member/outreach"
          className="bg-white border border-slate-200 hover:border-indigo-300 p-4 rounded-xl shadow-2xs hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div>
            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">My Outreach</div>
            <div className="text-xs text-slate-500 mt-0.5">Call history & complete feedback records</div>
          </div>
          <PhoneCall className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
        </Link>
        <Link
          to="/team-member/follow-ups"
          className="bg-white border border-slate-200 hover:border-indigo-300 p-4 rounded-xl shadow-2xs hover:shadow-md transition-all flex items-center justify-between group"
        >
          <div>
            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Follow-Up Tasks</div>
            <div className="text-xs text-slate-500 mt-0.5">Scheduled callbacks & pending tasks</div>
          </div>
          <CheckSquare className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
        </Link>
      </div>
    </div>
  );
}
