import React, { useState, useEffect, useCallback } from 'react';
import dataManagementService from '../../services/dataManagement.service';
import {
  Database,
  ShieldAlert,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Building2,
  Users,
  Briefcase,
  PhoneCall,
  CheckSquare,
  FileText,
  Filter,
  Search,
  ShieldCheck,
} from 'lucide-react';

export default function DataManagementPage() {
  const [summary, setSummary] = useState(null);
  const [testRecords, setTestRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState('ALL'); // 'ALL' or 'SELECTED'
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dataManagementService.getSummary();
      if (res.success) {
        setSummary(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data summary');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTestRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const res = await dataManagementService.getTestData({
        entityType: activeTab,
        search: searchTerm,
        limit: 50,
      });
      if (res.success) {
        setTestRecords(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load test records:', err);
    } finally {
      setRecordsLoading(false);
    }
  }, [activeTab, searchTerm]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchTestRecords();
  }, [fetchTestRecords]);

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(testRecords.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const openDeleteModal = (mode) => {
    setDeleteMode(mode);
    setConfirmInput('');
    setShowConfirmModal(true);
  };

  const handleExecuteDelete = async () => {
    if (confirmInput.trim() !== 'DELETE TEST DATA') return;

    setIsDeleting(true);
    setActionSuccess(null);
    setError(null);

    try {
      const payload =
        deleteMode === 'ALL'
          ? { target: 'ALL' }
          : { target: 'SELECTED', entityType: activeTab, ids: selectedIds };

      const res = await dataManagementService.deleteTestData(payload);

      if (res.success) {
        setActionSuccess(res.message || 'Test data deleted successfully');
        setShowConfirmModal(false);
        setSelectedIds([]);
        fetchSummary();
        fetchTestRecords();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete test data');
      setShowConfirmModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const calculateTotalTestItems = () => {
    if (!summary?.testData) return 0;
    return Object.values(summary.testData).reduce((a, b) => a + b, 0);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Data Management & Test Data Safety
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Explicitly manage test data. Production operational data is protected by the database-level <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-700 font-semibold text-xs">isTestData</code> marker.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchSummary();
              fetchTestRecords();
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {calculateTotalTestItems() > 0 && (
            <button
              onClick={() => openDeleteModal('ALL')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Delete All Test Data
            </button>
          )}
        </div>
      </div>

      {/* Safety Directive Callout */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <span className="font-bold text-amber-950">Safety Protection Guarantee:</span> Deleting test data strictly targets records with <code className="bg-amber-100 px-1 font-mono font-bold">isTestData = true</code>. Real production records created through normal application workflows default to <code className="bg-amber-100 px-1 font-mono font-bold">isTestData = false</code> and can NEVER be deleted by test data cleanup operations.
        </div>
      </div>

      {/* Success Banner */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs font-semibold text-emerald-900">{actionSuccess}</div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="text-xs font-semibold text-rose-900">{error}</div>
        </div>
      )}

      {/* Real Data vs Test Data Comparative Summary */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Computing database metrics across entities...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Real Operational Data Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-emerald-50/60 border-b border-emerald-100 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-emerald-950">Real Operational Data</h2>
              </div>
              <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Protected (isTestData = false)
              </span>
            </div>

            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
                  <Building2 className="w-3.5 h-3.5" /> Orgs
                </div>
                <div className="text-xl font-bold text-slate-900">{summary?.realData?.organizations ?? 0}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
                  <Users className="w-3.5 h-3.5" /> Users
                </div>
                <div className="text-xl font-bold text-slate-900">{summary?.realData?.users ?? 0}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-500" /> Companies
                </div>
                <div className="text-xl font-bold text-slate-900">{summary?.realData?.companies ?? 0}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
                  <PhoneCall className="w-3.5 h-3.5 text-blue-500" /> Calls
                </div>
                <div className="text-xl font-bold text-slate-900">{summary?.realData?.interactions ?? 0}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
                  <CheckSquare className="w-3.5 h-3.5 text-amber-500" /> Follow-ups
                </div>
                <div className="text-xl font-bold text-slate-900">{summary?.realData?.followUps ?? 0}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-500" /> Jobs
                </div>
                <div className="text-xl font-bold text-slate-900">{summary?.realData?.opportunities ?? 0}</div>
              </div>
            </div>
          </div>

          {/* Test / Demo Data Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-purple-50/60 border-b border-purple-100 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-purple-600" />
                <h2 className="text-sm font-bold text-purple-950">Test / Demo Data</h2>
              </div>
              <span className="text-[11px] font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                Cleanable (isTestData = true)
              </span>
            </div>

            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-purple-50/30 p-3 rounded-lg border border-purple-100/60">
                <div className="flex items-center gap-1.5 text-purple-700 text-xs font-medium mb-1">
                  <Building2 className="w-3.5 h-3.5" /> Test Orgs
                </div>
                <div className="text-xl font-bold text-purple-950">{summary?.testData?.organizations ?? 0}</div>
              </div>

              <div className="bg-purple-50/30 p-3 rounded-lg border border-purple-100/60">
                <div className="flex items-center gap-1.5 text-purple-700 text-xs font-medium mb-1">
                  <Users className="w-3.5 h-3.5" /> Test Users
                </div>
                <div className="text-xl font-bold text-purple-950">{summary?.testData?.users ?? 0}</div>
              </div>

              <div className="bg-purple-50/30 p-3 rounded-lg border border-purple-100/60">
                <div className="flex items-center gap-1.5 text-purple-700 text-xs font-medium mb-1">
                  <Building2 className="w-3.5 h-3.5" /> Test Comps
                </div>
                <div className="text-xl font-bold text-purple-950">{summary?.testData?.companies ?? 0}</div>
              </div>

              <div className="bg-purple-50/30 p-3 rounded-lg border border-purple-100/60">
                <div className="flex items-center gap-1.5 text-purple-700 text-xs font-medium mb-1">
                  <PhoneCall className="w-3.5 h-3.5" /> Test Calls
                </div>
                <div className="text-xl font-bold text-purple-950">{summary?.testData?.interactions ?? 0}</div>
              </div>

              <div className="bg-purple-50/30 p-3 rounded-lg border border-purple-100/60">
                <div className="flex items-center gap-1.5 text-purple-700 text-xs font-medium mb-1">
                  <CheckSquare className="w-3.5 h-3.5" /> Test Tasks
                </div>
                <div className="text-xl font-bold text-purple-950">{summary?.testData?.followUps ?? 0}</div>
              </div>

              <div className="bg-purple-50/30 p-3 rounded-lg border border-purple-100/60">
                <div className="flex items-center gap-1.5 text-purple-700 text-xs font-medium mb-1">
                  <Briefcase className="w-3.5 h-3.5" /> Test Jobs
                </div>
                <div className="text-xl font-bold text-purple-950">{summary?.testData?.opportunities ?? 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Data Record Inspector & Granular Deletion Controls */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Test Data Explorer</h3>
            <p className="text-xs text-slate-500">Inspect individual records marked as test data</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search test items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 w-48"
              />
            </div>

            {selectedIds.length > 0 && (
              <button
                onClick={() => openDeleteModal('SELECTED')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected ({selectedIds.length})
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-200 bg-slate-50/50 text-xs font-medium overflow-x-auto">
          {[
            { key: 'all', label: 'All Test Items' },
            { key: 'organizations', label: 'Organizations' },
            { key: 'users', label: 'Users' },
            { key: 'companies', label: 'Companies' },
            { key: 'interactions', label: 'Interactions' },
            { key: 'followups', label: 'Follow-Ups' },
            { key: 'opportunities', label: 'Job Opportunities' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSelectedIds([]);
              }}
              className={`py-3 px-3 border-b-2 font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Record Table */}
        <div className="overflow-x-auto">
          {recordsLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin mx-auto mb-2" />
              Loading test records...
            </div>
          ) : testRecords.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-900">No Test Data Records Found</div>
              <p className="text-xs text-slate-500 mt-1">
                There are currently no test records matching the active filter.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedIds.length > 0 && selectedIds.length === testRecords.length}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Title / Name</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Marker</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {testRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(record.id)}
                        onChange={() => handleToggleSelect(record.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {record.entityType}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {record.title}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {record.subtitle}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {record.createdAt ? new Date(record.createdAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        TEST DATA
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-slate-900">
                {deleteMode === 'ALL' ? 'Delete All Test Data?' : `Delete Selected Test Records (${selectedIds.length})?`}
              </h3>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-900 space-y-2">
              <div className="font-bold">Warning: This action cannot be undone.</div>
              <p>
                {deleteMode === 'ALL'
                  ? 'All records explicitly marked as test data (isTestData = true) will be permanently deleted.'
                  : `The selected ${selectedIds.length} test records will be permanently removed.`}
              </p>
              <div className="font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded border border-emerald-200 text-[11px] inline-block">
                REAL OPERATIONAL DATA WILL NOT BE TOUCHED.
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                To confirm, type <span className="font-bold font-mono text-rose-600 select-all">DELETE TEST DATA</span> below:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="DELETE TEST DATA"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={confirmInput.trim() !== 'DELETE TEST DATA' || isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm & Delete Test Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
