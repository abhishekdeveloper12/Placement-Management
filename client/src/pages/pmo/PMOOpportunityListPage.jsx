import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import opportunityService from '../../services/opportunity.service';
import pmoService from '../../services/pmo.service';
import companyService from '../../services/company.service';
import jobRoleService from '../../services/jobRole.service';
import OpportunityFormModal from '../../components/opportunities/OpportunityFormModal';
import {
  Briefcase,
  Search,
  Plus,
  RefreshCw,
  Building2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  Download,
  AlertCircle,
  Eye,
  Edit,
  Shield,
  CheckCircle2,
  Clock,
  User,
  Star,
  MessageSquare,
} from 'lucide-react';

export default function PMOOpportunityListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [opportunities, setOpportunities] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [hiringStatusFilter, setHiringStatusFilter] = useState(searchParams.get('hiringStatus') || '');
  const [opportunityTypeFilter, setOpportunityTypeFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState(searchParams.get('assignedTo') || '');
  const [shortlistedFilter, setShortlistedFilter] = useState('');
  const [jobRoleFilter, setJobRoleFilter] = useState('');

  const [teamMembers, setTeamMembers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [activeJobRoles, setActiveJobRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  useEffect(() => {
    async function loadDropdowns() {
      try {
        const [tmRes, compRes, roleRes] = await Promise.all([
          pmoService.getTeamMembers({ limit: 100 }),
          companyService.getCompanies({ limit: 100 }),
          jobRoleService.getActiveJobRoles(),
        ]);

        if (tmRes.success) setTeamMembers(tmRes.data);
        if (compRes.success) setCompanies(compRes.data);
        if (Array.isArray(roleRes)) setActiveJobRoles(roleRes);
      } catch (err) {
        console.error('Failed to load filter dropdowns:', err);
      }
    }
    loadDropdowns();
  }, []);

  // Synchronize state if URL searchParams change
  useEffect(() => {
    const urlHiringStatus = searchParams.get('hiringStatus');
    if (urlHiringStatus && urlHiringStatus !== hiringStatusFilter) {
      setHiringStatusFilter(urlHiringStatus);
    }
    const urlAssignedTo = searchParams.get('assignedTo');
    if (urlAssignedTo && urlAssignedTo !== createdByFilter) {
      setCreatedByFilter(urlAssignedTo);
    }
  }, [searchParams]);

  const fetchOpportunities = useCallback(
    async (page = pagination.page) => {
      setLoading(true);
      setError(null);
      try {
        const params = {
          page,
          limit: pagination.limit,
          companyId: companyFilter || undefined,
          createdBy: createdByFilter || undefined,
          hiringStatus: hiringStatusFilter || undefined,
          opportunityType: opportunityTypeFilter || undefined,
          shortlisted: shortlistedFilter || undefined,
          jobRoleId: jobRoleFilter || undefined,
          search: search || undefined,
        };

        const res = await opportunityService.getOpportunities(params);
        if (res.success) {
          setOpportunities(res.data);
          setPagination(res.meta || { page, limit: 10, total: res.data.length, totalPages: 1 });
        }
      } catch (err) {
        console.error('Failed to fetch PMO opportunities:', err);
        setError(err.message || err.response?.data?.error?.message || 'Failed to load organization job opportunities');
      } finally {
        setLoading(false);
      }
    },
    [companyFilter, createdByFilter, hiringStatusFilter, opportunityTypeFilter, shortlistedFilter, jobRoleFilter, pagination.limit, pagination.page, search]
  );

  useEffect(() => {
    fetchOpportunities(1);
  }, [companyFilter, createdByFilter, hiringStatusFilter, opportunityTypeFilter, shortlistedFilter, jobRoleFilter, search]);

  const handleStatusQuickChange = async (oppId, newStatus) => {
    try {
      const res = await opportunityService.updateOpportunity(oppId, { hiringStatus: newStatus });
      if (res.success) {
        fetchOpportunities(pagination.page);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update hiring status');
    }
  };

  const handleQuickToggleShortlist = async (opp) => {
    try {
      const res = await opportunityService.shortlistOpportunity(opp.id, {
        isShortlisted: !opp.isShortlisted,
      });
      if (res.success) {
        fetchOpportunities(pagination.page);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update shortlist status');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'HIRING_NOW':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Hiring Now</span>;
      case 'HIRING_PLANNED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Planned</span>;
      case 'NOT_HIRING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Not Hiring</span>;
      case 'ON_HOLD':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">On Hold</span>;
      case 'CLOSED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">Closed</span>;
      default:
        return status;
    }
  };

  const getOppTypeBadge = (type) => {
    switch (type) {
      case 'FULL_TIME':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">Full-Time</span>;
      case 'INTERNSHIP':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">Internship</span>;
      case 'INTERNSHIP_PPO':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">Intern + PPO</span>;
      case 'MULTIPLE':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Multiple</span>;
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-indigo-600" />
            Organization Job Opportunities Pipeline
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            PMO oversight of corporate hiring intake, Job Description repository, and openings captured across the team.
          </p>
        </div>
        <button
          onClick={() => {
            setEditTarget(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-2xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Opportunity</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search title, company, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={createdByFilter}
            onChange={(e) => setCreatedByFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white max-w-[160px]"
          >
            <option value="">All Team Members</option>
            {teamMembers.map((tm) => (
              <option key={tm._id} value={tm._id}>
                {tm.name}
              </option>
            ))}
          </select>

          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white max-w-[160px]"
          >
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name || c.companyName}
              </option>
            ))}
          </select>

          <select
            value={hiringStatusFilter}
            onChange={(e) => setHiringStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            <option value="">All Statuses</option>
            <option value="HIRING_NOW">Hiring Now</option>
            <option value="HIRING_PLANNED">Hiring Planned</option>
            <option value="NOT_HIRING">Not Hiring</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={opportunityTypeFilter}
            onChange={(e) => setOpportunityTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            <option value="">All Types</option>
            <option value="FULL_TIME">Full-Time</option>
            <option value="INTERNSHIP">Internship</option>
            <option value="INTERNSHIP_PPO">Internship + PPO</option>
            <option value="MULTIPLE">Multiple</option>
          </select>

          <select
            value={jobRoleFilter}
            onChange={(e) => setJobRoleFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white max-w-[160px]"
          >
            <option value="">All Job Roles</option>
            {activeJobRoles.map((role) => (
              <option key={role.id || role._id} value={role.id || role._id}>
                {role.name}
              </option>
            ))}
          </select>

          <select
            value={shortlistedFilter}
            onChange={(e) => setShortlistedFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-semibold text-slate-700"
          >
            <option value="">All Shortlist States</option>
            <option value="true">⭐ Shortlisted Only</option>
            <option value="false">Standard Only</option>
          </select>

          <button
            onClick={() => fetchOpportunities(pagination.page)}
            className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Opportunities Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="text-sm">Loading opportunities...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <div className="font-semibold text-sm">{error}</div>
          </div>
        ) : opportunities.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <Briefcase className="w-10 h-10 mx-auto text-slate-300" />
            <div className="text-base font-semibold text-slate-700">No Job Opportunities Found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No hiring requirements match your active filter settings.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Job Profile / Title</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Compensation</th>
                  <th className="py-3 px-4">Hiring Status</th>
                  <th className="py-3 px-4">Captured By</th>
                  <th className="py-3 px-4">JD File</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {opportunities.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
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
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/pmo/opportunities/${item.id}`}
                          className="font-bold text-slate-900 hover:text-indigo-600 truncate"
                        >
                          {item.title}
                        </Link>
                        {item.isShortlisted && (
                          <span className="shrink-0 text-amber-500" title="Shortlisted for Students">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Openings: {item.openings || 'N/A'} &bull; {item.candidateType}
                      </div>
                    </td>
                    <td className="py-3 px-4">{getOppTypeBadge(item.opportunityType)}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <div>{item.salary || item.stipend || '—'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={item.hiringStatus}
                        onChange={(e) => handleStatusQuickChange(item.id, e.target.value)}
                        className="px-2 py-1 rounded text-xs font-semibold border border-slate-300 bg-white outline-none"
                      >
                        <option value="HIRING_NOW">Hiring Now</option>
                        <option value="HIRING_PLANNED">Hiring Planned</option>
                        <option value="NOT_HIRING">Not Hiring</option>
                        <option value="ON_HOLD">On Hold</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      {item.creator ? (
                        <div>
                          <div className="font-semibold text-slate-800">{item.creator.name}</div>
                          <div className="text-[11px] text-slate-500">{item.creator.email}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.jdDocument ? (
                        <a
                          href={opportunityService.getJdDownloadUrl(item.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded font-semibold transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[90px]">{item.jdDocument.originalFileName}</span>
                          <Download className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No JD File</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleQuickToggleShortlist(item)}
                          className={`p-1.5 rounded transition-colors cursor-pointer ${
                            item.isShortlisted
                              ? 'text-amber-500 hover:bg-amber-50'
                              : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100'
                          }`}
                          title={item.isShortlisted ? 'Unshortlist Opportunity' : 'Shortlist Opportunity'}
                        >
                          <Star className={`w-4 h-4 ${item.isShortlisted ? 'fill-amber-400' : ''}`} />
                        </button>
                        <Link
                          to={`/pmo/opportunities/${item.id}`}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                          title="View Details & Review Note"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => {
                            setEditTarget(item);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          title="Edit Opportunity"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
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
                onClick={() => fetchOpportunities(pagination.page - 1)}
                className="p-1.5 border border-slate-300 rounded text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchOpportunities(pagination.page + 1)}
                className="p-1.5 border border-slate-300 rounded text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Opportunity Form Modal */}
      {isFormOpen && (
        <OpportunityFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditTarget(null);
          }}
          onSuccess={() => {
            fetchOpportunities(pagination.page);
          }}
          initialData={editTarget}
        />
      )}
    </div>
  );
}
