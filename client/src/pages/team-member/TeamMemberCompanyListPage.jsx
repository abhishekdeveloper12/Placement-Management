import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import assignmentService from '../../services/assignment.service';
import interactionService from '../../services/interaction.service';
import Badge from '../../components/common/Badge';
import QuickCallModal from '../../components/outreach/QuickCallModal';
import AddSelfDiscoveredCompanyModal from '../../components/companies/AddSelfDiscoveredCompanyModal';
import {
  Building2,
  Search,
  RefreshCw,
  Globe,
  MapPin,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  X,
  PhoneCall,
  Plus,
  Clock,
  FileText,
  CheckCircle2,
  User,
  Briefcase,
} from 'lucide-react';

export default function TeamMemberCompanyListPage() {
  const [companies, setCompanies] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [counts, setCounts] = useState({ all: 0, toContact: 0, contacted: 0, followUpDue: 0 });
  const [outreachTab, setOutreachTab] = useState('TO_CONTACT');

  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [callModalTarget, setCallModalTarget] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Feedback detail modal state
  const [selectedInteraction, setSelectedInteraction] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);

  const fetchAssignedCompanies = useCallback(
    async (page = pagination.page) => {
      setLoading(true);
      setError(null);
      try {
        const response = await assignmentService.getTeamMemberAssignedCompanies({
          page,
          limit: pagination.limit,
          search,
          industry: industryFilter,
          city: cityFilter,
          outreachStatus: outreachTab,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });

        if (response.success) {
          setCompanies(response.data);
          setPagination(response.meta || { page, limit: 10, total: response.data.length, totalPages: 1 });
          if (response.meta?.counts) {
            setCounts(response.meta.counts);
          }
        }
      } catch (err) {
        console.error('Failed to fetch assigned companies:', err);
        setError(err.response?.data?.error?.message || 'Failed to load assigned companies');
      } finally {
        setLoading(false);
      }
    },
    [cityFilter, industryFilter, outreachTab, pagination.limit, pagination.page, search]
  );

  useEffect(() => {
    fetchAssignedCompanies(1);
  }, [search, industryFilter, cityFilter, outreachTab]);

  const handleTabChange = (newTab) => {
    if (newTab !== outreachTab) {
      setOutreachTab(newTab);
    }
  };

  const handleViewFeedback = async (company) => {
    setFeedbackLoading(true);
    setFeedbackError(null);
    setSelectedInteraction(null);
    try {
      const res = await interactionService.getCompanyInteractions(company.id, { limit: 1 });
      if (res.success && res.data && res.data.length > 0) {
        setSelectedInteraction(res.data[0]);
      } else {
        setFeedbackError(`No logged HR outreach feedback found for ${company.companyName}.`);
      }
    } catch (err) {
      console.error('Failed to fetch interaction details:', err);
      setFeedbackError(err.response?.data?.error?.message || 'Failed to fetch feedback details');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
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

  const renderOutreachBadge = (status) => {
    switch (status) {
      case 'CONTACTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Contacted
          </span>
        );
      case 'FOLLOW_UP_DUE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            Follow-up Due
          </span>
        );
      case 'TO_CONTACT':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
            To Contact
          </span>
        );
    }
  };

  const getHiringBadge = (status) => {
    switch (status) {
      case 'YES':
      case 'HIRING_NOW':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Hiring Now</span>;
      case 'HIRING_PLANNED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Hiring Planned</span>;
      case 'NOT_HIRING':
      case 'NO':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">Not Hiring</span>;
      case 'WAITING_FOR_JD':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">Waiting for JD</span>;
      case 'FOLLOW_UP_REQUIRED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Follow-Up Scheduled</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{status || 'N/A'}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Assigned Companies</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Corporate accounts allocated to you by your PMO for HR outreach and hiring intake.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Company</span>
          </button>
          <button
            onClick={() => fetchAssignedCompanies(pagination.page)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh List</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchAssignedCompanies(1)}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Feedback Error Alert */}
      {feedbackError && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{feedbackError}</span>
          </div>
          <button
            onClick={() => setFeedbackError(null)}
            className="text-xs font-semibold text-amber-700 hover:text-amber-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Outreach Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => handleTabChange('TO_CONTACT')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
            outreachTab === 'TO_CONTACT'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span>To Contact</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] ${
              outreachTab === 'TO_CONTACT' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600 font-semibold'
            }`}
          >
            {counts.toContact}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('CONTACTED')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
            outreachTab === 'CONTACTED'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span>Contacted</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] ${
              outreachTab === 'CONTACTED' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 font-semibold'
            }`}
          >
            {counts.contacted}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('FOLLOW_UP_DUE')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
            outreachTab === 'FOLLOW_UP_DUE'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span>Follow-up Due</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] ${
              outreachTab === 'FOLLOW_UP_DUE' ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600 font-semibold'
            }`}
          >
            {counts.followUpDue}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('ALL')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
            outreachTab === 'ALL'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span>All Assigned</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] ${
              outreachTab === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 font-semibold'
            }`}
          >
            {counts.all}
          </span>
        </button>
      </div>

      {/* Search Bar & Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search assigned company name, industry, city, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <input
            type="text"
            placeholder="Filter by city..."
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 bg-white w-36 placeholder:text-slate-400"
          />

          {(search || cityFilter || industryFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setCityFilter('');
                setIndustryFilter('');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Companies Roster Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Company Name</th>
                <th className="px-6 py-3.5">Industry</th>
                <th className="px-6 py-3.5">Location</th>
                <th className="px-6 py-3.5">Primary HR Contact</th>
                <th className="px-6 py-3.5">Outreach Status</th>
                <th className="px-6 py-3.5">Last Contacted</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading && companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Loading assigned company pipeline...</span>
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    {outreachTab === 'TO_CONTACT' ? (
                      <div>
                        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                        <p className="text-base font-bold text-slate-800">All caught up! No companies pending first contact.</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          Every company allocated to you has been contacted or has scheduled follow-ups. Check the "Contacted" tab to review previous interactions.
                        </p>
                      </div>
                    ) : outreachTab === 'CONTACTED' ? (
                      <div>
                        <PhoneCall className="w-10 h-10 mx-auto mb-2 text-indigo-400" />
                        <p className="text-base font-bold text-slate-800">No contacted companies found</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          You haven't logged feedback for any assigned companies yet. Click "To Contact" to start making HR outreach calls.
                        </p>
                      </div>
                    ) : outreachTab === 'FOLLOW_UP_DUE' ? (
                      <div>
                        <Clock className="w-10 h-10 mx-auto mb-2 text-amber-400" />
                        <p className="text-base font-bold text-slate-800">No pending follow-ups due</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          You have no scheduled follow-up tasks due today or overdue.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <p className="text-base font-bold text-slate-800">No assigned companies found</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          {search || cityFilter
                            ? 'Try clearing search or filters to locate company records.'
                            : 'Your PMO has not assigned any company accounts to you yet. Please contact your placement officer.'}
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-200">
                          {company.companyName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <Link
                            to={`/team-member/companies/${company.id}`}
                            className="font-semibold text-slate-900 hover:text-emerald-600 transition-colors"
                          >
                            {company.companyName}
                          </Link>
                          {company.website && (
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <a
                                href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-emerald-600 flex items-center gap-0.5"
                              >
                                <Globe className="w-3 h-3" />
                                <span>{company.website.replace(/^https?:\/\//i, '')}</span>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {company.industry ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {company.industry}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-slate-600 text-[11px]">
                      {company.city || company.state || company.country ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>
                            {[company.city, company.state, company.country].filter(Boolean).join(', ')}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-slate-600 text-[11px]">
                      {company.primaryContact ? (
                        <div>
                          <div className="font-semibold text-slate-800">{company.primaryContact.name}</div>
                          {company.primaryContact.email && (
                            <div className="text-slate-400 font-mono text-[10px]">{company.primaryContact.email}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">No contact added</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {renderOutreachBadge(company.outreachStatus)}
                    </td>

                    <td className="px-6 py-4 text-slate-600 text-[11px]">
                      {company.lastContactedAt ? (
                        <div>
                          <div className="font-medium text-slate-800">{formatDate(company.lastContactedAt)}</div>
                          {company.lastOutcome && (
                            <div className="text-slate-400 text-[10px] mt-0.5">{company.lastOutcome}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No contact yet</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {company.outreachStatus === 'TO_CONTACT' && (
                          <button
                            onClick={() => setCallModalTarget(company)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>Call HR</span>
                          </button>
                        )}

                        {company.outreachStatus === 'CONTACTED' && (
                          <>
                            <button
                              onClick={() => handleViewFeedback(company)}
                              disabled={feedbackLoading}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Feedback</span>
                            </button>
                            <button
                              onClick={() => setCallModalTarget(company)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                              <span>Call Again</span>
                            </button>
                          </>
                        )}

                        {company.outreachStatus === 'FOLLOW_UP_DUE' && (
                          <>
                            <button
                              onClick={() => setCallModalTarget(company)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>Complete Follow-up</span>
                            </button>
                            <button
                              onClick={() => handleViewFeedback(company)}
                              disabled={feedbackLoading}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Feedback</span>
                            </button>
                          </>
                        )}

                        <Link
                          to={`/team-member/companies/${company.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Workspace</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-700">{companies.length}</span> of{' '}
              <span className="font-semibold text-slate-700">{pagination.total}</span> assigned companies
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1 || loading}
                onClick={() => fetchAssignedCompanies(pagination.page - 1)}
                className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-medium text-slate-700 px-1">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => fetchAssignedCompanies(pagination.page + 1)}
                className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Call Capture Modal */}
      <QuickCallModal
        isOpen={Boolean(callModalTarget)}
        onClose={() => setCallModalTarget(null)}
        onSuccess={() => fetchAssignedCompanies(pagination.page)}
        company={callModalTarget}
        primaryContact={callModalTarget?.primaryContact}
      />

      {/* Add Self-Discovered Company Modal */}
      <AddSelfDiscoveredCompanyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => fetchAssignedCompanies(1)}
      />

      {/* Submitted HR Call Feedback Detail Modal */}
      {selectedInteraction && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">HR Outreach Call Record & Feedback</h3>
                  <p className="text-xs text-slate-500">
                    Full call details collected during interaction
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInteraction(null)}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 text-xs">
              {/* Overview Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div className="text-slate-400 font-medium text-[11px]">Company</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {selectedInteraction.companyId?.companyName || selectedInteraction.company?.name || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium text-[11px]">Interaction Type</div>
                  <div className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1">
                    <PhoneCall className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{selectedInteraction.interactionType || 'PHONE_CALL'}</span>
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium text-[11px]">Hiring Status</div>
                  <div className="mt-1">
                    {getHiringBadge(selectedInteraction.callDetails?.hiringStatus || selectedInteraction.outcome)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium text-[11px]">Date & Time</div>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {formatDateTime(selectedInteraction.interactionDate || selectedInteraction.createdAt)}
                  </div>
                </div>
              </div>

              {/* HR Contact Info */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 text-indigo-700">
                  <User className="w-4 h-4 text-indigo-600" />
                  HR Contact Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Name:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.contactId?.name || 'Not Specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Designation:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.contactId?.designation || 'HR'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Phone:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.contactId?.phone || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Email:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.contactId?.email || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">LinkedIn:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.contactId?.linkedin ? (
                        <a
                          href={selectedInteraction.contactId.linkedin}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline"
                        >
                          View Profile
                        </a>
                      ) : (
                        '—'
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hiring Requirements */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 text-indigo-700">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  Hiring Requirements & Profiles
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Approx Openings:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {selectedInteraction.callDetails?.openings ?? 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Candidate Type:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.callDetails?.candidateType || 'BOTH'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Opportunity Type:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.callDetails?.opportunityType || 'FULL_TIME'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">PPO Availability:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.callDetails?.ppoAvailable || 'NOT_SURE'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-1">Target Job Roles / Profiles:</span>
                  {selectedInteraction.callDetails?.profiles && selectedInteraction.callDetails.profiles.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedInteraction.callDetails.profiles.map((role, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-xs font-medium"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">No specific profiles recorded</span>
                  )}
                </div>
              </div>

              {/* Work Location & Package */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 text-indigo-700">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  Work Location & Compensation Details
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Work Mode:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.callDetails?.workMode || 'NOT_SPECIFIED'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Job Location:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.callDetails?.location || 'Not Specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Salary / Stipend:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.callDetails?.salaryOrStipend || 'Not Specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Bond / Service Agreement:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.callDetails?.bond || 'NOT_SURE'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Discussion Notes */}
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">HR Conversation Summary & Notes</label>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {selectedInteraction.notes ||
                      selectedInteraction.callDetails?.hrResponse ||
                      'No detailed notes provided.'}
                  </div>
                </div>

                {selectedInteraction.callDetails?.specificRequirement && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Specific Candidate Requirements</label>
                    <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {selectedInteraction.callDetails.specificRequirement}
                    </div>
                  </div>
                )}
              </div>

              {/* Follow-Up Details */}
              {selectedInteraction.followUp ? (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold flex items-center gap-1.5 text-amber-900 text-xs">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>Scheduled Follow-Up Task</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-200 text-amber-900">
                      {selectedInteraction.followUp.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div>
                      <span className="text-amber-800 font-medium block">Due Date:</span>
                      <span className="font-bold text-amber-950">
                        {formatDateTime(selectedInteraction.followUp.dueDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-amber-800 font-medium block">Reason / Task Notes:</span>
                      <span className="text-amber-900">{selectedInteraction.followUp.reason}</span>
                    </div>
                  </div>
                </div>
              ) : selectedInteraction.nextAction === 'FOLLOW_UP' ? (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-900">
                  <div className="font-semibold">Follow-Up Requested</div>
                  <div className="text-[11px] text-amber-800 mt-0.5">
                    Follow-up date: {formatDateTime(selectedInteraction.followUpDate)}
                  </div>
                </div>
              ) : null}

              {/* Modal Footer */}
              <div className="pt-3 flex justify-end border-t border-slate-100">
                <button
                  onClick={() => setSelectedInteraction(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold cursor-pointer transition-colors"
                >
                  Close Feedback Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
