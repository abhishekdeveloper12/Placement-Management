import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import dataManagementService from '../../services/dataManagement.service';
import {
  Database,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Building2,
  Users,
  Briefcase,
  PhoneCall,
  CheckSquare,
  FileText,
  ShieldCheck,
  ChevronRight,
  Activity,
  Layers,
} from 'lucide-react';

export default function DataManagementPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dataManagementService.getSummary();
      if (res.success) {
        setSummary(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load database metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const cards = [
    {
      id: 'organizations',
      title: 'Organizations',
      count: summary?.organizations ?? 0,
      description: 'Active tenant organizations registered in the system',
      icon: Building2,
      path: '/super-admin/organizations',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      iconColor: 'text-indigo-600 bg-indigo-100/60',
      hoverBorder: 'hover:border-indigo-400 hover:shadow-indigo-100/50',
    },
    {
      id: 'users',
      title: 'Total Users',
      count: summary?.users ?? 0,
      description: 'Super Admins, PMO Admins, and Placement Team Members',
      icon: Users,
      path: '/super-admin/organizations',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      iconColor: 'text-blue-600 bg-blue-100/60',
      hoverBorder: 'hover:border-blue-400 hover:shadow-blue-100/50',
    },
    {
      id: 'companies',
      title: 'Company Database',
      count: summary?.companies ?? 0,
      description: 'Verified employer profiles and company master data',
      icon: Building2,
      path: '/super-admin/companies',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconColor: 'text-emerald-600 bg-emerald-100/60',
      hoverBorder: 'hover:border-emerald-400 hover:shadow-emerald-100/50',
    },
    {
      id: 'opportunities',
      title: 'Job Opportunities',
      count: summary?.opportunities ?? 0,
      description: 'Active & planned job roles posted by team members',
      icon: Briefcase,
      path: '/super-admin/companies',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      iconColor: 'text-amber-600 bg-amber-100/60',
      hoverBorder: 'hover:border-amber-400 hover:shadow-amber-100/50',
    },
    {
      id: 'interactions',
      title: 'Call Interactions',
      count: summary?.interactions ?? 0,
      description: 'Logged employer outreach & interaction history',
      icon: PhoneCall,
      path: '/super-admin/audit-logs',
      badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
      iconColor: 'text-violet-600 bg-violet-100/60',
      hoverBorder: 'hover:border-violet-400 hover:shadow-violet-100/50',
    },
    {
      id: 'followups',
      title: 'Follow-up Tasks',
      count: summary?.followUps ?? 0,
      description: 'Scheduled task follow-ups and team commitments',
      icon: CheckSquare,
      path: '/super-admin/audit-logs',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      iconColor: 'text-rose-600 bg-rose-100/60',
      hoverBorder: 'hover:border-rose-400 hover:shadow-rose-100/50',
    },
    {
      id: 'documents',
      title: 'Stored Documents',
      count: summary?.documents ?? 0,
      description: 'Uploaded company datasheets and document assets',
      icon: FileText,
      path: '/super-admin/audit-logs',
      badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      iconColor: 'text-cyan-600 bg-cyan-100/60',
      hoverBorder: 'hover:border-cyan-400 hover:shadow-cyan-100/50',
    },
    {
      id: 'auditlogs',
      title: 'System Audit Logs',
      count: summary?.auditLogs ?? 0,
      description: 'Security audit trails, database actions & user logs',
      icon: ShieldCheck,
      path: '/super-admin/audit-logs',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      iconColor: 'text-slate-700 bg-slate-200/70',
      hoverBorder: 'hover:border-slate-400 hover:shadow-slate-100/50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Data Management & Real-Time Metrics
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Real-time live database document counts across all operational entities. Click any metric card to navigate directly to its page.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSummary}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Counts
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="text-xs font-semibold text-rose-900">{error}</div>
        </div>
      )}

      {/* Real-time Document Counts Grid */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Fetching real-time database counts...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Activity className="w-4 h-4 text-emerald-600" />
              Live Operational Entities
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Click any card to inspect records
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {cards.map((card) => {
              const IconComponent = card.icon;
              return (
                <div
                  key={card.id}
                  onClick={() => navigate(card.path)}
                  className={`group bg-white p-5 rounded-xl border border-slate-200 shadow-xs transition-all duration-200 hover:shadow-md cursor-pointer transform hover:-translate-y-1 ${card.hoverBorder}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-lg ${card.iconColor}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${card.badgeColor}`}
                    >
                      LIVE
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                      {card.count.toLocaleString()}
                    </div>
                    <div className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors flex items-center justify-between">
                      {card.title}
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-xs text-slate-500 leading-snug line-clamp-2">
                      {card.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
