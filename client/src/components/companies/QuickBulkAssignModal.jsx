import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import assignmentService from '../../services/assignment.service';
import {
  UserCheck,
  Users,
  Layers,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
  Building2,
  Filter,
  Check,
  ArrowRight,
} from 'lucide-react';

export default function QuickBulkAssignModal({
  isOpen,
  onClose,
  selectedCompanies = [],
  teamMembers = [],
  currentFilters = {},
  totalMatchingCount = 0,
  initialTab = 'QUANTITY', // 'QUANTITY' | 'DISTRIBUTE' | 'SELECTED'
  onSuccess,
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Tab 1: Quantity state
  const [qtyMemberId, setQtyMemberId] = useState('');
  const [quantity, setQuantity] = useState(25);
  const [qtyUnassignedOnly, setQtyUnassignedOnly] = useState(true);
  const [qtySortOrder, setQtySortOrder] = useState('oldest');
  const [qtyApplyFilters, setQtyApplyFilters] = useState(false);
  const [qtyReason, setQtyReason] = useState('');
  const [qtyPreviewLoading, setQtyPreviewLoading] = useState(false);
  const [qtyPreviewData, setQtyPreviewData] = useState(null);
  const [qtyExecuting, setQtyExecuting] = useState(false);

  // Tab 2: Distribution state
  const [distType, setDistType] = useState('EQUAL'); // 'EQUAL' | 'MANUAL'
  const [distMemberIds, setDistMemberIds] = useState([]);
  const [distTotalQuantity, setDistTotalQuantity] = useState(50);
  const [distManualAllocations, setDistManualAllocations] = useState({});
  const [distUnassignedOnly, setDistUnassignedOnly] = useState(true);
  const [distSortOrder, setDistSortOrder] = useState('oldest');
  const [distApplyFilters, setDistApplyFilters] = useState(false);
  const [distReason, setDistReason] = useState('');
  const [distPreviewLoading, setDistPreviewLoading] = useState(false);
  const [distPreviewData, setDistPreviewData] = useState(null);
  const [distExecuting, setDistExecuting] = useState(false);
  const [expandedDistMember, setExpandedDistMember] = useState(null);

  // Tab 3: Selected state
  const [selMemberId, setSelMemberId] = useState('');
  const [selReason, setSelReason] = useState('');
  const [selExecuting, setSelExecuting] = useState(false);

  // General error / result state
  const [error, setError] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(selectedCompanies.length > 0 ? (initialTab || 'SELECTED') : 'QUANTITY');
      setQtyMemberId('');
      setQuantity(25);
      setQtyPreviewData(null);
      setQtyReason('');

      setDistType('EQUAL');
      setDistMemberIds(teamMembers.map((m) => m.id || m._id));
      setDistTotalQuantity(50);
      setDistManualAllocations({});
      setDistPreviewData(null);
      setDistReason('');

      setSelMemberId('');
      setSelReason('');
      setError(null);
      setSuccessResult(null);
    }
  }, [isOpen, initialTab, selectedCompanies.length, teamMembers]);

  // Active filter summary string
  const activeFiltersCount = Object.values(currentFilters).filter(
    (v) => v && v !== 'ALL' && v !== ''
  ).length;

  // Helpers
  const targetMemberForQty = teamMembers.find((m) => (m.id || m._id) === qtyMemberId);
  const targetMemberForSel = teamMembers.find((m) => (m.id || m._id) === selMemberId);

  // TAB 1: Preview Quantity
  const handlePreviewQuantity = async () => {
    if (!qtyMemberId) {
      setError('Please select a target Team Member.');
      return;
    }
    const num = parseInt(quantity, 10);
    if (!num || num <= 0) {
      setError('Please enter a valid positive quantity.');
      return;
    }

    setQtyPreviewLoading(true);
    setError(null);
    try {
      const res = await assignmentService.previewQuantityAssignment({
        quantity: num,
        assignedTo: qtyMemberId,
        unassignedOnly: qtyUnassignedOnly,
        sortOrder: qtySortOrder,
        filterParams: qtyApplyFilters ? currentFilters : {},
      });
      if (res.success) {
        setQtyPreviewData(res.data);
      }
    } catch (err) {
      console.error('Preview error:', err);
      setError(err.message || err.response?.data?.error?.message || 'Failed to generate assignment preview');
    } finally {
      setQtyPreviewLoading(false);
    }
  };

  // TAB 1: Execute Quantity Assignment
  const handleConfirmQuantityAssign = async () => {
    if (!qtyMemberId || !qtyPreviewData) return;
    setQtyExecuting(true);
    setError(null);
    try {
      const res = await assignmentService.assignByQuantity({
        quantity: qtyPreviewData.requested,
        assignedTo: qtyMemberId,
        unassignedOnly: qtyUnassignedOnly,
        sortOrder: qtySortOrder,
        filterParams: qtyApplyFilters ? currentFilters : {},
        reason: qtyReason.trim() || undefined,
      });
      if (res.success) {
        setSuccessResult({
          type: 'QUANTITY',
          targetName: targetMemberForQty?.name,
          data: res.data,
        });
        if (onSuccess) onSuccess(res.data);
      }
    } catch (err) {
      console.error('Assign by quantity error:', err);
      setError(err.message || err.response?.data?.error?.message || 'Failed to assign companies by quantity');
    } finally {
      setQtyExecuting(false);
    }
  };

  // TAB 2: Toggle member in distribution
  const toggleDistMember = (memberId) => {
    setDistMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
    setDistPreviewData(null);
  };

  const handleSelectAllDistMembers = () => {
    const allIds = teamMembers.map((m) => m.id || m._id);
    if (distMemberIds.length === allIds.length) {
      setDistMemberIds([]);
    } else {
      setDistMemberIds(allIds);
    }
    setDistPreviewData(null);
  };

  // TAB 2: Preview Distribution
  const handlePreviewDistribution = async () => {
    if (distMemberIds.length === 0) {
      setError('Please select at least one Team Member for distribution.');
      return;
    }

    setDistPreviewLoading(true);
    setError(null);
    try {
      const manualList = distMemberIds.map((mId) => ({
        memberId: mId,
        quantity: parseInt(distManualAllocations[mId], 10) || 0,
      }));

      const res = await assignmentService.previewDistribution({
        totalQuantity: parseInt(distTotalQuantity, 10) || 0,
        teamMemberIds: distMemberIds,
        manualAllocations: manualList,
        unassignedOnly: distUnassignedOnly,
        sortOrder: distSortOrder,
        filterParams: distApplyFilters ? currentFilters : {},
        distributionType: distType,
      });

      if (res.success) {
        setDistPreviewData(res.data);
      }
    } catch (err) {
      console.error('Preview distribution error:', err);
      setError(err.message || err.response?.data?.error?.message || 'Failed to calculate distribution preview');
    } finally {
      setDistPreviewLoading(false);
    }
  };

  // TAB 2: Execute Distribution
  const handleConfirmDistribution = async () => {
    if (!distPreviewData || !distPreviewData.memberBreakdown) return;
    setDistExecuting(true);
    setError(null);
    try {
      const allocations = distPreviewData.memberBreakdown
        .map((mb) => ({
          memberId: mb.memberId,
          companyIds: mb.companies.map((c) => c.id || c._id),
        }))
        .filter((a) => a.companyIds.length > 0);

      const res = await assignmentService.executeDistribution({
        allocations,
        reason: distReason.trim() || undefined,
      });

      if (res.success) {
        setSuccessResult({
          type: 'DISTRIBUTION',
          data: res.data,
        });
        if (onSuccess) onSuccess(res.data);
      }
    } catch (err) {
      console.error('Execute distribution error:', err);
      setError(err.message || err.response?.data?.error?.message || 'Failed to execute distribution');
    } finally {
      setDistExecuting(false);
    }
  };

  // TAB 3: Execute Selected Assignment
  const handleConfirmSelectedAssign = async (e) => {
    e.preventDefault();
    if (!selMemberId) {
      setError('Please select a target Team Member.');
      return;
    }
    if (selectedCompanies.length === 0) {
      setError('No companies are currently selected.');
      return;
    }

    setSelExecuting(true);
    setError(null);
    try {
      const companyIds = selectedCompanies.map((c) => (c.id || c._id)?.toString()).filter(Boolean);
      const res = await assignmentService.assignBulkCompanies({
        companyIds,
        assignedTo: selMemberId,
        reason: selReason.trim() || undefined,
      });

      if (res.success) {
        setSuccessResult({
          type: 'SELECTED',
          targetName: targetMemberForSel?.name,
          data: res.data,
        });
        if (onSuccess) onSuccess(res.data);
      }
    } catch (err) {
      console.error('Assign selected error:', err);
      setError(err.message || err.response?.data?.error?.message || 'Failed to assign selected companies');
    } finally {
      setSelExecuting(false);
    }
  };

  // Conflict calculation for Tab 3
  const alreadyAssignedToTargetCount = selMemberId
    ? selectedCompanies.filter((c) => {
        const aId = c.currentAssignment?.assignedTo?.id || c.currentAssignment?.assignedTo?._id;
        return aId === selMemberId;
      }).length
    : 0;

  const reassignedFromOtherCount = selMemberId
    ? selectedCompanies.filter((c) => {
        const aId = c.currentAssignment?.assignedTo?.id || c.currentAssignment?.assignedTo?._id;
        return aId && aId !== selMemberId;
      }).length
    : 0;

  const freshAssignCount = selectedCompanies.length - alreadyAssignedToTargetCount - reassignedFromOtherCount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <span>Quick Bulk Company Assignment</span>
        </div>
      }
      maxWidth="max-w-2xl"
    >
      {/* SUCCESS SCREEN */}
      {successResult ? (
        <div className="space-y-5">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-bold">Assignment Operation Completed</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                {successResult.type === 'DISTRIBUTION'
                  ? `Successfully distributed companies across ${successResult.data.totalMembers} team members.`
                  : `Successfully assigned companies to ${successResult.targetName || 'team member'}.`}
              </p>
            </div>
          </div>

          {successResult.type === 'DISTRIBUTION' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center text-xs">
                <div>
                  <span className="text-slate-500 font-medium uppercase text-[10px]">Team Members</span>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">{successResult.data.totalMembers}</div>
                </div>
                <div>
                  <span className="text-emerald-600 font-medium uppercase text-[10px]">Newly Assigned</span>
                  <div className="text-lg font-bold text-emerald-600 mt-0.5">{successResult.data.grandTotalAssigned}</div>
                </div>
                <div>
                  <span className="text-amber-600 font-medium uppercase text-[10px]">Reassigned</span>
                  <div className="text-lg font-bold text-amber-600 mt-0.5">{successResult.data.grandTotalReassigned}</div>
                </div>
              </div>

              {/* Breakdown per member */}
              <div className="max-h-52 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-3 bg-white">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Per-Member Summary</p>
                {successResult.data.memberResults?.map((mr, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                    <span className="font-semibold text-slate-800">{mr.memberName}</span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {(mr.assigned || 0) + (mr.reassigned || 0)} companies
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center text-xs">
              <div>
                <span className="text-slate-500 font-medium uppercase text-[10px]">Processed</span>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {(successResult.data.assigned || 0) + (successResult.data.reassigned || 0)}
                </div>
              </div>
              <div>
                <span className="text-emerald-600 font-medium uppercase text-[10px]">Newly Assigned</span>
                <div className="text-lg font-bold text-emerald-600 mt-0.5">{successResult.data.assigned || 0}</div>
              </div>
              <div>
                <span className="text-amber-600 font-medium uppercase text-[10px]">Reassigned</span>
                <div className="text-lg font-bold text-amber-600 mt-0.5">{successResult.data.reassigned || 0}</div>
              </div>
              <div>
                <span className="text-slate-400 font-medium uppercase text-[10px]">Skipped</span>
                <div className="text-lg font-bold text-slate-500 mt-0.5">{successResult.data.alreadyAssigned || 0}</div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* TAB HEADERS */}
          <div className="flex border-b border-slate-200 gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('QUANTITY');
                setError(null);
              }}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'QUANTITY'
                  ? 'border-indigo-600 text-indigo-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Assign by Quantity</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-bold">Fast</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('DISTRIBUTE');
                setError(null);
              }}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'DISTRIBUTE'
                  ? 'border-indigo-600 text-indigo-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Distribute to Team</span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold">Equal / Custom</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (selectedCompanies.length > 0) {
                  setActiveTab('SELECTED');
                  setError(null);
                }
              }}
              disabled={selectedCompanies.length === 0}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                selectedCompanies.length === 0
                  ? 'border-transparent text-slate-300 cursor-not-allowed'
                  : activeTab === 'SELECTED'
                  ? 'border-indigo-600 text-indigo-700 font-bold cursor-pointer'
                  : 'border-transparent text-slate-500 hover:text-slate-700 cursor-pointer'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Assign Selected ({selectedCompanies.length})</span>
            </button>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: ASSIGN BY QUANTITY */}
          {activeTab === 'QUANTITY' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Team Member <span className="text-rose-500">*</span>
                </label>
                <select
                  value={qtyMemberId}
                  onChange={(e) => {
                    setQtyMemberId(e.target.value);
                    setQtyPreviewData(null);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Select Team Member...</option>
                  {teamMembers.map((m) => (
                    <option key={m.id || m._id} value={m.id || m._id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Number of Companies to Assign <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={quantity}
                    onChange={(e) => {
                      setQuantity(e.target.value);
                      setQtyPreviewData(null);
                    }}
                    className="w-32 px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[10, 25, 50, 100].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          setQuantity(num);
                          setQtyPreviewData(null);
                        }}
                        className={`px-2.5 py-1 text-xs rounded-md border transition-colors cursor-pointer ${
                          parseInt(quantity, 10) === num
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Eligibility & Filter Settings */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5 text-xs text-slate-700">
                <div className="font-semibold text-slate-800">Selection Criteria & Priority:</div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="qtyUnassignedOnly"
                    checked={qtyUnassignedOnly}
                    onChange={(e) => {
                      setQtyUnassignedOnly(e.target.checked);
                      setQtyPreviewData(null);
                    }}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="qtyUnassignedOnly" className="cursor-pointer">
                    <strong>Unassigned companies only</strong> (Recommended — skips companies already assigned)
                  </label>
                </div>

                {activeFiltersCount > 0 && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="qtyApplyFilters"
                      checked={qtyApplyFilters}
                      onChange={(e) => {
                        setQtyApplyFilters(e.target.checked);
                        setQtyPreviewData(null);
                      }}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="qtyApplyFilters" className="cursor-pointer">
                      Apply current table filters ({activeFiltersCount} active: {Object.entries(currentFilters).filter(([, v]) => v && v !== 'ALL').map(([k, v]) => `${k}=${v}`).join(', ')})
                    </label>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <span className="text-slate-500">Order by:</span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="qtySortOrder"
                      value="oldest"
                      checked={qtySortOrder === 'oldest'}
                      onChange={() => {
                        setQtySortOrder('oldest');
                        setQtyPreviewData(null);
                      }}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Oldest first (FIFO)</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="qtySortOrder"
                      value="newest"
                      checked={qtySortOrder === 'newest'}
                      onChange={() => {
                        setQtySortOrder('newest');
                        setQtyPreviewData(null);
                      }}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Newest first</span>
                  </label>
                </div>
              </div>

              {/* PREVIEW BUTTON */}
              {!qtyPreviewData ? (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handlePreviewQuantity}
                    disabled={!qtyMemberId || qtyPreviewLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs cursor-pointer"
                  >
                    {qtyPreviewLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating Preview...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Preview Assignment</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* PREVIEW DISPLAY */
                <div className="space-y-3 pt-1 animate-in fade-in">
                  {/* Summary card */}
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-900 space-y-1.5">
                    <div className="flex items-center justify-between font-semibold">
                      <span>Target: {qtyPreviewData.targetMember?.name}</span>
                      <span className="bg-white px-2 py-0.5 rounded border border-indigo-200 font-bold">
                        {qtyPreviewData.selectedCount} of {qtyPreviewData.requested} companies
                      </span>
                    </div>
                    <div className="text-slate-600">
                      Total eligible in organization: <strong>{qtyPreviewData.eligibleTotal}</strong> companies.
                    </div>
                  </div>

                  {/* Shortage warning if any */}
                  {qtyPreviewData.shortage > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <strong>Shortage Notice:</strong> Requested {qtyPreviewData.requested} companies, but only{' '}
                        {qtyPreviewData.selectedCount} match the criteria. All {qtyPreviewData.selectedCount} available companies will be assigned.
                      </div>
                    </div>
                  )}

                  {/* Preview Companies List */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider flex justify-between">
                      <span>Companies to be assigned ({qtyPreviewData.companies.length})</span>
                      <button
                        type="button"
                        onClick={() => setQtyPreviewData(null)}
                        className="text-indigo-600 hover:underline cursor-pointer lowercase"
                      >
                        change criteria
                      </button>
                    </div>
                    <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 bg-white">
                      {qtyPreviewData.companies.map((c, i) => (
                        <div key={c.id || i} className="px-3 py-1.5 text-xs flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-800">{c.companyName}</span>
                            <span className="text-slate-400 ml-2">
                              {c.city || '—'} • {c.industry || '—'}
                            </span>
                          </div>
                          {c.currentAssignment?.assignedTo && (
                            <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                              Reassign from {c.currentAssignment.assignedTo.name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reason / Instructions (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Weekly outreach batch, priority accounts..."
                      value={qtyReason}
                      onChange={(e) => setQtyReason(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setQtyPreviewData(null)}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmQuantityAssign}
                      disabled={qtyExecuting || qtyPreviewData.selectedCount === 0}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs cursor-pointer"
                    >
                      {qtyExecuting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Assigning...</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4" />
                          <span>Confirm & Assign {qtyPreviewData.selectedCount} Companies</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DISTRIBUTE ACROSS TEAM MEMBERS */}
          {activeTab === 'DISTRIBUTE' && (
            <div className="space-y-4">
              {/* Distribution Type Selection */}
              <div className="flex items-center gap-4 border-b border-slate-100 pb-2 text-xs">
                <span className="font-semibold text-slate-700">Distribution Mode:</span>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="distType"
                    value="EQUAL"
                    checked={distType === 'EQUAL'}
                    onChange={() => {
                      setDistType('EQUAL');
                      setDistPreviewData(null);
                    }}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium">Equal Split</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="distType"
                    value="MANUAL"
                    checked={distType === 'MANUAL'}
                    onChange={() => {
                      setDistType('MANUAL');
                      setDistPreviewData(null);
                    }}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-medium">Custom Per-Member Allocations</span>
                </label>
              </div>

              {/* Team Members Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Select Target Team Members ({distMemberIds.length} of {teamMembers.length} selected)
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllDistMembers}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    {distMemberIds.length === teamMembers.length ? 'Deselect All' : 'Select All Members'}
                  </button>
                </div>

                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50/50 space-y-1.5">
                  {teamMembers.map((m) => {
                    const mId = m.id || m._id;
                    const isSelected = distMemberIds.includes(mId);
                    return (
                      <div
                        key={mId}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                          isSelected
                            ? 'bg-white border-indigo-200 shadow-2xs'
                            : 'bg-transparent border-transparent opacity-60'
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleDistMember(mId)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="font-semibold text-slate-800">{m.name}</span>
                          <span className="text-slate-400 text-[11px]">({m.email})</span>
                        </label>

                        {distType === 'MANUAL' && isSelected && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-500">Qty:</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={distManualAllocations[mId] || ''}
                              onChange={(e) => {
                                setDistManualAllocations((prev) => ({
                                  ...prev,
                                  [mId]: e.target.value,
                                }));
                                setDistPreviewData(null);
                              }}
                              className="w-16 px-2 py-1 text-xs rounded border border-slate-200 text-center font-bold"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Quantity for EQUAL distribution */}
              {distType === 'EQUAL' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Companies to Distribute Equally
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={distTotalQuantity}
                      onChange={(e) => {
                        setDistTotalQuantity(e.target.value);
                        setDistPreviewData(null);
                      }}
                      className="w-32 px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold"
                    />
                    <div className="flex items-center gap-1.5">
                      {[30, 60, 100, 150].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            setDistTotalQuantity(num);
                            setDistPreviewData(null);
                          }}
                          className={`px-2.5 py-1 text-xs rounded-md border transition-colors cursor-pointer ${
                            parseInt(distTotalQuantity, 10) === num
                              ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                  {distMemberIds.length > 0 && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      ≈ ~{Math.floor((parseInt(distTotalQuantity, 10) || 0) / distMemberIds.length)} companies per member (remainders distributed evenly)
                    </p>
                  )}
                </div>
              )}

              {/* Filters & Options */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="distUnassignedOnly"
                    checked={distUnassignedOnly}
                    onChange={(e) => {
                      setDistUnassignedOnly(e.target.checked);
                      setDistPreviewData(null);
                    }}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="distUnassignedOnly" className="cursor-pointer">
                    <strong>Unassigned companies only</strong>
                  </label>
                </div>

                {activeFiltersCount > 0 && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="distApplyFilters"
                      checked={distApplyFilters}
                      onChange={(e) => {
                        setDistApplyFilters(e.target.checked);
                        setDistPreviewData(null);
                      }}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="distApplyFilters" className="cursor-pointer">
                      Apply current table filters ({activeFiltersCount} active)
                    </label>
                  </div>
                )}
              </div>

              {/* PREVIEW BUTTON */}
              {!distPreviewData ? (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handlePreviewDistribution}
                    disabled={distMemberIds.length === 0 || distPreviewLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs cursor-pointer"
                  >
                    {distPreviewLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Calculating Distribution...</span>
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4" />
                        <span>Preview Distribution Plan</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* PREVIEW DISPLAY */
                <div className="space-y-3 pt-1 animate-in fade-in">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-900 flex items-center justify-between">
                    <div>
                      <span className="font-bold">Distribution Plan Calculated</span>
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        {distPreviewData.totalAllocated} total companies divided across {distPreviewData.memberBreakdown?.length} members.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDistPreviewData(null)}
                      className="text-xs text-indigo-600 hover:underline font-semibold cursor-pointer"
                    >
                      Change Plan
                    </button>
                  </div>

                  {distPreviewData.shortage > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Shortage: Requested {distPreviewData.requestedTotal}, but only {distPreviewData.eligibleTotal} eligible companies available in database.
                      </span>
                    </div>
                  )}

                  {/* Breakdown Cards */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-52 overflow-y-auto bg-white">
                    {distPreviewData.memberBreakdown?.map((mb) => {
                      const isExpanded = expandedDistMember === mb.memberId;
                      return (
                        <div key={mb.memberId} className="p-2.5 text-xs">
                          <div
                            onClick={() => setExpandedDistMember(isExpanded ? null : mb.memberId)}
                            className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800">{mb.memberName}</span>
                              <span className="text-slate-400 text-[11px]">({mb.memberEmail})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                {mb.allocatedCount} companies
                              </span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-2 pl-3 border-l-2 border-indigo-200 space-y-1 text-[11px] text-slate-600">
                              {mb.companies.map((c, idx) => (
                                <div key={c.id || idx} className="flex justify-between py-0.5">
                                  <span>{c.companyName}</span>
                                  <span className="text-slate-400">{c.city || c.industry || '—'}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reason / Instructions (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Equal team distribution, monthly territory division..."
                      value={distReason}
                      onChange={(e) => setDistReason(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setDistPreviewData(null)}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDistribution}
                      disabled={distExecuting || distPreviewData.totalAllocated === 0}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs cursor-pointer"
                    >
                      {distExecuting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Distributing...</span>
                        </>
                      ) : (
                        <>
                          <Users className="w-4 h-4" />
                          <span>Confirm & Distribute {distPreviewData.totalAllocated} Companies</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ASSIGN SELECTED COMPANIES */}
          {activeTab === 'SELECTED' && (
            <form onSubmit={handleConfirmSelectedAssign} className="space-y-4">
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs text-indigo-900 flex items-center justify-between">
                <span className="font-semibold">Companies Selected:</span>
                <span className="font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-md border border-indigo-200">
                  {selectedCompanies.length} Companies
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Team Member <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selMemberId}
                  onChange={(e) => setSelMemberId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Select Team Member...</option>
                  {teamMembers.map((m) => (
                    <option key={m.id || m._id} value={m.id || m._id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              {selMemberId && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5 text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Fresh Assignments:</span>
                    <span className="font-bold text-emerald-600">{freshAssignCount} companies</span>
                  </div>
                  {reassignedFromOtherCount > 0 && (
                    <div className="flex items-center justify-between text-amber-700">
                      <span>Reassigning from other members:</span>
                      <span className="font-bold">{reassignedFromOtherCount} companies</span>
                    </div>
                  )}
                  {alreadyAssignedToTargetCount > 0 && (
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Already assigned to {targetMemberForSel?.name} (will be skipped):</span>
                      <span className="font-semibold">{alreadyAssignedToTargetCount} companies</span>
                    </div>
                  )}
                </div>
              )}

              {/* Selected companies mini preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Selected Company Preview ({selectedCompanies.length})
                </div>
                <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 bg-white">
                  {selectedCompanies.slice(0, 50).map((c, i) => (
                    <div key={c.id || c._id || i} className="px-3 py-1.5 text-xs flex items-center justify-between">
                      <span className="font-medium text-slate-800">{c.companyName}</span>
                      <span className="text-[11px] text-slate-400">
                        {c.city || c.industry || '—'}
                      </span>
                    </div>
                  ))}
                  {selectedCompanies.length > 50 && (
                    <div className="px-3 py-1.5 text-[11px] text-slate-400 italic text-center">
                      ...and {selectedCompanies.length - 50} more
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason / Instructions (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Assigned selected accounts for outreach..."
                  value={selReason}
                  onChange={(e) => setSelReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selMemberId || selExecuting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                >
                  {selExecuting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Assigning...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Confirm Assignment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
}
