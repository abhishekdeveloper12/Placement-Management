import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import interactionService from '../../services/interaction.service';
import {
  PhoneCall,
  Search,
  RefreshCw,
  Building2,
  User,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  FileText,
  Clock,
  Briefcase,
  AlertCircle,
  Eye,
  CheckCircle2,
  TrendingUp,
  MapPin,
  DollarSign,
  AlertTriangle,
  Award,
  Filter,
} from 'lucide-react';

export default function TeamMemberInteractionListPage() {
  // Stats & KPIs
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Listing Data & Pagination
  const [interactions, setInteractions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [interactionTypeFilter, setInteractionTypeFilter] = useState('');
  const [hiringStatusFilter, setHiringStatusFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('ALL');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail Modal
  const [selectedInteraction, setSelectedInteraction] = useState(null);

  // Fetch Stats
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await interactionService.getTeamMemberOutreachStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch outreach stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch Interactions
  const fetchInteractions = useCallback(
    async (page = pagination.page) => {
      setLoading(true);
      setError(null);
      try {
        let fromDate = null;
        let toDate = null;
        const now = new Date();

        if (dateRangeFilter === 'TODAY') {
          fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        } else if (dateRangeFilter === 'THIS_WEEK') {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
          const monday = new Date(now.setDate(diff));
          fromDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate()).toISOString();
        } else if (dateRangeFilter === 'THIS_MONTH') {
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        }

        const params = {
          page,
          limit: pagination.limit,
          interactionType: interactionTypeFilter || undefined,
          hiringStatus: hiringStatusFilter || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          search: search || undefined,
        };

        const res = await interactionService.getTeamMemberInteractions(params);
        if (res.success) {
          setInteractions(res.data);
          setPagination(res.meta || { page, limit: 10, total: res.data.length, totalPages: 1 });
        }
      } catch (err) {
        console.error('Failed to fetch interactions:', err);
        setError(err.response?.data?.error?.message || 'Failed to load outreach history');
      } finally {
        setLoading(false);
      }
    },
    [dateRangeFilter, hiringStatusFilter, interactionTypeFilter, pagination.limit, pagination.page, search]
  );

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchInteractions(1);
  }, [dateRangeFilter, hiringStatusFilter, interactionTypeFilter, search]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getHiringBadge = (status) => {
    switch (status) {
      case 'YES':
      case 'HIRING_NOW':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Hiring Now</span>;
      case 'HIRING_PLANNED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Hiring Planned</span>;
      case 'NOT_HIRING':
      case 'NO':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">Not Hiring</span>;
      case 'WAITING_FOR_JD':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">Waiting for JD</span>;
      case 'FOLLOW_UP_REQUIRED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Follow-Up Scheduled</span>;
      case 'NO_RESPONSE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">No Response</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">{status || 'Not Sure'}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <PhoneCall className="w-7 h-7 text-indigo-600" />
            My Outreach & Call History
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Complete record of your HR calls, recruiter touchpoints, and feedback submitted across your assigned companies.
          </p>
        </div>
        <Link
          to="/team-member/companies"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
        >
          <Building2 className="w-4 h-4" />
          <span>Call Assigned Company</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Coverage Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Outreach Coverage</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {statsLoading ? '...' : stats?.contactedCompanies ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              / {statsLoading ? '...' : stats?.assignedCompanies ?? 0} Companies Contacted
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

        {/* Calls & Feedback Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Calls & Feedback</span>
            <PhoneCall className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {statsLoading ? '...' : stats?.totalCalls ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">Calls Logged</span>
          </div>
          <div className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md font-medium border border-emerald-100">
            {statsLoading ? '...' : stats?.feedbackSubmitted ?? 0} Total Feedback Submissions
          </div>
        </div>

        {/* Follow-Ups Summary */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Follow-Up Queue</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-amber-600">
              {statsLoading ? '...' : stats?.followUpsDueToday ?? 0}
            </span>
            <span className="text-xs text-slate-600 font-semibold">Due Today</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span className="text-rose-600 font-semibold">{stats?.overdueFollowUps ?? 0} Overdue</span>
            <span className="text-slate-600 font-medium">{stats?.upcomingFollowUps ?? 0} Upcoming</span>
          </div>
        </div>

        {/* Quick Link Card */}
        <div className="bg-gradient-to-br from-indigo-950 to-slate-900 p-5 rounded-xl text-white shadow-2xs flex flex-col justify-between">
          <div>
            <div className="text-xs text-indigo-300 font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              <span>High-Velocity Logging</span>
            </div>
            <div className="text-sm font-bold mt-1">Keep Your HR Feedback Updated</div>
            <p className="text-[11px] text-slate-300 mt-1">
              Every submitted call automatically updates company records and informs PMO placement strategies.
            </p>
          </div>
          <Link
            to="/team-member/follow-ups"
            className="mt-3 text-xs font-semibold text-indigo-300 hover:text-white flex items-center gap-1"
          >
            <span>View Follow-Ups Queue &rarr;</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company, HR name, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Date Range */}
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-700"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
            </select>

            {/* Interaction Type */}
            <select
              value={interactionTypeFilter}
              onChange={(e) => setInteractionTypeFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-700"
            >
              <option value="">All Interaction Types</option>
              <option value="PHONE_CALL">Phone Call</option>
              <option value="EMAIL">Email</option>
              <option value="MEETING">Meeting</option>
            </select>

            {/* Hiring Status */}
            <select
              value={hiringStatusFilter}
              onChange={(e) => setHiringStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-700"
            >
              <option value="">All Hiring Statuses</option>
              <option value="YES">Hiring Now (Yes)</option>
              <option value="HIRING_PLANNED">Hiring Planned</option>
              <option value="NO">Not Hiring (No)</option>
              <option value="NOT_SURE">Not Sure</option>
            </select>

            {/* Refresh */}
            <button
              onClick={() => {
                fetchStats();
                fetchInteractions(pagination.page);
              }}
              className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Refresh logs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="text-sm">Loading outreach history...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <div className="font-semibold text-sm">{error}</div>
          </div>
        ) : interactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <PhoneCall className="w-12 h-12 mx-auto text-slate-300" />
            <div className="text-base font-semibold text-slate-700">No Outreach Logged Yet</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your calls and HR feedback will appear here after you contact your assigned companies.
            </p>
            <div className="pt-2">
              <Link
                to="/team-member/companies"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-2xs transition-colors"
              >
                <Building2 className="w-4 h-4" />
                <span>View My Assigned Companies</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Contacted Date</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">HR Contact</th>
                  <th className="py-3 px-4">Hiring Status</th>
                  <th className="py-3 px-4">Discussion Summary</th>
                  <th className="py-3 px-4">Follow-Up</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {interactions.map((item) => {
                  const companyObj = item.companyId || item.company || {};
                  const contactObj = item.contactId || item.contact || {};
                  const callDetails = item.callDetails || {};

                  return (
                    <tr key={item.id || item._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {formatDate(item.interactionDate || item.createdAt)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {companyObj.id || companyObj._id ? (
                          <Link
                            to={`/team-member/companies/${companyObj.id || companyObj._id}`}
                            className="hover:text-indigo-600 flex items-center gap-1.5"
                          >
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{companyObj.companyName || companyObj.name || 'Company'}</span>
                          </Link>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                        {companyObj.industry && (
                          <div className="text-[11px] text-slate-400 font-normal">{companyObj.industry}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {contactObj.name ? (
                          <div>
                            <div className="font-semibold text-slate-800">{contactObj.name}</div>
                            <div className="text-[11px] text-slate-500">
                              {contactObj.designation || contactObj.phone || 'HR'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">{getHiringBadge(callDetails.hiringStatus || item.outcome)}</td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-slate-700 line-clamp-2">
                          {item.notes || callDetails.hrResponse || 'No notes provided'}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.followUp ? (
                          <div className="flex items-center gap-1 text-[11px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>{formatDate(item.followUp.dueDate)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedInteraction(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded font-semibold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Feedback</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50 text-xs">
            <span className="text-slate-500">
              Showing page <span className="font-semibold text-slate-800">{pagination.page}</span> of{' '}
              <span className="font-semibold text-slate-800">{pagination.totalPages}</span> ({pagination.total} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchInteractions(pagination.page - 1)}
                className="p-1.5 border border-slate-300 rounded text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchInteractions(pagination.page + 1)}
                className="p-1.5 border border-slate-300 rounded text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Complete Feedback Modal */}
      {selectedInteraction && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Complete HR Call Feedback Details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Logged by {selectedInteraction.userId?.name || 'Team Member'} on{' '}
                  {formatDate(selectedInteraction.interactionDate || selectedInteraction.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedInteraction(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 text-xs max-h-[80vh] overflow-y-auto">
              {/* Section 1: Overview Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div className="text-slate-400 font-medium text-[11px]">Company</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {selectedInteraction.companyId?.companyName || selectedInteraction.company?.name || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium text-[11px]">Interaction Type</div>
                  <div className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1">
                    <PhoneCall className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{selectedInteraction.interactionType || 'PHONE_CALL'}</span>
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium text-[11px]">Hiring Status</div>
                  <div className="mt-1">
                    {getHiringBadge(selectedInteraction.callDetails?.hiringStatus || selectedInteraction.outcome)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium text-[11px]">Date & Time</div>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {formatDate(selectedInteraction.interactionDate || selectedInteraction.createdAt)}
                  </div>
                </div>
              </div>

              {/* Section 2: HR Contact Info */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 text-indigo-700">
                  <User className="w-4 h-4 text-indigo-600" />
                  HR Contact Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Name:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.contactId?.name || 'Not Specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Designation:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.contactId?.designation || 'HR'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Phone:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.contactId?.phone || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Email:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.contactId?.email || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">LinkedIn:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.contactId?.linkedin ? (
                        <a
                          href={selectedInteraction.contactId.linkedin}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline"
                        >
                          View Profile
                        </a>
                      ) : (
                        '—'
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Hiring Requirements */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 text-indigo-700">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  Hiring Requirements & Profiles
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Approx Openings:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {selectedInteraction.callDetails?.openings ?? 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Candidate Type:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.callDetails?.candidateType || 'BOTH'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Opportunity Type:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.callDetails?.opportunityType || 'FULL_TIME'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">PPO Availability:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.callDetails?.ppoAvailable || 'NOT_SURE'}
                    </span>
                  </div>
                </div>

                {/* Profiles / Roles */}
                <div>
                  <span className="text-slate-400 block text-[11px] mb-1">Target Job Roles / Profiles:</span>
                  {selectedInteraction.callDetails?.profiles && selectedInteraction.callDetails.profiles.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedInteraction.callDetails.profiles.map((role, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-xs font-medium"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">No specific profiles recorded</span>
                  )}
                </div>
              </div>

              {/* Section 4: Work Location & Package */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 text-indigo-700">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  Work Location & Compensation Details
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Work Mode:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.callDetails?.workMode || 'NOT_SPECIFIED'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Job Location:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.callDetails?.location || 'Not Specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Salary / Stipend:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.callDetails?.salaryOrStipend || 'Not Specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Bond / Service Agreement:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.callDetails?.bond || 'NOT_SURE'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 5: Discussion Notes & Specific Requirements */}
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">HR Conversation Summary & Notes</label>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {selectedInteraction.notes ||
                      selectedInteraction.callDetails?.hrResponse ||
                      'No detailed notes provided.'}
                  </div>
                </div>

                {selectedInteraction.callDetails?.specificRequirement && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Specific Candidate Requirements</label>
                    <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {selectedInteraction.callDetails.specificRequirement}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 6: Follow-Up Details */}
              {selectedInteraction.followUp ? (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold flex items-center gap-1.5 text-amber-900 text-xs">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>Scheduled Follow-Up Task</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-200 text-amber-900">
                      {selectedInteraction.followUp.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div>
                      <span className="text-amber-800 font-medium block">Due Date:</span>
                      <span className="font-bold text-amber-950">
                        {formatDate(selectedInteraction.followUp.dueDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-amber-800 font-medium block">Reason / Task Notes:</span>
                      <span className="text-amber-900">{selectedInteraction.followUp.reason}</span>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <Link
                      to="/team-member/follow-ups"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900 hover:text-amber-950 underline"
                    >
                      <span>Open Follow-Up Manager &rarr;</span>
                    </Link>
                  </div>
                </div>
              ) : selectedInteraction.nextAction === 'FOLLOW_UP' ? (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-900">
                  <div className="font-semibold">Follow-Up Requested</div>
                  <div className="text-[11px] text-amber-800 mt-0.5">
                    Follow-up date: {formatDate(selectedInteraction.followUpDate)}
                  </div>
                </div>
              ) : null}

              {/* Modal Footer */}
              <div className="pt-3 flex justify-end border-t border-slate-100">
                <button
                  onClick={() => setSelectedInteraction(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold cursor-pointer transition-colors"
                >
                  Close Feedback Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
