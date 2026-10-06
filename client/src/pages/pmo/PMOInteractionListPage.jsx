import React, { useState, useEffect, useCallback } from 'react';
import interactionService from '../../services/interaction.service';
import pmoService from '../../services/pmo.service';
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
  Shield,
  CheckCircle2,
} from 'lucide-react';

export default function PMOInteractionListPage() {
  const [interactions, setInteractions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filters
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [search, setSearch] = useState('');

  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail Modal
  const [selectedInteraction, setSelectedInteraction] = useState(null);

  // Load team members for filter dropdown
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

  const fetchInteractions = useCallback(
    async (page = pagination.page) => {
      setLoading(true);
      setError(null);
      try {
        const params = {
          page,
          limit: pagination.limit,
          assignedTo: assignedToFilter || undefined,
          outcome: outcomeFilter || undefined,
          search: search || undefined,
        };

        const res = await interactionService.getPMOInteractions(params);
        if (res.success) {
          setInteractions(res.data);
          setPagination(res.meta || { page, limit: 10, total: res.data.length, totalPages: 1 });
        }
      } catch (err) {
        console.error('Failed to fetch PMO interactions:', err);
        setError(err.response?.data?.error?.message || 'Failed to load organization interactions log');
      } finally {
        setLoading(false);
      }
    },
    [assignedToFilter, outcomeFilter, pagination.limit, pagination.page, search]
  );

  useEffect(() => {
    fetchInteractions(1);
  }, [assignedToFilter, outcomeFilter, search]);

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

  const getOutcomeBadge = (outcome) => {
    switch (outcome) {
      case 'JOB_RECEIVED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">Job Opportunity Received</span>;
      case 'CONNECTED_POSITIVE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Connected (Positive)</span>;
      case 'FOLLOW_UP_REQUIRED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Follow-Up Required</span>;
      case 'CONNECTED_NEUTRAL':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Connected (Neutral)</span>;
      case 'CONNECTED_NEGATIVE':
      case 'NOT_INTERESTED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Not Interested / Negative</span>;
      case 'NO_ANSWER':
      case 'BUSY':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">No Answer / Busy</span>;
      case 'WRONG_NUMBER':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">Wrong Number</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">{outcome}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-indigo-600" />
            Organization Interaction Audit Log
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Complete organization-wide history of outreach calls, meetings, and company communications logged by team members.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search company, contact, notes..."
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
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            <option value="">All Call Outcomes</option>
            <option value="JOB_RECEIVED">Job Received</option>
            <option value="CONNECTED_POSITIVE">Connected (Positive)</option>
            <option value="FOLLOW_UP_REQUIRED">Follow-Up Required</option>
            <option value="CONNECTED_NEUTRAL">Connected (Neutral)</option>
            <option value="CONNECTED_NEGATIVE">Connected (Negative)</option>
            <option value="NOT_INTERESTED">Not Interested</option>
            <option value="NO_ANSWER">No Answer</option>
            <option value="BUSY">Busy</option>
          </select>

          <button
            onClick={() => fetchInteractions(pagination.page)}
            className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="text-sm">Loading interaction logs...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <div className="font-semibold text-sm">{error}</div>
          </div>
        ) : interactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <PhoneCall className="w-10 h-10 mx-auto text-slate-300" />
            <div className="text-base font-semibold text-slate-700">No Organization Interactions Found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No outreach records match your active search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Logged By</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4">Summary</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {interactions.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                      {formatDate(item.createdAt || item.date)}
                    </td>
                    <td className="py-3 px-4">
                      {item.loggedBy ? (
                        <div>
                          <div className="font-semibold text-slate-900">{item.loggedBy.name}</div>
                          <div className="text-[11px] text-slate-500">{item.loggedBy.email}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {item.company ? (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.company.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.contact ? (
                        <div>
                          <div className="font-semibold text-slate-800">{item.contact.name}</div>
                          <div className="text-[11px] text-slate-500">{item.contact.designation || item.contact.phone}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">{getOutcomeBadge(item.outcome)}</td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="text-slate-700 line-clamp-2">{item.summary || item.notes || 'No notes provided'}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedInteraction(item)}
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

      {/* Detail Modal */}
      {selectedInteraction && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Organization Interaction Detail
              </h3>
              <button
                onClick={() => setSelectedInteraction(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <div className="text-slate-400 font-medium text-[11px]">Logged By</div>
                  <div className="font-bold text-slate-900 mt-0.5">{selectedInteraction.loggedBy?.name || 'N/A'}</div>
                  <div className="text-[11px] text-slate-500">{selectedInteraction.loggedBy?.email}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium text-[11px]">Company</div>
                  <div className="font-bold text-slate-900 mt-0.5">{selectedInteraction.company?.name || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium text-[11px]">Contact Person</div>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {selectedInteraction.contact?.name || 'N/A'} ({selectedInteraction.contact?.designation || 'HR'})
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium text-[11px]">Date & Outcome</div>
                  <div className="font-semibold text-slate-800 mt-0.5 mb-1">
                    {formatDate(selectedInteraction.createdAt || selectedInteraction.date)}
                  </div>
                  {getOutcomeBadge(selectedInteraction.outcome)}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Discussion Summary / Notes</label>
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {selectedInteraction.summary || selectedInteraction.notes || 'No detailed notes provided.'}
                </div>
              </div>

              {selectedInteraction.followUpTask && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-900 space-y-1">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Associated Follow-Up Task</span>
                  </div>
                  <div className="text-[11px]">
                    <strong>Task:</strong> {selectedInteraction.followUpTask.title}
                  </div>
                  <div className="text-[11px]">
                    <strong>Due:</strong> {formatDate(selectedInteraction.followUpTask.dueDate)}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end border-t border-slate-100">
                <button
                  onClick={() => setSelectedInteraction(null)}
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
