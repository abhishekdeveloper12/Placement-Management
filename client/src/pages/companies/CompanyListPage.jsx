import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '../../utils/zodResolver';
import { selectCurrentUser } from '../../features/auth/authSlice';
import companyService from '../../services/company.service';
import superAdminService from '../../services/superAdmin.service';
import pmoService from '../../services/pmo.service';
import interactionService from '../../services/interaction.service';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import BulkAssignModal from '../../components/companies/BulkAssignModal';
import {
  Building2,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Power,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
  Eye,
  Globe,
  MapPin,
  Briefcase,
  UserCheck,
  UserX,
  User,
  UploadCloud,
  Download,
  ChevronDown,
  Clock,
  PhoneCall,
  FileSpreadsheet,
  CheckSquare,
  FileText,
  Trash2,
} from 'lucide-react';

// Zod schema for creating Company
const createCompanySchema = z.object({
  organizationId: z.string().optional(),
  companyName: z.string().min(2, 'Company name must be at least 2 characters').max(150),
  industry: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
  country: z.string().default('India'),
  state: z.string().optional(),
  city: z.string().optional(),
  location: z.string().optional(),
  remarks: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  contactName: z.string().optional(),
  contactDesignation: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
});

// Zod schema for editing Company
const editCompanySchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters').max(150),
  industry: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
  country: z.string().default('India'),
  state: z.string().optional(),
  city: z.string().optional(),
  location: z.string().optional(),
  remarks: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  contactName: z.string().optional(),
  contactDesignation: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
});

