import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  Shield,
  Activity,
  Calendar,
  Building2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  User,
} from 'lucide-react';
import auditLogService from '../../services/auditLog.service';
import superAdminService from '../../services/superAdmin.service';
import AuditLogDetailModal from './AuditLogDetailModal';

export default function AuditLogView({ isSuperAdmin = false }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    entityType: '',
    action: '',
    startDate: '',
    endDate: '',
    organizationId: '',
  });

  // Detail Modal state
  const [selectedLog, setSelectedLog] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch organizations list for Super Admin filter dropdown
  useEffect(() => {
    if (isSuperAdmin) {
      superAdminService
        .getOrganizations({ limit: 100 })
        .then((res) => {
          if (res?.data) {
            setOrganizations(res.data);
          }
        })
        .catch((err) => console.error('Failed to load organizations for audit filter:', err));
    }
  }, [isSuperAdmin]);

  // Main data fetching callback
  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.search && { search: filters.search }),
        ...(filters.entityType && { entityType: filters.entityType }),
        ...(filters.action && { action: filters.action }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(isSuperAdmin && filters.organizationId && { organizationId: filters.organizationId }),
      };

      const res = await auditLogService.getAuditLogs(params);
      if (res?.data) {
        setAuditLogs(res.data);
        if (res.meta) {
          setPagination((prev) => ({
            ...prev,
            total: res.meta.total || 0,
            totalPages: res.meta.totalPages || 1,
          }));
        }
      }
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters, isSuperAdmin]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Handle Filter Changes
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      entityType: '',
      action: '',
      startDate: '',
      endDate: '',
      organizationId: '',
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Open detail view
  const handleViewDetail = (log) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const getActionBadgeClass = (action) => {
    if (!action) return 'bg-slate-100 text-slate-700 border-slate-200';
    const act = action.toUpperCase();

    if (act.includes('CREATE') || act.includes('SHORTLIST') || act.includes('COMPLETED')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('UPDATE') || act.includes('ASSIGN')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (act.includes('STATUS') || act.includes('REPLACE')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (act.includes('DELETE') || act.includes('CANCEL') || act.includes('UNSHORTLIST')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-purple-50 text-purple-700 border-purple-200';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            Security & System Activity Management
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isSuperAdmin ? 'Platform-Wide System Audit Trail' : 'Institutional Audit Log'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isSuperAdmin
              ? 'Global immutable trace of platform modifications, administrative actions, and entity mutations across all tenant institutions.'
              : 'Chronological audit trail of operational actions, status mutations, and administrative changes within your organization.'}
          </p>
        </div>

        <button
          onClick={fetchAuditLogs}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Audit Trail
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search action, actor, entity..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Entity Type Filter */}
          <div>
            <select
              value={filters.entityType}
              onChange={(e) => handleFilterChange('entityType', e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
            >
              <option value="">All Entity Types</option>
              <option value="Organization">Organization</option>
              <option value="User">User / PMO / Member</option>
              <option value="Company">Company Master</option>
              <option value="Assignment">Company Assignment</option>
              <option value="Interaction">HR Call Interaction</option>
              <option value="FollowUp">Follow-Up Task</option>
              <option value="JobOpportunity">Job Opportunity</option>
              <option value="Document">JD / Document</option>
            </select>
          </div>

          {/* Super Admin Organization Filter */}
          {isSuperAdmin && (
            <div>
              <select
                value={filters.organizationId}
                onChange={(e) => handleFilterChange('organizationId', e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
              >
                <option value="">All Organizations (Global)</option>
                <option value="global">Platform Global Only (No Org)</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range - Start Date */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">From:</span>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Second Row Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">To:</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{auditLogs.length}</span> of{' '}
            <span className="font-bold text-slate-800">{pagination.total}</span> records
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
            <p className="text-xs font-medium">Loading system audit records...</p>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Activity className="w-8 h-8 mx-auto text-slate-300" />
            <h3 className="text-sm font-bold text-slate-700">No Audit Records Found</h3>
            <p className="text-xs max-w-sm mx-auto text-slate-500">
              No system mutations or audit log entries match your active filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Entity</th>
                  {isSuperAdmin && <th className="py-3 px-4">Organization</th>}
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-900 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(log.timestamp).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400 ml-5">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </td>

                    {/* Actor */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs border border-slate-200">
                          {log.performedBy?.name ? log.performedBy.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{log.performedBy?.name || 'System'}</div>
                          <div className="text-[10px] text-slate-500">{log.performedBy?.email || 'N/A'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getActionBadgeClass(log.action)}`}>
                        {log.action}
                      </span>
                    </td>

                    {/* Entity */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{log.entityType || log.entity}</div>
                      {log.entityId && (
                        <div className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">
                          ID: {log.entityId}
                        </div>
                      )}
                    </td>

                    {/* Organization (Super Admin View) */}
                    {isSuperAdmin && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.organizationId ? (
                          <div>
                            <div className="font-semibold text-slate-800">{log.organizationId.name}</div>
                            <div className="text-[10px] font-mono text-slate-400">{log.organizationId.code}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Global Platform</span>
                        )}
                      </td>
                    )}

                    {/* Details Action */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleViewDetail(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Per Page:</span>
            <select
              value={pagination.limit}
              onChange={(e) => {
                setPagination((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }));
              }}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:outline-hidden"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span>
              Page <span className="font-bold text-slate-800">{pagination.page}</span> of{' '}
              <span className="font-bold text-slate-800">{pagination.totalPages}</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                className="p-1 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                className="p-1 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Detail Modal */}
      <AuditLogDetailModal
        log={selectedLog}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
