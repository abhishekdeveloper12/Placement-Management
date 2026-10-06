import React from 'react';
import { X, Clock, User, Building2, Shield, ArrowRight, FileText, Activity } from 'lucide-react';

export default function AuditLogDetailModal({ log, isOpen, onClose }) {
  if (!isOpen || !log) return null;

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

  const formatValue = (val) => {
    if (val === null || val === undefined) return <span className="text-slate-400 italic">None</span>;
    if (typeof val === 'boolean') return <span className="font-semibold text-slate-800">{val ? 'True' : 'False'}</span>;
    if (typeof val === 'object') return <pre className="text-xs bg-slate-900 text-slate-100 p-2 rounded max-h-32 overflow-auto font-mono">{JSON.stringify(val, null, 2)}</pre>;
    return <span className="font-medium text-slate-800">{String(val)}</span>;
  };

  // Collect all keys from oldValue and newValue for field-by-field diff comparison
  const getDiffKeys = () => {
    const oldObj = log.oldValue && typeof log.oldValue === 'object' ? log.oldValue : {};
    const newObj = log.newValue && typeof log.newValue === 'object' ? log.newValue : {};
    const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    return Array.from(keys);
  };

  const diffKeys = getDiffKeys();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-400/30">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getActionBadgeClass(log.action)}`}>
                  {log.action}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  {log.entityType || log.entity} &bull; ID: {log.entityId || 'N/A'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mt-1">Audit Event Trace Details</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Actor Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                Actor Identity
              </div>
              <div className="text-sm font-bold text-slate-900">{log.performedBy?.name || 'System / Unknown'}</div>
              <div className="text-xs text-slate-500">{log.performedBy?.email || 'N/A'}</div>
              {log.performedBy?.role && (
                <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold rounded bg-indigo-100 text-indigo-800">
                  {log.performedBy.role}
                </span>
              )}
            </div>

            {/* Organization Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Organization
              </div>
              <div className="text-sm font-bold text-slate-900">
                {log.organizationId?.name || 'Platform (Global Super Admin)'}
              </div>
              {log.organizationId?.code && (
                <div className="text-xs font-mono text-slate-500">Code: {log.organizationId.code}</div>
              )}
            </div>

            {/* Timestamp Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Timestamp
              </div>
              <div className="text-sm font-bold text-slate-900">
                {new Date(log.timestamp).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <div className="text-xs font-mono text-slate-500">
                {new Date(log.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Supplemental Metadata */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-500" />
                Supplemental Details & Context
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {Object.entries(log.metadata).map(([key, val]) => (
                  <div key={key} className="flex flex-col p-2 bg-white rounded border border-slate-200">
                    <span className="font-semibold text-slate-500">{key}</span>
                    <span className="text-slate-900 font-medium break-all">{formatValue(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mutation Diff Comparison */}
          {(log.oldValue || log.newValue) && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  State Mutation Snapshot (Diff)
                </h4>
                <span className="text-[11px] text-slate-500">Sanitized & Redacted</span>
              </div>

              {diffKeys.length > 0 ? (
                <div className="divide-y divide-slate-200">
                  <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600">
                    <div className="col-span-4">Attribute</div>
                    <div className="col-span-4">Previous Value (Old)</div>
                    <div className="col-span-4">New Value (Updated)</div>
                  </div>
                  {diffKeys.map((key) => (
                    <div key={key} className="grid grid-cols-12 px-4 py-2.5 text-xs items-center hover:bg-slate-50/80">
                      <div className="col-span-4 font-semibold text-slate-700 font-mono">{key}</div>
                      <div className="col-span-4 text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-100 font-mono text-[11px] overflow-x-auto">
                        {formatValue(log.oldValue?.[key])}
                      </div>
                      <div className="col-span-4 text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 font-mono text-[11px] overflow-x-auto">
                        {formatValue(log.newValue?.[key])}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                  <div className="p-4 bg-rose-50/30">
                    <div className="text-xs font-bold text-rose-800 mb-1">Previous Value (Old)</div>
                    <div className="text-xs font-mono text-slate-800">{formatValue(log.oldValue)}</div>
                  </div>
                  <div className="p-4 bg-emerald-50/30">
                    <div className="text-xs font-bold text-emerald-800 mb-1">New Value (New)</div>
                    <div className="text-xs font-mono text-slate-800">{formatValue(log.newValue)}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            Close Detail View
          </button>
        </div>
      </div>
    </div>
  );
}
