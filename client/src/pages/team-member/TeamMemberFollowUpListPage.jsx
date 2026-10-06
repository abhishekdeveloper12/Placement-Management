import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import followUpService from '../../services/followUp.service';
import assignmentService from '../../services/assignment.service';
import Badge from '../../components/common/Badge';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Building2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  MessageSquare,
  AlertCircle,
  CheckSquare,
} from 'lucide-react';

export default function TeamMemberFollowUpListPage() {
  const [followUps, setFollowUps] = useState([]);
  const [stats, setStats] = useState({ totalPending: 0, totalOverdue: 0, totalCompleted: 0, totalDueToday: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filters
  const [statusTab, setStatusTab] = useState('PENDING'); // PENDING | OVERDUE | TODAY | UPCOMING | COMPLETED | CANCELLED | ALL
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [assignedCompanies, setAssignedCompanies] = useState([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    companyId: '',
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
  });

  const [completeTarget, setCompleteTarget] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [cancelTarget, setCancelTarget] = useState(null);

  // Fetch Stats
  const fetchStats = async () => {
    try {
      const res = await followUpService.getTeamMemberFollowUpStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch follow-up stats:', err);
    }
  };

  // Fetch Follow-Ups
  const fetchFollowUps = useCallback(
    async (page = pagination.page) => {
      setLoading(true);
      setError(null);
      try {
        const params = {
          page,
          limit: pagination.limit,
          priority: priorityFilter || undefined,
          search: search || undefined,
        };

        if (statusTab === 'OVERDUE') {
          params.overdue = 'true';
        } else if (statusTab === 'TODAY') {
          params.dueToday = 'true';
        } else if (statusTab === 'UPCOMING') {
          params.status = 'PENDING';
          params.upcoming = 'true';
        } else if (statusTab !== 'ALL') {
          params.status = statusTab;
        }

        const res = await followUpService.getTeamMemberFollowUps(params);
        if (res.success) {
          setFollowUps(res.data);
          setPagination(res.meta || { page, limit: 10, total: res.data.length, totalPages: 1 });
        }
      } catch (err) {
        console.error('Failed to fetch follow-ups:', err);
        setError(err.response?.data?.error?.message || 'Failed to load follow-up tasks');
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, pagination.page, priorityFilter, search, statusTab]
  );

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchFollowUps(1);
  }, [statusTab, priorityFilter, search]);

  // Load companies for manual creation dropdown
  const handleOpenCreateModal = async () => {
    setIsCreateOpen(true);
    setCreateForm({
      companyId: '',
      title: '',
      description: '',
      priority: 'MEDIUM',
      dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 16), // Default tomorrow
    });
    try {
      const res = await assignmentService.getTeamMemberAssignedCompanies({ limit: 100 });
      if (res.success) {
        setAssignedCompanies(res.data);
        if (res.data.length > 0) {
          setCreateForm((prev) => ({ ...prev, companyId: res.data[0]._id }));
        }
      }
    } catch (err) {
      console.error('Failed to load companies for dropdown:', err);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.companyId || !createForm.title || !createForm.dueDate) {
      alert('Please fill in Company, Title, and Due Date');
      return;
    }
    setCreateLoading(true);
    try {
      const res = await followUpService.createFollowUp(createForm);
      if (res.success) {
        setSuccessMsg('Follow-up task created successfully');
        setIsCreateOpen(false);
        fetchStats();
        fetchFollowUps(1);
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to create follow-up');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    if (!completeTarget) return;
    setActionLoading(true);
    try {
      const res = await followUpService.completeFollowUp(completeTarget._id, { completionNotes });
      if (res.success) {
        setSuccessMsg('Follow-up marked as completed');
        setCompleteTarget(null);
        setCompletionNotes('');
        fetchStats();
        fetchFollowUps(pagination.page);
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to complete follow-up');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelTarget) return;
    setActionLoading(true);
    try {
      const res = await followUpService.cancelFollowUp(cancelTarget._id);
      if (res.success) {
        setSuccessMsg('Follow-up task cancelled');
        setCancelTarget(null);
        fetchStats();
        fetchFollowUps(pagination.page);
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to cancel follow-up');
    } finally {
      setActionLoading(false);
    }
  };

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

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'URGENT':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">URGENT</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">MEDIUM</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">LOW</span>;
      default:
        return priority;
    }
  };

  const getStatusBadge = (item) => {
    if (item.status === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Completed
        </span>
      );
    }
    if (item.status === 'CANCELLED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          <XCircle className="w-3 h-3 text-slate-400" />
          Cancelled
        </span>
      );
    }
    if (item.isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          OVERDUE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3 h-3 text-amber-500" />
        Pending
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-7 h-7 text-indigo-600" />
            My Follow-Up Tasks
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage scheduled follow-up actions and reminders for your assigned companies.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-2xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Follow-Up Task</span>
        </button>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-4 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Operational Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Pending Tasks</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats.totalPending}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-rose-700 text-xs font-medium">
            <span>Overdue Tasks</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-2">{stats.totalOverdue}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-2xs">
          <div className="flex items-center justify-between text-blue-700 text-xs font-medium">
            <span>Due Today</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-700 mt-2">{stats.totalDueToday}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats.totalCompleted}</div>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          {[
            { key: 'PENDING', label: 'Pending' },
            { key: 'OVERDUE', label: `Overdue (${stats.totalOverdue})`, isAlert: stats.totalOverdue > 0 },
            { key: 'TODAY', label: 'Due Today' },
            { key: 'UPCOMING', label: 'Upcoming' },
            { key: 'COMPLETED', label: 'Completed' },
            { key: 'CANCELLED', label: 'Cancelled' },
            { key: 'ALL', label: 'All Tasks' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                statusTab === tab.key
                  ? tab.isAlert
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-indigo-600 text-white shadow-2xs'
                  : tab.isAlert
                  ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Inputs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search title, description, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full sm:w-44 px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <button
              onClick={() => {
                fetchStats();
                fetchFollowUps(pagination.page);
              }}
              className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Refresh task list"
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
            <span className="text-sm">Loading follow-up tasks...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <div className="font-semibold text-sm">{error}</div>
          </div>
        ) : followUps.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <CheckSquare className="w-10 h-10 mx-auto text-slate-300" />
            <div className="text-base font-semibold text-slate-700">No Follow-Up Tasks Found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are no tasks matching your current filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Task Details</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {followUps.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-[200px]">
                      {item.company ? (
                        <Link
                          to={`/team-member/companies/${item.company._id}`}
                          className="hover:text-indigo-600 flex items-center gap-1.5 truncate"
                        >
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{item.company.name}</span>
                        </Link>
                      ) : (
                        <span className="text-slate-400">Unassigned Company</span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-bold text-slate-900">{item.title}</div>
                      {item.description && (
                        <div className="text-slate-500 text-[11px] truncate mt-0.5">{item.description}</div>
                      )}
                      {item.completionNotes && (
                        <div className="mt-1 text-[11px] bg-emerald-50 text-emerald-800 p-1.5 rounded border border-emerald-100">
                          <span className="font-semibold">Note:</span> {item.completionNotes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">{getPriorityBadge(item.priority)}</td>
                    <td className="py-3 px-4">
                      <div className={`font-semibold ${item.isOverdue ? 'text-rose-700' : 'text-slate-700'}`}>
                        {formatDate(item.dueDate)}
                      </div>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(item)}</td>
                    <td className="py-3 px-4 text-right">
                      {item.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setCompleteTarget(item)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Mark Done
                          </button>
                          <button
                            onClick={() => setCancelTarget(item)}
                            className="px-2 py-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded text-[11px] transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-mono">No action</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50 text-xs">
            <span className="text-slate-500">
              Showing page <span className="font-semibold text-slate-800">{pagination.page}</span> of{' '}
              <span className="font-semibold text-slate-800">{pagination.totalPages}</span> ({pagination.total} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchFollowUps(pagination.page - 1)}
                className="p-1.5 border border-slate-300 rounded text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchFollowUps(pagination.page + 1)}
                className="p-1.5 border border-slate-300 rounded text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create Manual Follow-up */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Schedule New Follow-Up
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company *</label>
                <select
                  required
                  value={createForm.companyId}
                  onChange={(e) => setCreateForm({ ...createForm, companyId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900"
                >
                  <option value="">Select Company...</option>
                  {assignedCompanies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.industry || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Send follow-up email regarding JD discussion"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={createForm.dueDate}
                    onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Optional details or context for this follow-up task..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-2xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {createLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Schedule Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Complete Follow-up */}
      {completeTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/50">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Complete Follow-Up Task
              </h3>
              <button
                onClick={() => setCompleteTarget(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCompleteSubmit} className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-900">{completeTarget.title}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">{completeTarget.company?.name}</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Completion Notes (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Record summary of outcome or notes from this completed task..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCompleteTarget(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-2xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Mark as Completed</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Cancel */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-slate-900 text-base">Cancel Follow-Up Task?</h3>
            </div>
            <p className="text-slate-600 text-xs">
              Are you sure you want to cancel the task <strong className="text-slate-800">"{cancelTarget.title}"</strong> for{' '}
              {cancelTarget.company?.name}?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold text-xs cursor-pointer"
              >
                No, Keep Active
              </button>
              <button
                type="button"
                onClick={handleCancelSubmit}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Yes, Cancel Task</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
