import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import superAdminService from '../../services/superAdmin.service';
import Badge from '../../components/common/Badge';
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
  Globe,
  Building2,
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
  RefreshCw,
  AlertCircle,
  Plus,
  Calendar,
  Briefcase,
  Star,
  PhoneCall,
  TrendingUp,
  ChevronRight,
  UserCheck,
  Layers,
} from 'lucide-react';

export default function SuperAdminHome() {
  const user = useSelector(selectCurrentUser);

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter
  const [dateRange, setDateRange] = useState('30d');

  const fetchGlobalData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminService.getGlobalDashboardAnalytics({ dateRange });
      if (res.success) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.error('Failed to load global platform dashboard data:', err);
      setError(err.response?.data?.error?.message || 'Failed to load platform analytics');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchGlobalData();
  }, [fetchGlobalData]);

  if (loading && !analytics) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <span className="text-sm font-semibold text-slate-700">Aggregating platform-wide multi-tenant analytics...</span>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="p-8 text-center text-rose-600 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <AlertCircle className="w-10 h-10 mx-auto" />
        <div className="font-bold text-base">{error}</div>
        <button
          onClick={fetchGlobalData}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 cursor-pointer transition-colors"
        >
          Retry Platform Dashboard
        </button>
      </div>
    );
  }

  const { organizations, users, companies, hiring, organizationPerformance, charts, recentActivity } = analytics || {
    organizations: {},
    users: {},
    companies: {},
    hiring: {},
    organizationPerformance: [],
    charts: {},
    recentActivity: [],
  };

  return (
    <div className="space-y-6">
      {/* Header Banner & Date Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Global Platform Governance Dashboard
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                SUPER ADMIN
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Cross-tenant visibility across educational institutions, company directories, outreach velocity, and hiring intake.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
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
            onClick={fetchGlobalData}
            disabled={loading}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors shadow-2xs cursor-pointer"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
          <Link
            to="/super-admin/organizations"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-2xs"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Manage Organizations</span>
          </Link>
        </div>
      </div>

      {/* Global KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Organizations KPI */}
        <Link
          to="/super-admin/organizations"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span className="font-bold uppercase tracking-wider">Organizations</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{organizations.totalOrganizations || 0}</div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <span>
              Active: <strong className="text-emerald-600">{organizations.activeOrganizations || 0}</strong>
            </span>
            <span>
              Inactive: <strong className="text-slate-500">{organizations.inactiveOrganizations || 0}</strong>
            </span>
          </div>
        </Link>

        {/* Platform Users KPI */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span className="font-bold uppercase tracking-wider">Platform Users</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{users.totalUsers || 0}</div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <span>PMOs: <strong className="text-purple-700">{users.totalPmos || 0}</strong></span>
            <span>Team Members: <strong className="text-indigo-700">{users.totalTeamMembers || 0}</strong></span>
          </div>
        </div>

        {/* Global Companies KPI */}
        <Link
          to="/super-admin/companies"
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span className="font-bold uppercase tracking-wider">Global Companies</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <PhoneCall className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-blue-700">{companies.totalCompanies || 0}</div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <span>Assigned: <strong className="text-indigo-600">{companies.assignedCompanies || 0}</strong></span>
            <span>Contacted: <strong className="text-emerald-600">{companies.contactedCompanies || 0}</strong></span>
          </div>
        </Link>

        {/* Platform Hiring & Shortlists */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="flex items-center gap-1.5 font-bold text-slate-700 text-xs">
              <Briefcase className="w-4 h-4 text-emerald-600" />
              <span>Hiring Now:</span>
            </span>
            <span className="text-lg font-extrabold text-emerald-600">{hiring.currentlyHiring || 0}</span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="flex items-center gap-1.5 font-bold text-slate-700 text-xs">
              <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
              <span>Shortlisted Roles:</span>
            </span>
            <span className="text-lg font-extrabold text-amber-600">{hiring.shortlistedOpportunities || 0}</span>
          </div>
        </div>
      </div>

      {/* Organization Performance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-600" />
              <span>Organization Performance & Resource Distribution</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparative breakdown of companies, outreach touchpoints, hiring requirements, and staff counts by institution.
            </p>
          </div>
          <Link
            to="/super-admin/organizations"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            <span>All Organizations</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {organizationPerformance.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No organizations enrolled in platform yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-5">Organization</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Companies</th>
                  <th className="py-3.5 px-4 text-center">Assigned</th>
                  <th className="py-3.5 px-4 text-center">Contacted</th>
                  <th className="py-3.5 px-4 text-center">Hiring Now</th>
                  <th className="py-3.5 px-4 text-center">Shortlisted</th>
                  <th className="py-3.5 px-5 text-right">Staff (PMO / Team)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {organizationPerformance.map((row) => (
                  <tr key={row.organization.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5">
                      <Link
                        to={`/super-admin/organizations/${row.organization.id}`}
                        className="font-bold text-slate-900 hover:text-indigo-600 block"
                      >
                        {row.organization.name}
                      </Link>
                      <div className="text-[11px] text-slate-500">Code: {row.organization.code}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant={row.status}>{row.status}</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">{row.companiesCount}</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-indigo-700">{row.assignedCompaniesCount}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-700">{row.contactedCompaniesCount}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-blue-700">{row.hiringCount}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-amber-600">{row.shortlistedCount}</td>
                    <td className="py-3.5 px-5 text-right font-medium text-slate-700">
                      {row.pmosCount} PMO / {row.teamMembersCount} Team
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Global Recharts Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Outreach Activity Over Time */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span>Platform-Wide Outreach Velocity</span>
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {dateRange === '7d' ? 'Last 7 Days' : dateRange === '90d' ? 'Last 90 Days' : 'Last 30 Days'}
            </span>
          </h3>

          <div className="h-64 w-full">
            {charts?.platformActivity && charts.platformActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.platformActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPlatformInteractions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#64748b' }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="interactions" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorPlatformInteractions)" name="Global Outreach Calls" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No interaction activity recorded across platform.</div>
            )}
          </div>
        </div>

        {/* Organizations by Company Count */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <span>Company Master Distribution by Organization</span>
          </h3>

          <div className="h-64 w-full">
            {charts?.organizationsByCompanyCount && charts.organizationsByCompanyCount.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.organizationsByCompanyCount} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="code" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="companies" fill="#6366f1" radius={[4, 4, 0, 0]} name="Total Companies" />
                  <Bar dataKey="contacted" fill="#10b981" radius={[4, 4, 0, 0]} name="Contacted" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No organization data available.</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-600" />
          <span>Global Platform Event Timeline</span>
        </h3>

        {recentActivity.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">No platform activity recorded yet.</div>
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
                  <Link to={event.link} className="text-[11px] font-semibold text-purple-700 hover:underline">
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
