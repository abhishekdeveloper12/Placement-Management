import React, { useState, useEffect, useCallback } from 'react';
import followUpService from '../../services/followUp.service';
import pmoService from '../../services/pmo.service';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Search,
  RefreshCw,
  Building2,
  User,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  FileText,
  AlertCircle,
  Eye,
  CheckSquare,
  Shield,
} from 'lucide-react';

export default function PMOFollowUpListPage() {
  const [followUps, setFollowUps] = useState([]);
  const [stats, setStats] = useState({ totalPending: 0, totalOverdue: 0, totalCompleted: 0, totalDueToday: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filters
  const [statusTab, setStatusTab] = useState('ALL');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');

  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail Modal
  const [selectedTask, setSelectedTask] = useState(null);

  // Fetch Team Members for dropdown filter
  useEffect(() => {
    async function loadTeamMembers() {
      try {
        const res = await pmoService.getTeamMembers({ limit: 100 });
        if (res.success) {
          setTeamMembers(res.data);
        }
      } catch (err) {
        console.error('Failed to load team members:', err);
      }
    }
    loadTeamMembers();
  }, []);

  // Fetch Stats
  const fetchStats = async () => {
    try {
      const res = await followUpService.getPMOFollowUpStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch PMO follow-up stats:', err);
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
          assignedTo: assignedToFilter || undefined,
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

        const res = await followUpService.getPMOFollowUps(params);
        if (res.success) {
          setFollowUps(res.data);
          setPagination(res.meta || { page, limit: 10, total: res.data.length, totalPages: 1 });
        }
      } catch (err) {
        console.error('Failed to fetch PMO follow-ups:', err);
        setError(err.response?.data?.error?.message || 'Failed to load organization follow-up tasks');
      } finally {
        setLoading(false);
      }
    },
    [assignedToFilter, pagination.limit, pagination.page, priorityFilter, search, statusTab]
  );

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchFollowUps(1);
  }, [statusTab, assignedToFilter, priorityFilter, search]);

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
            <Shield className="w-7 h-7 text-indigo-600" />
            Organization Follow-Up Monitoring
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            PMO oversight of scheduled follow-ups, overdue tasks, and operational compliance across the entire team.
          </p>
        </div>
      </div>

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
            <span>Completed Tasks</span>
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
            { key: 'ALL', label: 'All Tasks' },
            { key: 'PENDING', label: 'Pending' },
            { key: 'OVERDUE', label: `Overdue (${stats.totalOverdue})`, isAlert: stats.totalOverdue > 0 },
            { key: 'TODAY', label: 'Due Today' },
            { key: 'COMPLETED', label: 'Completed' },
            { key: 'CANCELLED', label: 'Cancelled' },
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
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search company, title, team member..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={assignedToFilter}
              onChange={(e) => setAssignedToFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="">All Team Members</option>
              {teamMembers.map((tm) => (
                <option key={tm._id} value={tm._id}>
                  {tm.name} ({tm.email})
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
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
              title="Refresh"
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
            <span className="text-sm">Loading tasks...</span>
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
              No follow-up records match your active search and filter settings.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Assigned Team Member</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Task Details</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {followUps.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      {item.assignedTo ? (
                        <div>
                          <div className="font-semibold text-slate-900">{item.assignedTo.name}</div>
                          <div className="text-[11px] text-slate-500">{item.assignedTo.email}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-[180px]">
                      {item.company ? (
                        <div className="flex items-center gap-1.5 truncate">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{item.company.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-bold text-slate-900">{item.title}</div>
                      {item.description && (
                        <div className="text-slate-500 text-[11px] truncate mt-0.5">{item.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">{getPriorityBadge(item.priority)}</td>
                    <td className="py-3 px-4 font-semibold whitespace-nowrap">
                      <span className={item.isOverdue ? 'text-rose-700 font-bold' : 'text-slate-700'}>
                        {formatDate(item.dueDate)}
                      </span>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(item)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedTask(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded font-semibold transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
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
                onClick={() => fetchFollowUps(pagination.page - 1)}
                className="p-1.5 border border-slate-300 rounded text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchFollowUps(pagination.page + 1)}
                className="p-1.5 border border-slate-300 rounded text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Follow-Up Task Oversight Detail
              </h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <div className="text-slate-400 font-medium text-[11px]">Assigned Team Member</div>
                  <div className="font-bold text-slate-900 mt-0.5">{selectedTask.assignedTo?.name || 'N/A'}</div>
                  <div className="text-[11px] text-slate-500">{selectedTask.assignedTo?.email}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium text-[11px]">Target Company</div>
                  <div className="font-bold text-slate-900 mt-0.5">{selectedTask.company?.name || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium text-[11px]">Due Date</div>
                  <div className={`font-semibold mt-0.5 ${selectedTask.isOverdue ? 'text-rose-700 font-bold' : 'text-slate-800'}`}>
                    {formatDate(selectedTask.dueDate)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium text-[11px]">Current Status & Priority</div>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(selectedTask)}
                    {getPriorityBadge(selectedTask.priority)}
                  </div>
                </div>
              </div>

              <div>
                <div className="font-bold text-slate-900 text-sm">{selectedTask.title}</div>
                {selectedTask.description && (
                  <p className="text-slate-600 mt-1 bg-white p-3 rounded border border-slate-200 leading-relaxed">
                    {selectedTask.description}
                  </p>
                )}
              </div>

              {selectedTask.completionNotes && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-emerald-900 space-y-1">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Completion Notes</span>
                  </div>
                  <p className="text-xs leading-relaxed">{selectedTask.completionNotes}</p>
                  {selectedTask.completedAt && (
                    <div className="text-[11px] text-emerald-700">Completed at: {formatDate(selectedTask.completedAt)}</div>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end border-t border-slate-100">
                <button
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
