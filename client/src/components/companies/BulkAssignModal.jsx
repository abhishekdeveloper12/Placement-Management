import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import assignmentService from '../../services/assignment.service';
import { UserCheck, AlertCircle, Loader2, CheckCircle2, UserX, Info, Users } from 'lucide-react';

export default function BulkAssignModal({
  isOpen,
  onClose,
  selectedCompanies = [],
  teamMembers = [],
  onSuccess,
}) {
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedMemberId('');
      setReason('');
      setError(null);
      setResult(null);
    }
  }, [isOpen]);

  const targetMember = teamMembers.find((m) => (m.id || m._id) === selectedMemberId);

  // Calculate preview stats
  const totalCount = selectedCompanies.length;
  const alreadyAssignedCount = selectedMemberId
    ? selectedCompanies.filter((c) => {
        const assignedId = c.currentAssignment?.assignedTo?.id || c.currentAssignment?.assignedTo?._id;
        return assignedId === selectedMemberId;
      }).length
    : 0;
  const newAssignCount = totalCount - alreadyAssignedCount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMemberId) {
      setError('Please select a Team Member to assign companies to.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const companyIds = selectedCompanies.map((c) => (c.id || c._id)?.toString()).filter(Boolean);
      const res = await assignmentService.assignBulkCompanies({
        companyIds,
        assignedTo: selectedMemberId,
        reason: reason.trim() || undefined,
      });

      if (res.success) {
        setResult(res.data);
        if (onSuccess) onSuccess(res.data);
      }
    } catch (err) {
      console.error('Bulk assign error:', err);
      setError(err.message || err.details?.[0]?.message || err.response?.data?.error?.message || 'Failed to process bulk company assignment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={result ? 'Bulk Assignment Results' : 'Assign Selected Companies'}
      maxWidth="max-w-lg"
    >
      {result ? (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-bold">Bulk Assignment Completed</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Companies allocated to {targetMember?.name || 'team member'}.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center text-xs">
            <div>
              <span className="text-slate-500 font-medium uppercase text-[10px]">Selected</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">{result.totalSelected}</div>
            </div>
            <div>
              <span className="text-emerald-600 font-medium uppercase text-[10px]">Newly Assigned</span>
              <div className="text-lg font-bold text-emerald-600 mt-0.5">{result.assigned}</div>
            </div>
            <div>
              <span className="text-amber-600 font-medium uppercase text-[10px]">Reassigned</span>
              <div className="text-lg font-bold text-amber-600 mt-0.5">{result.reassigned}</div>
            </div>
            <div>
              <span className="text-slate-400 font-medium uppercase text-[10px]">Already Assigned</span>
              <div className="text-lg font-bold text-slate-500 mt-0.5">{result.alreadyAssigned}</div>
            </div>
          </div>

          {result.failed > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{result.failed} company failed to assign</span>
              </p>
              {result.failures.map((f, idx) => (
                <p key={idx} className="text-[11px] text-rose-700">
                  • {f.companyName}: {f.reason}
                </p>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs text-indigo-900 flex items-center justify-between">
            <span className="font-semibold">Companies Selected:</span>
            <span className="font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-md border border-indigo-200">
              {totalCount} Companies
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Team Member <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Select Team Member...</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.email})
                </option>
              ))}
            </select>
          </div>

          {selectedMemberId && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5 text-slate-600">
              <div className="flex items-center justify-between">
                <span>Will be newly assigned / reassigned:</span>
                <span className="font-bold text-indigo-600">{newAssignCount} companies</span>
              </div>
              {alreadyAssignedCount > 0 && (
                <div className="flex items-center justify-between text-slate-400">
                  <span>Already assigned to {targetMember?.name} (will be skipped):</span>
                  <span className="font-semibold">{alreadyAssignedCount} companies</span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Instructions (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Workload balancing, IT sector focus..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
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
              disabled={!selectedMemberId || submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {submitting ? (
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
    </Modal>
  );
}
