import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import opportunityService from '../../services/opportunity.service';
import assignmentService from '../../services/assignment.service';
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
  CheckCircle2,
  Clock,
  DollarSign,
  Upload,
} from 'lucide-react';

export default function TeamMemberOpportunityListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [opportunities, setOpportunities] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [hiringStatusFilter, setHiringStatusFilter] = useState(searchParams.get('hiringStatus') || '');
  const [opportunityTypeFilter, setOpportunityTypeFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [jobRoleFilter, setJobRoleFilter] = useState('');

  const [assignedCompanies, setAssignedCompanies] = useState([]);
  const [activeJobRoles, setActiveJobRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [jdUploadTarget, setJdUploadTarget] = useState(null);
  const [uploadingJd, setUploadingJd] = useState(false);

  // Fetch assigned companies & active job roles for filter dropdowns
  useEffect(() => {
    async function loadDropdowns() {
      try {
        const [compRes, rolesRes] = await Promise.all([
          assignmentService.getTeamMemberAssignedCompanies({ limit: 100 }),
          jobRoleService.getActiveJobRoles(),
        ]);
        if (compRes.success) {
          setAssignedCompanies(compRes.data);
        }
        if (Array.isArray(rolesRes)) {
          setActiveJobRoles(rolesRes);
        }
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
          hiringStatus: hiringStatusFilter || undefined,
          opportunityType: opportunityTypeFilter || undefined,
          jobRoleId: jobRoleFilter || undefined,
          search: search || undefined,
        };

        const res = await opportunityService.getOpportunities(params);
        if (res.success) {
          setOpportunities(res.data);
          setPagination(res.meta || { page, limit: 10, total: res.data.length, totalPages: 1 });
        }
      } catch (err) {
        console.error('Failed to fetch opportunities:', err);
        setError(err.message || err.response?.data?.error?.message || 'Failed to load job opportunities');
      } finally {
        setLoading(false);
      }
    },
    [companyFilter, hiringStatusFilter, opportunityTypeFilter, jobRoleFilter, pagination.limit, pagination.page, search]
  );

  useEffect(() => {
    fetchOpportunities(1);
  }, [companyFilter, hiringStatusFilter, opportunityTypeFilter, jobRoleFilter, search]);

  const handleJdFileChange = async (e, oppId) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingJd(true);
      try {
        const res = await opportunityService.uploadJdDocument(oppId, file);
        if (res.success) {
          alert('JD document uploaded successfully');
          fetchOpportunities(pagination.page);
        }
      } catch (err) {
        alert(err.response?.data?.error?.message || 'Failed to upload JD');
      } finally {
        setUploadingJd(false);
      }
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
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
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Multiple Profiles</span>;
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
            <Briefcase className="w-7 h-7 text-indigo-600" />
            Job Opportunities
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Hiring requirements, job descriptions, and CTC intake captured for your assigned companies.
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
            placeholder="Search profile, company, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white max-w-[180px]"
          >
            <option value="">All Companies</option>
            {assignedCompanies.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={hiringStatusFilter}
            onChange={(e) => setHiringStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            <option value="">All Hiring Statuses</option>
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
            <option value="">All Profile Types</option>
            <option value="FULL_TIME">Full-Time</option>
            <option value="INTERNSHIP">Internship</option>
            <option value="INTERNSHIP_PPO">Internship + PPO</option>
            <option value="MULTIPLE">Multiple Profiles</option>
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
            <span className="text-sm">Loading job opportunities...</span>
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
              No job profiles match your current filter settings. Click "+ Add Opportunity" to capture a new role.
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
                  <th className="py-3 px-4">Compensation / Stipend</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Hiring Status</th>
                  <th className="py-3 px-4">JD Document</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {opportunities.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-[180px]">
                      {item.company ? (
                        <Link
                          to={`/team-member/companies/${item.company.id}`}
                          className="hover:text-indigo-600 flex items-center gap-1.5 truncate"
                        >
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{item.company.name}</span>
                        </Link>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <Link
                        to={`/team-member/opportunities/${item.id}`}
                        className="font-bold text-slate-900 hover:text-indigo-600 block truncate"
                      >
                        {item.title}
                      </Link>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Openings: {item.openings || 'N/A'} &bull; {item.candidateType}
                      </div>
                    </td>
                    <td className="py-3 px-4">{getOppTypeBadge(item.opportunityType)}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <div>{item.salary || item.stipend || '—'}</div>
                      {item.salary && item.stipend && (
                        <div className="text-[11px] text-slate-500 font-normal">Stipend: {item.stipend}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{item.location || 'Flexible'}</span>
                      </div>
                      {item.workMode && (
                        <div className="text-[10px] text-slate-500 uppercase font-mono mt-0.5">{item.workMode}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(item.hiringStatus)}</td>
                    <td className="py-3 px-4">
                      {item.jdDocument ? (
                        <a
                          href={opportunityService.getJdDownloadUrl(item.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded font-semibold transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[100px]">{item.jdDocument.originalFileName}</span>
                          <Download className="w-3 h-3" />
                        </a>
                      ) : (
                        <label className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 cursor-pointer">
                          <Upload className="w-3 h-3" />
                          <span>Attach JD</span>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            className="hidden"
                            onChange={(e) => handleJdFileChange(e, item.id)}
                          />
                        </label>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/team-member/opportunities/${item.id}`}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                          title="View Opportunity Details"
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