export default function CompanyListPage() {
  const currentUser = useSelector(selectCurrentUser);
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isPMO = currentUser?.role === 'PMO';

  const [searchParams, setSearchParams] = useSearchParams();

  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    inactiveCompanies: 0,
    assignedCompanies: 0,
    unassignedCompanies: 0,
    contactedCompanies: 0,
    toContactCompanies: 0,
    followUpDueCompanies: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [organizations, setOrganizations] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  // Search and filter state initialized from URL query params
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [industryFilter, setIndustryFilter] = useState(searchParams.get('industry') || '');
  const [cityFilter, setCityFilter] = useState(searchParams.get('city') || '');
  const [orgFilter, setOrgFilter] = useState(searchParams.get('organizationId') || '');
  const [sourceFilter, setSourceFilter] = useState(searchParams.get('source') || 'ALL');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState(searchParams.get('assignmentStatus') || 'ALL');
  const [assignedToFilter, setAssignedToFilter] = useState(searchParams.get('assignedTo') || '');
  const [outreachStatusFilter, setOutreachStatusFilter] = useState(searchParams.get('outreachStatus') || 'ALL');
  const [hiringStatusFilter, setHiringStatusFilter] = useState(searchParams.get('hiringStatus') || 'ALL');

  // Excel Export State
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [includeHistoryExport, setIncludeHistoryExport] = useState(false);
  const exportMenuRef = useRef(null);

  // Checkbox Selection state for Bulk Assignment
  const [selectedCompaniesMap, setSelectedCompaniesMap] = useState(new Map());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);

  // Bulk Assign Modal
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);

  // Status confirm modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [statusTargetCompany, setStatusTargetCompany] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Feedback detail modal state
  const [selectedFeedbackInteraction, setSelectedFeedbackInteraction] = useState(null);
  const [feedbackModalLoading, setFeedbackModalLoading] = useState(false);
  const [feedbackModalError, setFeedbackModalError] = useState(null);

  // Page Jump state
  const [jumpPageInput, setJumpPageInput] = useState('');

  // Bulk Delete Modal state
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // Single Delete Modal state
  const [isSingleDeleteConfirmOpen, setIsSingleDeleteConfirmOpen] = useState(false);
  const [deleteTargetCompany, setDeleteTargetCompany] = useState(null);
  const [singleDeleteLoading, setSingleDeleteLoading] = useState(false);

  // Form hooks
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors, isSubmitting: isCreating },
  } = useForm({
    resolver: zodResolver(createCompanySchema),
    defaultValues: { country: 'India', status: 'ACTIVE' },
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isEditing },
  } = useForm({
    resolver: zodResolver(editCompanySchema),
  });

  // Close export dropdown menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Organizations for Super Admin dropdown & Team Members for PMO dropdown
  useEffect(() => {
    if (isSuperAdmin) {
      superAdminService
        .getOrganizations({ limit: 100, status: 'ACTIVE' })
        .then((res) => {
          if (res.success) setOrganizations(res.data);
        })
        .catch((err) => console.error('Failed to load organizations for filter:', err));
    }

    if (isPMO) {
      pmoService
        .getTeamMembers({ limit: 100, status: 'ACTIVE' })
        .then((res) => {
          if (res.success) setTeamMembers(res.data);
        })
        .catch((err) => console.error('Failed to load team members for assignment filter:', err));
    }
  }, [isSuperAdmin, isPMO]);

  // Fetch Stats & Company List
  const fetchCompanyData = useCallback(
    async (page = pagination.page) => {
      setLoading(true);
      setError(null);
      try {
        const [statsRes, companiesRes] = await Promise.all([
          companyService.getCompanyStats(),
          companyService.getCompanies({
            page,
            limit: pagination.limit,
            search,
            status: statusFilter,
            industry: industryFilter,
            city: cityFilter,
            organizationId: isSuperAdmin ? orgFilter : undefined,
            source: sourceFilter,
            assignmentStatus: assignmentStatusFilter,
            assignedTo: assignedToFilter,
            outreachStatus: outreachStatusFilter,
            hiringStatus: hiringStatusFilter,
            sortBy: 'createdAt',
            sortOrder: 'desc',
          }),
        ]);

        if (statsRes.success) setStats(statsRes.data);
        if (companiesRes.success) {
          setCompanies(companiesRes.data);
          setPagination(companiesRes.meta || { page, limit: 10, total: companiesRes.data.length, totalPages: 1 });
          if (companiesRes.meta?.counts) {
            setStats((prev) => ({
              ...prev,
              ...companiesRes.meta.counts,
            }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch company database:', err);
        setError(err.response?.data?.error?.message || 'Failed to load central company database');
      } finally {
        setLoading(false);
      }
    },
    [
      assignedToFilter,
      assignmentStatusFilter,
      cityFilter,
      hiringStatusFilter,
      industryFilter,
      isSuperAdmin,
      orgFilter,
      outreachStatusFilter,
      pagination.limit,
      pagination.page,
      search,
      sourceFilter,
      statusFilter,
    ]
  );

  useEffect(() => {
    fetchCompanyData(1);
  }, [
    search,
    statusFilter,
    industryFilter,
    cityFilter,
    orgFilter,
    sourceFilter,
    assignmentStatusFilter,
    assignedToFilter,
    outreachStatusFilter,
    hiringStatusFilter,
  ]);

  // Handle Excel Export
  const handleExportExcel = async (exportScope = 'FILTERED') => {
    setExportLoading(true);
    try {
      const params = {
        search,
        status: statusFilter,
        industry: industryFilter,
        city: cityFilter,
        organizationId: isSuperAdmin ? orgFilter : undefined,
        source: sourceFilter,
        assignmentStatus: assignmentStatusFilter,
        assignedTo: assignedToFilter,
        outreachStatus: outreachStatusFilter,
        hiringStatus: hiringStatusFilter,
        exportScope,
        includeHistory: includeHistoryExport,
      };

      const res = await companyService.exportCompanies(params);
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      let filename = `placement-company-database-${new Date().toISOString().split('T')[0]}.xlsx`;
      const disposition = res.headers?.['content-disposition'];
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setActionSuccess(`Company database successfully exported to "${filename}"`);
      setIsExportMenuOpen(false);
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      console.error('Export error:', err);
      alert(err.response?.data?.error?.message || 'Failed to export company database to Excel');
    } finally {
      setExportLoading(false);
    }
  };

  // Checkbox selection logic across pages
  const handleSelectAll = (e) => {
    const isChecked = e.target.checked;
    setSelectedCompaniesMap((prev) => {
      const updated = new Map(prev);
      if (isChecked) {
        companies.forEach((c) => updated.set(c.id, c));
      } else {
        companies.forEach((c) => updated.delete(c.id));
      }
      return updated;
    });
  };

  const handleSelectCompany = (company) => {
    setSelectedCompaniesMap((prev) => {
      const updated = new Map(prev);
      if (updated.has(company.id)) {
        updated.delete(company.id);
      } else {
        updated.set(company.id, company);
      }
      return updated;
    });
  };

  const isAllSelected = companies.length > 0 && companies.every((c) => selectedCompaniesMap.has(c.id));
  const selectedCompaniesList = Array.from(selectedCompaniesMap.values());
  const selectedCount = selectedCompaniesMap.size;

  // Handle Create Company
  const onSubmitCreate = async (data) => {
    try {
      const payload = {
        companyName: data.companyName,
        industry: data.industry || undefined,
        website: data.website || undefined,
        linkedin: data.linkedin || undefined,
        country: data.country || 'India',
        state: data.state || undefined,
        city: data.city || undefined,
        location: data.location || undefined,
        remarks: data.remarks || undefined,
        status: data.status,
      };

      if (isSuperAdmin) {
        if (!data.organizationId) {
          alert('Please select an organization for this company.');
          return;
        }
        payload.organizationId = data.organizationId;
      }

      if (data.contactName && data.contactName.trim() !== '') {
        payload.primaryContact = {
          name: data.contactName,
          designation: data.contactDesignation || undefined,
          email: data.contactEmail || undefined,
          phone: data.contactPhone || undefined,
        };
      }

      const response = await companyService.createCompany(payload);
      if (response.success) {
        setActionSuccess(`Company "${response.data.companyName}" created successfully.`);
        setIsCreateOpen(false);
        resetCreate();
        fetchCompanyData(1);
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Create company error:', err);
      alert(err.response?.data?.error?.message || 'Failed to create company');
    }
  };

  // Open Edit Modal
  const openEditModal = (company) => {
    setSelectedCompany(company);
    resetEdit({
      companyName: company.companyName,
      industry: company.industry || '',
      website: company.website || '',
      linkedin: company.linkedin || '',
      country: company.country || 'India',
      state: company.state || '',
      city: company.city || '',
      location: company.location || '',
      remarks: company.remarks || '',
      status: company.status,
      contactName: company.primaryContact?.name || '',
      contactDesignation: company.primaryContact?.designation || '',
      contactEmail: company.primaryContact?.email || '',
      contactPhone: company.primaryContact?.phone || '',
    });
    setIsEditOpen(true);
  };

  // Handle Edit Company
  const onSubmitEdit = async (data) => {
    if (!selectedCompany) return;
    try {
      const payload = {
        companyName: data.companyName,
        industry: data.industry || '',
        website: data.website || '',
        linkedin: data.linkedin || '',
        country: data.country || 'India',
        state: data.state || '',
        city: data.city || '',
        location: data.location || '',
        remarks: data.remarks || '',
        status: data.status,
      };

      if (data.contactName && data.contactName.trim() !== '') {
        payload.primaryContact = {
          name: data.contactName,
          designation: data.contactDesignation || '',
          email: data.contactEmail || '',
          phone: data.contactPhone || '',
        };
      }

      const response = await companyService.updateCompany(selectedCompany.id, payload);
      if (response.success) {
        setActionSuccess(`Company "${response.data.companyName}" updated successfully.`);
        setIsEditOpen(false);
        setSelectedCompany(null);
        fetchCompanyData(pagination.page);
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Update company error:', err);
      alert(err.response?.data?.error?.message || 'Failed to update company');
    }
  };

  // Status Confirm Dialog
  const openStatusConfirm = (company) => {
    setStatusTargetCompany(company);
    setIsConfirmOpen(true);
  };

  const handleToggleStatus = async () => {
    if (!statusTargetCompany) return;
    setStatusLoading(true);
    const newStatus = statusTargetCompany.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const response = await companyService.updateCompanyStatus(statusTargetCompany.id, newStatus);
      if (response.success) {
        setActionSuccess(
          `Company "${statusTargetCompany.companyName}" status updated to ${newStatus}.`
        );
        setIsConfirmOpen(false);
        setStatusTargetCompany(null);
        fetchCompanyData(pagination.page);
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Status toggle error:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  // Handle Direct Page Jump Submit
  const handlePageJumpSubmit = (e) => {
    e.preventDefault();
    const targetPage = Number(jumpPageInput);
    if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= pagination.totalPages) {
      fetchCompanyData(targetPage);
      setJumpPageInput('');
    }
  };

  // Handle Bulk Delete Execution
  const handleBulkDelete = async () => {
    const selectedIds = Array.from(selectedCompaniesMap.keys());
    if (selectedIds.length === 0) return;

    try {
      setBulkDeleteLoading(true);
      setError(null);
      const res = await companyService.bulkDeleteCompanies(selectedIds);
      setActionSuccess(`Successfully deleted ${res.data?.deletedCount || selectedIds.length} company records.`);
      setSelectedCompaniesMap(new Map());
      setIsBulkDeleteConfirmOpen(false);

      // Refresh list & stats
      fetchCompanyData(pagination.page > 1 ? pagination.page : 1);
      fetchStats();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      console.error('Failed to bulk delete companies:', err);
      setError(err.response?.data?.error?.message || 'Failed to delete selected companies');
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // Handle Single Delete Execution
  const handleSingleDelete = async () => {
    if (!deleteTargetCompany) return;

    try {
      setSingleDeleteLoading(true);
      setError(null);
      await companyService.deleteCompany(deleteTargetCompany.id);
      setActionSuccess(`Company "${deleteTargetCompany.companyName}" was deleted successfully.`);
      setIsSingleDeleteConfirmOpen(false);
      setDeleteTargetCompany(null);

      // Refresh list & stats
      fetchCompanyData(pagination.page);
      fetchStats();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      console.error('Failed to delete company:', err);
      setError(err.response?.data?.error?.message || 'Failed to delete company');
    } finally {
      setSingleDeleteLoading(false);
    }
  };

  const detailPath = (id) => (isSuperAdmin ? `/super-admin/companies/${id}` : `/pmo/companies/${id}`);

  const handleViewFeedback = async (company) => {
    setFeedbackModalError(null);
    if (company.latestInteraction) {
      const inter = { ...company.latestInteraction };
      if (!inter.user && company.lastContactedBy) {
        inter.user = company.lastContactedBy;
      }
      setSelectedFeedbackInteraction(inter);
      return;
    }
    setFeedbackModalLoading(true);
    try {
      const res = await interactionService.getCompanyInteractions(company.id, { limit: 1 });
      if (res.success && res.data && res.data.length > 0) {
        setSelectedFeedbackInteraction(res.data[0]);
      } else {
        setFeedbackModalError(`No logged HR outreach feedback found for ${company.companyName}.`);
        setSelectedFeedbackInteraction({
          companyName: company.companyName,
          notes: 'No HR call feedback recorded yet.',
        });
      }
    } catch (err) {
      console.error('Failed to fetch interaction details:', err);
      setFeedbackModalError(err.response?.data?.error?.message || 'Failed to fetch feedback details');
    } finally {
      setFeedbackModalLoading(false);
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

  const renderSourceBadge = (source) => {
    switch (source) {
      case 'TEAM_MEMBER_SELF_ADDED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Team Member Self-Added
          </span>
        );
      case 'BULK_IMPORT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            Bulk Import
          </span>
        );
      case 'MANUAL_PMO':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            PMO Created
          </span>
        );
    }
  };

  const renderOutreachBadge = (status) => {
    switch (status) {
      case 'CONTACTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Contacted
          </span>
        );
      case 'FOLLOW_UP_DUE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            Follow-up Due
          </span>
        );
      case 'TO_CONTACT':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
            To Contact
          </span>
        );
    }
  };

  const renderHiringBadge = (status) => {
    switch (status) {
      case 'YES':
      case 'HIRING_NOW':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Hiring Now</span>;
      case 'HIRING_PLANNED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">Hiring Planned</span>;
      case 'NOT_HIRING':
      case 'NO':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">Not Hiring</span>;
      case 'WAITING_FOR_JD':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">Waiting for JD</span>;
      case 'FOLLOW_UP_REQUIRED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">Follow-Up Scheduled</span>;
      case 'NO_RESPONSE':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">No Response</span>;
      default:
        return <span className="text-slate-400 italic">Unspecified</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Company Database</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Central operational master repository of all corporate employer accounts registered via bulk import, PMO creation, or Team Member self-registration.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => fetchCompanyData(pagination.page)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Refresh database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to={isSuperAdmin ? '/super-admin/companies/import' : '/pmo/companies/import'}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-indigo-600" />
            <span>Upload Excel / CSV</span>
          </Link>

          {/* Export Excel Dropdown Menu */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              disabled={exportLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              {exportLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              )}
              <span>Export Excel</span>
              <ChevronDown className="w-3.5 h-3.5 text-emerald-700" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-3 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-1">
                  Download Options (.xlsx)
                </div>

                <div className="px-2 py-1 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeHistoryCheckbox"
                    checked={includeHistoryExport}
                    onChange={(e) => setIncludeHistoryExport(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="includeHistoryCheckbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Include Outreach History Sheet
                  </label>
                </div>

                <div className="divide-y divide-slate-100">
                  <button
                    onClick={() => handleExportExcel('FILTERED')}
                    disabled={exportLoading}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-900 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>Export Current Filtered Results</span>
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    onClick={() => handleExportExcel('ALL')}
                    disabled={exportLoading}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-900 rounded-lg transition-colors flex items-center justify-between cursor-pointer pt-2"
                  >
                    <span>Export All Organization Companies</span>
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              resetCreate({ country: 'India', status: 'ACTIVE' });
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Company</span>
          </button>
        </div>
      </div>

      {/* Action Success Alert */}
      {actionSuccess && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm flex items-center gap-2 shadow-xs transition-all">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchCompanyData(1)}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Metric Stats KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-2">
            {loading ? '...' : (stats.totalCompanies ?? stats.all ?? 0)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-emerald-700 mt-2">
            {loading ? '...' : (stats.assignedCompanies ?? stats.assigned ?? 0)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unassigned</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-amber-700 mt-2">
            {loading ? '...' : (stats.unassignedCompanies ?? stats.unassigned ?? 0)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contacted</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-emerald-600 mt-2">
            {loading ? '...' : (stats.contactedCompanies ?? stats.contacted ?? 0)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">To Contact</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-indigo-600 mt-2">
            {loading ? '...' : (stats.toContactCompanies ?? stats.toContact ?? 0)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Follow-Up Due</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-rose-600 mt-2">
            {loading ? '...' : (stats.followUpDueCompanies ?? stats.followUpDue ?? 0)}
          </div>
        </div>
      </div>

      {/* BULK ACTION SELECTION BAR */}
      {isPMO && selectedCount > 0 && (
        <div className="bg-indigo-900 text-white border border-indigo-800 rounded-xl p-4 shadow-md flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-800 flex items-center justify-center font-bold text-xs">
              {selectedCount}
            </div>
            <div>
              <span className="text-sm font-bold">
                {selectedCount} {selectedCount === 1 ? 'company' : 'companies'} selected across pages
              </span>
              <p className="text-xs text-indigo-200">Assign, reassign, or delete selected companies within organization</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCompaniesMap(new Map())}
              className="px-3 py-1.5 text-xs font-medium text-indigo-200 hover:text-white cursor-pointer"
            >
              Deselect All
            </button>

            <button
              onClick={() => setIsBulkAssignOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-900 bg-white hover:bg-indigo-50 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-indigo-700" />
              <span>Assign Selected</span>
            </button>

            <button
              onClick={() => setIsBulkDeleteConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-100 bg-rose-700 hover:bg-rose-800 border border-rose-600 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-200" />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Search and Comprehensive Central Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search company name, industry, city, location, or HR contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
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

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Source Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 font-medium"
            >
              <option value="ALL">All Sources</option>
              <option value="BULK_IMPORT">Bulk Import</option>
              <option value="MANUAL_PMO">PMO Created</option>
              <option value="TEAM_MEMBER_SELF_ADDED">Team Member Self-Added</option>
              <option value="OTHER">Other</option>
            </select>

            {/* Assignment Status Filter */}
            {isPMO && (
              <select
                value={assignmentStatusFilter}
                onChange={(e) => setAssignmentStatusFilter(e.target.value)}
                className="text-xs py-2 px-3 rounded-lg border border-indigo-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-indigo-50/50 text-indigo-900 font-semibold"
              >
                <option value="ALL">All Allocations</option>
                <option value="ASSIGNED">Assigned Only</option>
                <option value="UNASSIGNED">Unassigned Only</option>
              </select>
            )}

            {/* Assigned To Team Member Filter */}
            {isPMO && (
              <select
                value={assignedToFilter}
                onChange={(e) => setAssignedToFilter(e.target.value)}
                className="text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 font-medium max-w-xs"
              >
                <option value="">All Team Members</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}

            {/* Outreach Status Filter */}
            <select
              value={outreachStatusFilter}
              onChange={(e) => setOutreachStatusFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-lg border border-emerald-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-emerald-50/50 text-emerald-900 font-semibold cursor-pointer"
            >
              <option value="ALL">All Outreach Statuses</option>
              <option value="TO_CONTACT">To Contact</option>
              <option value="CONTACTED">Contacted</option>
              <option value="FOLLOW_UP_DUE">Follow-up Due</option>
            </select>

            {/* Hiring Status Filter */}
            <select
              value={hiringStatusFilter}
              onChange={(e) => setHiringStatusFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-lg border border-purple-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500 bg-purple-50/50 text-purple-900 font-semibold cursor-pointer"
            >
              <option value="ALL">All Hiring Statuses</option>
              <option value="HIRING_NOW">Hiring Now</option>
              <option value="HIRING_PLANNED">Hiring Planned</option>
              <option value="NOT_HIRING">Not Hiring</option>
              <option value="WAITING_FOR_JD">Waiting for JD</option>
              <option value="FOLLOW_UP_REQUIRED">Follow-Up Scheduled</option>
              <option value="NO_RESPONSE">No Response</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 font-medium"
            >
              <option value="">All Account Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>

            <input
              type="text"
              placeholder="Filter city..."
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white w-28 placeholder:text-slate-400"
            />

            {isSuperAdmin && (
              <select
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                className="text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 font-medium max-w-xs"
              >
                <option value="">All Organizations</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.code})
                  </option>
                ))}
              </select>
            )}

            {(search || statusFilter || industryFilter || cityFilter || orgFilter || sourceFilter !== 'ALL' || assignmentStatusFilter !== 'ALL' || assignedToFilter || outreachStatusFilter !== 'ALL' || hiringStatusFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setIndustryFilter('');
                  setCityFilter('');
                  setOrgFilter('');
                  setSourceFilter('ALL');
                  setAssignmentStatusFilter('ALL');
                  setAssignedToFilter('');
                  setOutreachStatusFilter('ALL');
                  setHiringStatusFilter('ALL');
                  setSearchParams({});
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Currently Hiring Banner Notice */}
      {(hiringStatusFilter === 'HIRING_NOW' || hiringStatusFilter === 'YES') && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between gap-3 text-xs text-blue-900">
          <div className="flex items-center gap-2.5">
            <Briefcase className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <span className="font-bold text-blue-950 block">Currently Hiring View (Feedback-Driven)</span>
              <span className="text-blue-800">
                Displaying unique companies whose latest HR outreach call recorded active hiring (<strong className="font-bold">HIRING NOW</strong>). Sorted newest feedback first.
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setHiringStatusFilter('ALL');
              searchParams.delete('hiringStatus');
              setSearchParams(searchParams);
            }}
            className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg font-semibold shrink-0 transition-colors cursor-pointer"
          >
            Show All Companies
          </button>
        </div>
      )}

      {/* Companies Central Database Roster Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                {isPMO && (
                  <th className="px-4 py-3.5 w-10">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                )}
                <th className="px-6 py-3.5">Company Name</th>
                <th className="px-6 py-3.5">Industry</th>
                <th className="px-6 py-3.5">Location</th>
                <th className="px-6 py-3.5">Primary HR Contact</th>
                <th className="px-6 py-3.5">Source / Registered By</th>
                <th className="px-6 py-3.5">Current Assignment</th>
                <th className="px-6 py-3.5">Outreach</th>
                <th className="px-6 py-3.5">Hiring Status</th>
                <th className="px-6 py-3.5">Last Contacted</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading && companies.length === 0 ? (
                <tr>
                  <td colSpan={isPMO ? 11 : 10} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading central company database...</span>
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={isPMO ? 11 : 10} className="px-6 py-12 text-center text-slate-400">
                    <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-base font-bold text-slate-800">No companies found in database</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      {search || statusFilter || cityFilter || orgFilter || sourceFilter !== 'ALL' || assignmentStatusFilter !== 'ALL' || assignedToFilter || outreachStatusFilter !== 'ALL' || hiringStatusFilter !== 'ALL'
                        ? 'Try clearing active search or filters to locate company records.'
                        : 'Companies added through bulk import, PMO creation, or Team Member self-registration will automatically appear in this central database.'}
                    </p>
                    {isPMO && (
                      <div className="mt-4">
                        <Link
                          to="/pmo/companies/import"
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
                        >
                          <UploadCloud className="w-4 h-4" />
                          <span>Import Companies</span>
                        </Link>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                companies.map((company) => {
                  const isChecked = selectedCompaniesMap.has(company.id);
                  const assignedMember = company.currentAssignment?.assignedTo;

                  return (
                    <tr
                      key={company.id}
                      className={`hover:bg-slate-50/70 transition-colors ${isChecked ? 'bg-indigo-50/40' : ''}`}
                    >
                      {/* Checkbox (PMO) */}
                      {isPMO && (
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleSelectCompany(company)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                      )}

                      {/* Company Name & Links */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0 border border-indigo-200">
                            {company.companyName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <Link
                              to={detailPath(company.id)}
                              className="font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                            >
                              {company.companyName}
                            </Link>
                            {company.website && (
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                <a
                                  href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:text-indigo-600 flex items-center gap-0.5"
                                >
                                  <Globe className="w-3 h-3" />
                                  <span>{company.website.replace(/^https?:\/\//i, '')}</span>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Industry */}
                      <td className="px-6 py-4 text-slate-600">
                        {company.industry ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                            {company.industry}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Location */}
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

                      {/* Primary HR Contact */}
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

                      {/* Source & Registered By */}
                      <td className="px-6 py-4 text-slate-600 text-[11px]">
                        <div>
                          {renderSourceBadge(company.source)}
                          <div className="text-[10px] text-slate-400 mt-1">
                            By: {company.createdBy?.name || 'PMO / System'}
                          </div>
                        </div>
                      </td>

                      {/* Current Assignment */}
                      <td className="px-6 py-4 text-slate-600 text-[11px]">
                        {assignedMember ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <User className="w-3 h-3 text-emerald-600" />
                              <span>{assignedMember.name}</span>
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Outreach Status */}
                      <td className="px-6 py-4">
                        {renderOutreachBadge(company.outreachStatus)}
                      </td>

                      {/* Hiring Status */}
                      <td className="px-6 py-4">
                        {renderHiringBadge(company.lastOutcome)}
                      </td>

                      {/* Last Contacted */}
                      <td className="px-6 py-4 text-slate-600 text-[11px]">
                        {company.lastContactedAt ? (
                          <div>
                            <div className="font-medium text-slate-800">{formatDate(company.lastContactedAt)}</div>
                            {company.lastContactedBy && (
                              <div className="text-slate-400 text-[10px]">By: {company.lastContactedBy.name}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Never</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {company.lastContactedAt && (
                            <button
                              onClick={() => handleViewFeedback(company)}
                              className="p-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors shadow-2xs cursor-pointer"
                              title="View latest HR outreach feedback details"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <Link
                            to={detailPath(company.id)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-2xs"
                            title="View complete workspace"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            onClick={() => openEditModal(company)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
                            title="Edit profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => openStatusConfirm(company)}
                            className={`p-1.5 rounded-lg border transition-colors shadow-2xs cursor-pointer ${
                              company.status === 'ACTIVE'
                                ? 'border-slate-200 bg-white text-amber-600 hover:bg-amber-50'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                            title={company.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {(isPMO || isSuperAdmin) && (
                            <button
                              onClick={() => {
                                setDeleteTargetCompany(company);
                                setIsSingleDeleteConfirmOpen(true);
                              }}
                              className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors shadow-2xs cursor-pointer"
                              title="Delete company record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Interactive Pagination with Direct Page Selector & Jump Input */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-3 flex-wrap">
              <span>
                Showing <span className="font-semibold text-slate-800">{companies.length}</span> of{' '}
                <span className="font-semibold text-slate-800">{pagination.total}</span> employer records
              </span>

              {/* Direct Page Select Dropdown */}
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-slate-500 text-[11px]">Select Page:</span>
                <select
                  value={pagination.page}
                  onChange={(e) => fetchCompanyData(Number(e.target.value))}
                  disabled={loading}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-indigo-950 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                >
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                    <option key={p} value={p}>
                      Page {p} of {pagination.totalPages}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Direct Page Jump Input Form */}
              <form onSubmit={handlePageJumpSubmit} className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px]">Go to page:</span>
                <input
                  type="number"
                  min="1"
                  max={pagination.totalPages}
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  placeholder={String(pagination.page)}
                  className="w-14 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs text-center font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <button
                  type="submit"
                  disabled={!jumpPageInput || loading}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-semibold text-xs disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Go
                </button>
              </form>

              {/* Page Navigation Controls */}
              <div className="flex items-center gap-1">
                <button
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => fetchCompanyData(1)}
                  className="px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 font-medium cursor-pointer"
                  title="First Page"
                >
                  « First
                </button>
                <button
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => fetchCompanyData(pagination.page - 1)}
                  className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {/* Windowed Page Pill Buttons */}
                <div className="hidden sm:flex items-center gap-1 mx-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter((p) => Math.abs(p - pagination.page) <= 2 || p === 1 || p === pagination.totalPages)
                    .map((p, idx, arr) => {
                      const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                      return (
                        <React.Fragment key={p}>
                          {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                          <button
                            onClick={() => fetchCompanyData(p)}
                            disabled={loading}
                            className={`w-7 h-7 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                              pagination.page === p
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  disabled={pagination.page >= pagination.totalPages || loading}
                  onClick={() => fetchCompanyData(pagination.page + 1)}
                  className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages || loading}
                  onClick={() => fetchCompanyData(pagination.totalPages)}
                  className="px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 font-medium cursor-pointer"
                  title="Last Page"
                >
                  Last »
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE COMPANY MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          resetCreate();
        }}
        title="Add New Employer to Database"
      >
        <form onSubmit={handleCreateSubmit(onSubmitCreate)} className="space-y-4 text-xs">
          {isSuperAdmin && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Target Organization <span className="text-rose-500">*</span>
              </label>
              <select
                {...registerCreate('organizationId')}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Organization...</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.code})
                  </option>
                ))}
              </select>
              {createErrors.organizationId && (
                <p className="text-rose-600 text-[11px] mt-1">{createErrors.organizationId.message}</p>
              )}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Acme Technologies Ltd."
              {...registerCreate('companyName')}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {createErrors.companyName && (
              <p className="text-rose-600 text-[11px] mt-1">{createErrors.companyName.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Industry</label>
              <input
                type="text"
                placeholder="e.g. Information Technology"
                {...registerCreate('industry')}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Website</label>
              <input
                type="text"
                placeholder="https://example.com"
                {...registerCreate('website')}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                placeholder="e.g. Bangalore"
                {...registerCreate('city')}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                placeholder="e.g. Karnataka"
                {...registerCreate('state')}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Country</label>
              <input
                type="text"
                {...registerCreate('country')}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50"
              />
            </div>
          </div>

          {/* Optional Primary Contact section */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <h4 className="font-semibold text-slate-800 text-xs">Primary HR Contact (Optional)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">Contact Name</label>
                <input
                  type="text"
                  placeholder="HR Name"
                  {...registerCreate('contactName')}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Designation</label>
                <input
                  type="text"
                  placeholder="e.g. TA Lead"
                  {...registerCreate('contactDesignation')}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="hr@company.com"
                  {...registerCreate('contactEmail')}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 9876543210"
                  {...registerCreate('contactPhone')}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Employer</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT COMPANY MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedCompany(null);
        }}
        title={`Edit Profile: ${selectedCompany?.companyName || ''}`}
      >
        <form onSubmit={handleEditSubmit(onSubmitEdit)} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              {...registerEdit('companyName')}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {editErrors.companyName && (
              <p className="text-rose-600 text-[11px] mt-1">{editErrors.companyName.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Industry</label>
              <input
                type="text"
                {...registerEdit('industry')}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Website</label>
              <input
                type="text"
                {...registerEdit('website')}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                {...registerEdit('city')}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                {...registerEdit('state')}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Country</label>
              <input
                type="text"
                {...registerEdit('country')}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <h4 className="font-semibold text-slate-800 text-xs">Primary HR Contact</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">Contact Name</label>
                <input
                  type="text"
                  {...registerEdit('contactName')}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Designation</label>
                <input
                  type="text"
                  {...registerEdit('contactDesignation')}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Email Address</label>
                <input
                  type="email"
                  {...registerEdit('contactEmail')}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Phone Number</label>
                <input
                  type="text"
                  {...registerEdit('contactPhone')}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsEditOpen(false);
                setSelectedCompany(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isEditing}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {isEditing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Update Employer</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* STATUS TOGGLE CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setStatusTargetCompany(null);
        }}
        onConfirm={handleToggleStatus}
        title={statusTargetCompany?.status === 'ACTIVE' ? 'Deactivate Employer' : 'Activate Employer'}
        message={`Are you sure you want to change status for "${statusTargetCompany?.companyName || ''}" to ${
          statusTargetCompany?.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
        }?`}
        confirmText={statusTargetCompany?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        variant={statusTargetCompany?.status === 'ACTIVE' ? 'DANGER' : 'SUCCESS'}
        isLoading={statusLoading}
      />

      {/* BULK ASSIGNMENT MODAL (PMO) */}
      {isPMO && (
        <BulkAssignModal
          isOpen={isBulkAssignOpen}
          onClose={() => setIsBulkAssignOpen(false)}
          onSuccess={() => {
            setSelectedCompaniesMap(new Map());
            fetchCompanyData(pagination.page);
            setActionSuccess('Bulk company assignment updated successfully.');
            setTimeout(() => setActionSuccess(''), 4000);
          }}
          selectedCompanies={selectedCompaniesList}
          teamMembers={teamMembers}
        />
      )}

      {/* LATEST HR OUTREACH FEEDBACK DETAIL MODAL */}
      {selectedFeedbackInteraction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 block">
                  Latest HR Outreach Feedback
                </span>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mt-0.5">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                  <span>{selectedFeedbackInteraction.companyId?.companyName || selectedFeedbackInteraction.companyName || 'Employer'}</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedFeedbackInteraction(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs">
              {/* Feedback Collector & Timestamp */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-400 block text-[11px]">Collected By:</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{selectedFeedbackInteraction.userId?.name || selectedFeedbackInteraction.user?.name || 'Team Member / PMO'}</span>
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Outreach Date & Time:</span>
                  <span className="font-bold text-slate-900 block mt-0.5">
                    {formatDateTime(selectedFeedbackInteraction.interactionDate || selectedFeedbackInteraction.createdAt)}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Recorded Hiring Status:</span>
                  <div className="mt-0.5">
                    {renderHiringBadge(selectedFeedbackInteraction.callDetails?.hiringStatus || selectedFeedbackInteraction.outcome)}
                  </div>
                </div>
              </div>

              {/* Requirement & Profile Details */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 text-indigo-700">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  Open Roles & Intake Details
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Total Openings:</span>
                    <span className="font-extrabold text-blue-700 text-sm">
                      {selectedFeedbackInteraction.callDetails?.openings !== null && selectedFeedbackInteraction.callDetails?.openings !== undefined
                        ? selectedFeedbackInteraction.callDetails.openings
                        : 'Not Specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Candidate Type:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedFeedbackInteraction.callDetails?.candidateType || 'BOTH'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Opportunity Type:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedFeedbackInteraction.callDetails?.opportunityType || 'FULL_TIME'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">PPO Availability:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedFeedbackInteraction.callDetails?.ppoAvailable || 'NOT_SURE'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-1">Target Job Roles / Profiles:</span>
                  {selectedFeedbackInteraction.callDetails?.profiles && selectedFeedbackInteraction.callDetails.profiles.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFeedbackInteraction.callDetails.profiles.map((role, idx) => (
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

              {/* Work Location & Compensation */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 text-indigo-700">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  Work Location & Package Details
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Work Mode:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedFeedbackInteraction.callDetails?.workMode || 'NOT_SPECIFIED'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Job Location:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedFeedbackInteraction.callDetails?.location || 'Not Specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Salary / Stipend:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedFeedbackInteraction.callDetails?.salaryOrStipend || 'Not Specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Bond / Agreement:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedFeedbackInteraction.callDetails?.bond || 'NOT_SURE'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Conversation Notes */}
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">HR Conversation Notes & Feedback</label>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {selectedFeedbackInteraction.notes ||
                      selectedFeedbackInteraction.callDetails?.hrResponse ||
                      'No detailed notes provided.'}
                  </div>
                </div>

                {selectedFeedbackInteraction.callDetails?.specificRequirement && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Candidate Requirements</label>
                    <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {selectedFeedbackInteraction.callDetails.specificRequirement}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 flex justify-end border-t border-slate-100">
                <button
                  onClick={() => setSelectedFeedbackInteraction(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold cursor-pointer transition-colors"
                >
                  Close Feedback Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={isBulkDeleteConfirmOpen}
        onClose={() => setIsBulkDeleteConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        title="Confirm Bulk Deletion of Companies"
        message={`Are you sure you want to delete ${selectedCount} selected company record(s)? This action will safely remove the selected companies and all associated contacts, assignments, and outreach logs from your organization database. This action cannot be undone.`}
        confirmText="Yes, Delete Selected Companies"
        confirmVariant="danger"
        isLoading={bulkDeleteLoading}
      />

      {/* SINGLE DELETE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={isSingleDeleteConfirmOpen}
        onClose={() => {
          setIsSingleDeleteConfirmOpen(false);
          setDeleteTargetCompany(null);
        }}
        onConfirm={handleSingleDelete}
        title={`Delete Company "${deleteTargetCompany?.companyName || ''}"`}
        message={`Are you sure you want to delete "${deleteTargetCompany?.companyName || ''}"? This will permanently remove the company profile, primary contact, assignment history, and call logs from your organization database.`}
        confirmText="Yes, Delete Company"
        confirmVariant="danger"
        isLoading={singleDeleteLoading}
      />
    </div>
  );
}
