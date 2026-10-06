import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import pmoService from '../../services/pmo.service';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import {
  Building2,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Briefcase,
  Star,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  TrendingUp,
  PhoneCall,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

export default function PMODashboardPage() {
  const user = useSelector(selectCurrentUser);

  const [analytics, setAnalytics] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [dateRange, setDateRange] = useState('30d');
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState('');

  // Fetch Team Members dropdown
  useEffect(() => {
    async function loadTeamMembers() {
      try {
        const res = await pmoService.getTeamMembers({ limit: 100, status: 'ACTIVE' });
        if (res.success) {
          setTeamMembers(res.data);
        }
      } catch (err) {
        console.error('Failed to load team members for dashboard filter:', err);
      }
    }
    loadTeamMembers();
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        dateRange,
        teamMemberId: selectedTeamMemberId || undefined,
      };
      const res = await pmoService.getDashboardAnalytics(params);
      if (res.success) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch PMO dashboard analytics:', err);
      setError(err.response?.data?.error?.message || 'Failed to load PMO dashboard data');
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedTeamMemberId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading && !analytics) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-sm font-semibold text-slate-700">Loading PMO organization analytics...</span>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="p-8 text-center text-rose-600 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <AlertCircle className="w-10 h-10 mx-auto" />
        <div className="font-bold text-base">{error}</div>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 cursor-pointer transition-colors"
        >
          Retry Dashboard
        </button>
      </div>
    );
  }

  const { companies, hiring, followUps, teamPerformance, charts, recentActivity } = analytics || {
    companies: {},
    hiring: {},
    followUps: {},
    teamPerformance: [],
    charts: {},
    recentActivity: [],
  };

  return (
    <div className="space-y-6">
      {/* Scope Banner & Filter Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              PMO Corporate Outreach & Placement Analytics
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {user?.organization?.name || 'Organization Scope'}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Real-time pipeline metrics, team coverage ratios, hiring intakes, and scheduled callbacks across your institution.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Team Member Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 border border-slate-200 rounded-lg text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <select
              value={selectedTeamMemberId}
              onChange={(e) => setSelectedTeamMemberId(e.target.value)}
              className="bg-transparent outline-none font-semibold text-slate-800 pr-2 cursor-pointer"
            >
              <option value="">All Team Members</option>
              {teamMembers.map((tm) => (
                <option key={tm._id} value={tm._id}>
                  {tm.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 border border-slate-200 rounded-lg text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent outline-none font-semibold text-slate-800 pr-2 cursor-pointer"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors shadow-2xs cursor-pointer"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Group */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Companies */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Companies</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <Link
            to={`/pmo/companies${selectedTeamMemberId ? `?assignedTo=${selectedTeamMemberId}` : ''}`}
            className="text-3xl font-extrabold text-slate-900 mt-2 block hover:text-indigo-600 transition-colors"
          >
            {companies.totalCompanies || 0}
          </Link>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <Link
              to={`/pmo/companies?assignmentStatus=ASSIGNED${selectedTeamMemberId ? `&assignedTo=${selectedTeamMemberId}` : ''}`}
              className="hover:underline"
            >
              Assigned: <strong className="text-indigo-600">{companies.assignedCompanies || 0}</strong>
            </Link>
            <Link to="/pmo/companies?assignmentStatus=UNASSIGNED" className="hover:underline">
              Unassigned: <strong className="text-slate-700">{companies.unassignedCompanies || 0}</strong>
            </Link>
          </div>
        </div>

        {/* Contacted vs Not Contacted */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Outreach Coverage</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <PhoneCall className="w-5 h-5" />
            </div>
          </div>
          <Link
            to={`/pmo/companies?outreachStatus=CONTACTED${selectedTeamMemberId ? `&assignedTo=${selectedTeamMemberId}` : ''}`}
            className="text-3xl font-extrabold text-emerald-700 mt-2 block hover:text-emerald-900 transition-colors"
          >
            {companies.contactedCompanies || 0}
          </Link>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <Link
              to={`/pmo/companies?outreachStatus=CONTACTED${selectedTeamMemberId ? `&assignedTo=${selectedTeamMemberId}` : ''}`}
              className="hover:underline text-emerald-700 font-semibold"
            >
              Unique Contacted
            </Link>
            <Link
              to={`/pmo/companies?outreachStatus=PENDING${selectedTeamMemberId ? `&assignedTo=${selectedTeamMemberId}` : ''}`}
              className="text-rose-600 font-semibold hover:underline"
            >
              {companies.notContactedCompanies || 0} Pending
            </Link>
          </div>
        </div>

        {/* Currently Hiring */}
        <Link
          to={`/pmo/companies?hiringStatus=HIRING_NOW${selectedTeamMemberId ? `&assignedTo=${selectedTeamMemberId}` : ''}`}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Currently Hiring</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div className="text-3xl font-extrabold text-blue-700">{hiring.currentlyHiring || 0}</div>
            <span className="text-[11px] font-medium text-blue-600 group-hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Unique companies with active hiring feedback</p>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <span>Planned: <strong className="text-slate-800">{hiring.hiringPlanned || 0}</strong></span>
            <span>Total Roles: <strong className="text-blue-800">{hiring.totalRoles || 0}</strong></span>
          </div>
        </Link>

        {/* Shortlisted & Overdue Follow-ups */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <Link to="/pmo/opportunities?shortlisted=true" className="flex items-center gap-1.5 hover:text-indigo-600 font-bold text-slate-700 text-xs">
              <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
              <span>Shortlisted:</span>
            </Link>
            <Link to="/pmo/opportunities?shortlisted=true" className="text-lg font-extrabold text-amber-600 hover:underline">
              {hiring.shortlistedOpportunities || 0}
            </Link>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link to="/pmo/follow-ups" className="flex items-center gap-1.5 hover:text-rose-600 font-bold text-slate-700 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Overdue Follow-ups:</span>
            </Link>
            <Link to="/pmo/follow-ups" className="text-lg font-extrabold text-rose-600 hover:underline">
              {followUps.overdue || 0}
            </Link>
          </div>
        </div>
      </div>

      {/* Team Performance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>PMO Team Performance & Company Coverage Roster</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Individual assigned portfolio counts, unique company touchpoints, active hiring requirements, and coverage efficiency.
            </p>
          </div>
          <Link
            to="/pmo/team-members"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            <span>Manage Team</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {teamPerformance.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No active team members provisioned in your organization yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-5">Team Member</th>
                  <th className="py-3.5 px-4 text-center">Assigned</th>
                  <th className="py-3.5 px-4 text-center">Contacted</th>
                  <th className="py-3.5 px-4 text-center">Pending</th>
                  <th className="py-3.5 px-4 text-center">Currently Hiring</th>
                  <th className="py-3.5 px-4 text-center">Follow-ups</th>
                  <th className="py-3.5 px-5 text-right">Coverage %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teamPerformance.map((row) => (
                  <tr key={row.teamMember.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5">
                      <Link to={`/pmo/companies?assignedTo=${row.teamMember.id}`} className="font-bold text-slate-900 hover:text-indigo-600">
                        {row.teamMember.name}
                      </Link>
                      <div className="text-[11px] text-slate-500">{row.teamMember.email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Link
                        to={`/pmo/companies?assignedTo=${row.teamMember.id}`}
                        className="font-bold text-slate-800 hover:text-indigo-600 hover:underline"
                      >
                        {row.assigned}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Link
                        to={`/pmo/companies?assignedTo=${row.teamMember.id}&outreachStatus=CONTACTED`}
                        className="font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                      >
                        {row.contacted}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Link
                        to={`/pmo/companies?assignedTo=${row.teamMember.id}&outreachStatus=PENDING`}
                        className="font-semibold text-slate-600 hover:text-indigo-600 hover:underline"
                      >
                        {row.pending}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Link
                        to={`/pmo/opportunities?assignedTo=${row.teamMember.id}&hiringStatus=HIRING_NOW`}
                        className="font-bold text-blue-700 hover:text-blue-900 hover:underline"
                      >
                        {row.currentlyHiring}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Link
                        to={`/pmo/follow-ups?assignedTo=${row.teamMember.id}`}
                        className={`inline-block px-2 py-0.5 rounded font-bold hover:underline ${
                          row.followUps > 0 ? 'bg-amber-100 text-amber-800' : 'text-slate-400'
                        }`}
                      >
                        {row.followUps}
                      </Link>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden shrink-0">
                          <div
                            className={`h-full rounded-full ${
                              row.coverage >= 75
                                ? 'bg-emerald-500'
                                : row.coverage >= 40
                                ? 'bg-indigo-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, row.coverage)}%` }}
                          />
                        </div>
                        <span className="font-extrabold text-slate-900 min-w-[36px]">{row.coverage}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Visual Recharts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outreach Activity Over Time */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <span>Outreach Activity Timeline</span>
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {dateRange === '7d' ? 'Last 7 Days' : dateRange === '90d' ? 'Last 90 Days' : 'Last 30 Days'}
            </span>
          </h3>

          <div className="h-64 w-full">
            {charts?.outreachActivity && charts.outreachActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.outreachActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#64748b' }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="interactions" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorInteractions)" name="Outreach Calls/Touchpoints" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No interaction activity recorded in this period.</div>
            )}
          </div>
        </div>

        {/* Team Coverage Comparison */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <span>Team Member Coverage Ratios</span>
          </h3>

          <div className="h-64 w-full">
            {charts?.teamCoverage && charts.teamCoverage.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.teamCoverage} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Bar dataKey="coverage" fill="#10b981" radius={[4, 4, 0, 0]} name="Coverage %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No team coverage data available.</div>
            )}
          </div>
        </div>
      </div>

      {/* Hiring & Follow-up Summaries Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hiring Status Summary Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              <span>Hiring Requirements Breakdown</span>
            </span>
            <Link to="/pmo/opportunities" className="text-xs text-indigo-600 hover:underline font-semibold">View All</Link>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <Link to="/pmo/opportunities?hiringStatus=HIRING_NOW" className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors">
              <span className="text-emerald-800 font-semibold block">Hiring Now</span>
              <span className="text-2xl font-bold text-emerald-900 mt-1 block">{hiring.currentlyHiring || 0}</span>
            </Link>

            <Link to="/pmo/opportunities?hiringStatus=HIRING_PLANNED" className="p-3 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
              <span className="text-blue-800 font-semibold block">Planned</span>
              <span className="text-2xl font-bold text-blue-900 mt-1 block">{hiring.hiringPlanned || 0}</span>
            </Link>

            <Link to="/pmo/opportunities?hiringStatus=NOT_HIRING" className="p-3 bg-rose-50 rounded-lg border border-rose-200 hover:bg-rose-100 transition-colors">
              <span className="text-rose-800 font-semibold block">Not Hiring</span>
              <span className="text-2xl font-bold text-rose-900 mt-1 block">{hiring.notHiring || 0}</span>
            </Link>

            <Link to="/pmo/opportunities?hiringStatus=ON_HOLD" className="p-3 bg-amber-50 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors">
              <span className="text-amber-800 font-semibold block">On Hold</span>
              <span className="text-2xl font-bold text-amber-900 mt-1 block">{hiring.onHold || 0}</span>
            </Link>

            <Link to="/pmo/opportunities?hiringStatus=CLOSED" className="p-3 bg-slate-100 rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors">
              <span className="text-slate-700 font-semibold block">Closed</span>
              <span className="text-2xl font-bold text-slate-800 mt-1 block">{hiring.closed || 0}</span>
            </Link>

            <Link to="/pmo/opportunities?shortlisted=true" className="p-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors shadow-2xs">
              <span className="font-bold text-amber-100 block">Shortlisted ⭐</span>
              <span className="text-2xl font-extrabold mt-1 block">{hiring.shortlistedOpportunities || 0}</span>
            </Link>
          </div>
        </div>

        {/* Follow-Up Action Queue Summary */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span>Follow-Up Action Queue</span>
            </span>
            <Link to="/pmo/follow-ups" className="text-xs text-indigo-600 hover:underline font-semibold">Open Queue</Link>
          </h3>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <Link to="/pmo/follow-ups" className="p-4 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors text-center">
              <span className="text-rose-800 font-bold block">Overdue</span>
              <span className="text-3xl font-extrabold text-rose-900 mt-1 block">{followUps.overdue || 0}</span>
              <span className="text-[10px] text-rose-600 mt-1 block font-semibold">Immediate Action</span>
            </Link>

            <Link to="/pmo/follow-ups" className="p-4 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors text-center">
              <span className="text-amber-800 font-bold block">Today</span>
              <span className="text-3xl font-extrabold text-amber-900 mt-1 block">{followUps.today || 0}</span>
              <span className="text-[10px] text-amber-600 mt-1 block font-semibold">Due Today</span>
            </Link>

            <Link to="/pmo/follow-ups" className="p-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors text-center">
              <span className="text-blue-800 font-bold block">Upcoming</span>
              <span className="text-3xl font-extrabold text-blue-900 mt-1 block">{followUps.upcoming || 0}</span>
              <span className="text-[10px] text-blue-600 mt-1 block font-semibold">Scheduled Later</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          <span>Recent Organization Activity Timeline</span>
        </h3>

        {recentActivity.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">No activity logged in the organization yet.</div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((event) => (
              <div key={event.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start justify-between gap-3 text-xs hover:bg-slate-100/80 transition-colors">
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span>{event.title}</span>
                  </div>
                  <div
                    className="text-[11px] text-slate-600 mt-0.5"
                    dangerouslySetInnerHTML={{ __html: event.description }}
                  />
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 block">{new Date(event.timestamp).toLocaleDateString()}</span>
                  <Link to={event.link} className="text-[11px] font-semibold text-indigo-600 hover:underline">
                    View &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
