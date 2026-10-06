import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '../../utils/zodResolver';
import { selectCurrentUser } from '../../features/auth/authSlice';
import companyService from '../../services/company.service';
import assignmentService from '../../services/assignment.service';
import pmoService from '../../services/pmo.service';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  Building2,
  ChevronLeft,
  Globe,
  Linkedin,
  MapPin,
  Edit2,
  Power,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Briefcase,
  AlertCircle,
  Loader2,
  CheckCircle2,
  FileText,
  PhoneCall,
  Layers,
  UserCheck,
  UserX,
  History,
  Users,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

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

export default function CompanyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isPMO = currentUser?.role === 'PMO';

  const [company, setCompany] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');

  // Modals
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  // Assignment Modals State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isUnassignConfirmOpen, setIsUnassignConfirmOpen] = useState(false);
  const [assignMemberId, setAssignMemberId] = useState('');
  const [assignReason, setAssignReason] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [unassignReason, setUnassignReason] = useState('');

  // Team Member Feedback Filters State
  const [feedbackMemberFilter, setFeedbackMemberFilter] = useState('ALL');
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState('ALL');
  const [expandedInteractionId, setExpandedInteractionId] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(editCompanySchema),
  });

  const fetchCompany = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await companyService.getCompany(id);
      if (response.success) {
        setCompany(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch company profile:', err);
      setError(
        err.response?.status === 404
          ? 'Company record not found or access is restricted by tenant boundary.'
          : err.response?.data?.error?.message || 'Failed to load company details'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCompany();

    if (isPMO) {
      pmoService
        .getTeamMembers({ limit: 100, status: 'ACTIVE' })
        .then((res) => {
          if (res.success) setTeamMembers(res.data);
        })
        .catch((err) => console.error('Failed to load team members:', err));
    }
  }, [fetchCompany, isPMO]);

  const backPath = isSuperAdmin ? '/super-admin/companies' : '/pmo/companies';

  const openEditModal = () => {
    if (!company) return;
    reset({
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

  const onSubmitEdit = async (data) => {
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

      const response = await companyService.updateCompany(id, payload);
      if (response.success) {
        setActionSuccess(`Company "${response.data.companyName}" updated successfully.`);
        setIsEditOpen(false);
        fetchCompany();
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Update company error:', err);
      alert(err.response?.data?.error?.message || 'Failed to update company profile');
    }
  };

  const handleToggleStatus = async () => {
    if (!company) return;
    setStatusLoading(true);
    const newStatus = company.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const response = await companyService.updateCompanyStatus(id, newStatus);
      if (response.success) {
        setActionSuccess(`Status updated to ${newStatus}.`);
        setIsConfirmOpen(false);
        fetchCompany();
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Status toggle error:', err);
      alert(err.response?.data?.error?.message || 'Failed to toggle status');
    } finally {
      setStatusLoading(false);
    }
  };

  // Open Assign / Reassign Modal
  const openAssignModal = () => {
    setAssignMemberId(company.currentAssignment?.assignedTo?.id || '');
    setAssignReason('');
    setIsAssignModalOpen(true);
  };

  // Handle Assign / Reassign Submission
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignMemberId) {
      alert('Please select a Team Member');
      return;
    }

    setAssignSubmitting(true);
    try {
      const res = await assignmentService.assignCompany({
        companyId: company.id,
        assignedTo: assignMemberId,
        reason: assignReason.trim() || undefined,
      });

      if (res.success) {
        setActionSuccess(res.message);
        setIsAssignModalOpen(false);
        fetchCompany();
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Assign error:', err);
      alert(err.response?.data?.error?.message || 'Failed to assign company');
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Handle Unassign Submission
  const handleUnassignSubmit = async () => {
    setAssignSubmitting(true);
    try {
      const res = await assignmentService.unassignCompany(company.id, {
        reason: unassignReason.trim() || undefined,
      });

      if (res.success) {
        setActionSuccess(`Company "${company.companyName}" is now unassigned.`);
        setIsUnassignConfirmOpen(false);
        setUnassignReason('');
        fetchCompany();
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Unassign error:', err);
      alert(err.response?.data?.error?.message || 'Failed to unassign company');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
        <p className="text-sm font-semibold text-slate-700">Loading company profile...</p>
        <p className="text-xs text-slate-400 mt-1">Verifying tenant boundaries and metadata</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="space-y-6">
        <Link
          to={backPath}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Companies</span>
        </Link>
        <div className="p-8 rounded-xl border border-rose-200 bg-rose-50 text-center max-w-xl mx-auto shadow-xs">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-rose-900">Resource Unavailable</h2>
          <p className="text-xs text-rose-700 mt-1 leading-relaxed">
            {error || 'The requested company profile could not be found or access is restricted by tenant policy.'}
          </p>
          <button
            onClick={() => navigate(backPath)}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors shadow-xs"
          >
            Return to Company Master Directory
          </button>
        </div>
      </div>
    );
  }

  const currentAssignment = company.currentAssignment;
  const assignmentHistory = company.assignmentHistory || [];
  const interactions = company.interactions || [];

  // Extract unique Team Members who logged feedback for this company
  const interactionTeamMembers = Array.from(
    new Map(
      interactions
        .filter((item) => item.userId && (item.userId.id || item.userId._id || item.userId.name))
        .map((item) => {
          const u = item.userId;
          const memberId = (u.id || u._id || u.email || '').toString();
          return [memberId, { id: memberId, name: u.name || 'Team Member', email: u.email || '' }];
        })
    ).values()
  );

  // Filter interactions based on selection
  const filteredInteractions = interactions.filter((item) => {
    if (feedbackMemberFilter !== 'ALL') {
      const u = item.userId;
      const uId = u ? (u.id || u._id || u.email || '').toString() : '';
      if (uId !== feedbackMemberFilter) return false;
    }
    if (feedbackTypeFilter !== 'ALL') {
      if (item.interactionType !== feedbackTypeFilter) return false;
    }
    return true;
  });

  // Calculate summary metrics
  const uniqueMembersCount = new Set(
    interactions
      .filter((i) => i.userId)
      .map((i) => (i.userId.id || i.userId._id || i.userId.email || '').toString())
  ).size;
  const latestInteraction = company.latestInteraction || (interactions.length > 0 ? interactions[0] : null);
  const latestHiringStatus = latestInteraction?.callDetails?.hiringStatus || latestInteraction?.outcome || 'NOT_SURE';

  const getOutcomeVariant = (outcome) => {
    switch (outcome) {
      case 'HIRING_NOW':
      case 'YES':
        return 'SUCCESS';
      case 'HIRING_PLANNED':
      case 'WAITING_FOR_JD':
      case 'INTERNSHIP_PPO':
        return 'INFO';
      case 'NOT_HIRING':
      case 'NO':
        return 'DANGER';
      case 'FOLLOW_UP_REQUIRED':
      case 'NO_RESPONSE':
      case 'NOT_SURE':
      default:
        return 'WARNING';
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          to={backPath}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Company Directory</span>
        </Link>
      </div>

      {/* Action Success Alert */}
      {actionSuccess && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm flex items-center gap-2 shadow-xs transition-all">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 font-bold text-xl flex items-center justify-center shrink-0 border border-indigo-200 shadow-2xs">
            {company.companyName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{company.companyName}</h1>
              <Badge variant={company.status}>{company.status}</Badge>
              {isSuperAdmin && company.organizationId && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                  {company.organizationId.name} ({company.organizationId.code})
                </span>
              )}
              {company.source === 'TEAM_MEMBER_SELF_ADDED' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Team Member Self-Added
                </span>
              ) : company.source === 'BULK_IMPORT' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  Bulk Import
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  PMO Created
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 flex-wrap">
              {company.createdBy?.name && (
                <span className="flex items-center gap-1 font-medium text-slate-600">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Added By: {company.createdBy.name}</span>
                </span>
              )}
              {company.industry && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>{company.industry}</span>
                </span>
              )}
              {(company.city || company.state || company.country) && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{[company.city, company.state, company.country].filter(Boolean).join(', ')}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons & Links */}
        <div className="flex items-center gap-3 flex-wrap">
          {company.website && (
            <a
              href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>Website</span>
            </a>
          )}

          <button
            onClick={openEditModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>

          <button
            onClick={() => setIsConfirmOpen(true)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors shadow-xs cursor-pointer ${
              company.status === 'ACTIVE'
                ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{company.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</span>
          </button>
        </div>
      </div>

      {/* CURRENT ASSIGNMENT CARD (PMO & SUPER ADMIN) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            <span>Current Active Assignment</span>
          </h2>

          {isPMO && (
            <div className="flex items-center gap-2">
              {currentAssignment ? (
                <>
                  <button
                    onClick={openAssignModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Reassign Company</span>
                  </button>
                  <button
                    onClick={() => setIsUnassignConfirmOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Unassign</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={openAssignModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Assign to Team Member</span>
                </button>
              )}
            </div>
          )}
        </div>

        {currentAssignment ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-500 font-medium block">Assigned Team Member</span>
              <span className="font-bold text-slate-900 mt-1 block">
                {currentAssignment.assignedTo?.name || 'Assigned Member'}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {currentAssignment.assignedTo?.email}
              </span>
            </div>

            <div>
              <span className="text-slate-500 font-medium block">Assigned By</span>
              <span className="font-semibold text-slate-800 mt-1 block">
                {currentAssignment.assignedBy?.name || 'PMO'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {formatDate(currentAssignment.assignedAt)}
              </span>
            </div>

            <div>
              <span className="text-slate-500 font-medium block">Assignment Status</span>
              <div className="mt-1">
                <Badge variant="ACTIVE">ACTIVE ASSIGNMENT</Badge>
              </div>
              {currentAssignment.reason && (
                <span className="text-[11px] text-slate-500 block mt-1 italic">
                  &ldquo;{currentAssignment.reason}&rdquo;
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
            <UserX className="w-6 h-6 text-slate-300 mx-auto mb-1" />
            <p className="font-semibold text-slate-700">Currently Unassigned</p>
            <p className="text-slate-400 text-[11px]">This company has no active Team Member owner.</p>
          </div>
        )}
      </div>

      {/* Grid: Profile & Contacts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company Profile Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <span>Employer Profile & Overview</span>
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Company Name:</span>
              <span className="font-semibold text-slate-900">{company.companyName}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Industry Sector:</span>
              <span className="font-medium text-slate-800">{company.industry || 'Not specified'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Website:</span>
              {company.website ? (
                <a
                  href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-indigo-600 hover:underline"
                >
                  {company.website}
                </a>
              ) : (
                <span className="text-slate-400">Not specified</span>
              )}
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">LinkedIn:</span>
              {company.linkedin ? (
                <a
                  href={company.linkedin.startsWith('http') ? company.linkedin : `https://${company.linkedin}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-indigo-600 hover:underline truncate max-w-xs"
                >
                  {company.linkedin}
                </a>
              ) : (
                <span className="text-slate-400">Not specified</span>
              )}
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Master Status:</span>
              <Badge variant={company.status}>{company.status}</Badge>
            </div>
            <div className="py-2">
              <span className="text-slate-500 font-medium block mb-1">Placement Cell Notes / Remarks:</span>
              <p className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs leading-relaxed">
                {company.remarks || 'No placement cell notes entered yet.'}
              </p>
            </div>
          </div>
        </div>

        {/* Location & Primary HR Contact Card */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <span>Location & Geographic Scope</span>
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">City:</span>
                <span className="font-medium text-slate-800">{company.city || '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">State:</span>
                <span className="font-medium text-slate-800">{company.state || '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Country:</span>
                <span className="font-medium text-slate-800">{company.country || 'India'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500 font-medium">Address / Campus Location:</span>
                <span className="font-medium text-slate-800">{company.location || '—'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              <span>Primary HR Recruiter Contact</span>
            </h2>
            {company.primaryContact ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Contact Name:</span>
                  <span className="font-semibold text-slate-900">{company.primaryContact.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Designation:</span>
                  <span className="font-medium text-slate-800">{company.primaryContact.designation || 'Not specified'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Corporate Email:</span>
                  <span className="font-mono text-slate-700">{company.primaryContact.email || '—'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500 font-medium">Contact Phone:</span>
                  <span className="font-mono text-slate-700">{company.primaryContact.phone || '—'}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-slate-500">
                <p>No primary HR contact recorded yet for this company.</p>
                <button
                  onClick={openEditModal}
                  className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline"
                >
                  + Add HR Contact Information
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ASSIGNMENT HISTORY TIMELINE (READ-ONLY) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-600" />
          <span>Assignment History Timeline</span>
        </h2>

        {assignmentHistory.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No historical assignment records for this company.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Team Member</th>
                  <th className="px-4 py-3">Assigned By</th>
                  <th className="px-4 py-3">Assigned At</th>
                  <th className="px-4 py-3">Unassigned At</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reason / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {assignmentHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {item.assignedTo?.name || 'Team Member'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.assignedBy?.name || 'PMO'}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{formatDate(item.assignedAt)}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{formatDate(item.unassignedAt)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={item.status}>{item.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 italic">{item.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TEAM MEMBER FEEDBACK & OUTREACH HISTORY SECTION */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-indigo-600" />
              <span>Team Member Feedback & Outreach History</span>
              <span className="ml-2 text-xs font-semibold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                {filteredInteractions.length} {filteredInteractions.length === 1 ? 'Record' : 'Records'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete feedback collected by Team Members during company calls & HR outreach.
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Team Member Filter */}
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Team Member:</span>
              <select
                value={feedbackMemberFilter}
                onChange={(e) => setFeedbackMemberFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Team Members ({uniqueMembersCount})</option>
                {interactionTeamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.email ? `(${m.email})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Type:</span>
              <select
                value={feedbackTypeFilter}
                onChange={(e) => setFeedbackTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Interaction Types</option>
                <option value="PHONE_CALL">Phone Call</option>
                <option value="EMAIL">Email</option>
                <option value="MEETING">Meeting</option>
              </select>
            </div>
          </div>
        </div>

        {/* Feedback Summary Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 font-medium block">Total Members Contacted</span>
            <span className="text-base font-bold text-slate-900 mt-0.5 block">{uniqueMembersCount} Members</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block">Total Interactions</span>
            <span className="text-base font-bold text-indigo-700 mt-0.5 block">{interactions.length} Interactions</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block">Latest Outreach Date</span>
            <span className="text-sm font-semibold text-slate-800 mt-0.5 block font-mono">
              {latestInteraction ? formatDate(latestInteraction.interactionDate || latestInteraction.createdAt) : '—'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block">Latest Hiring Status</span>
            <div className="mt-1">
              <Badge variant={getOutcomeVariant(latestHiringStatus)}>{latestHiringStatus.replace(/_/g, ' ')}</Badge>
            </div>
          </div>
        </div>

        {/* Interactions List / Cards */}
        {filteredInteractions.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
            <PhoneCall className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">
              {interactions.length === 0
                ? 'No feedback has been collected yet.'
                : 'No feedback found for the selected filter criteria.'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {interactions.length === 0
                ? 'Once a Team Member contacts this company and records feedback, it will appear here.'
                : 'Try selecting "All Team Members" or changing the interaction type filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInteractions.map((item) => {
              const itemUser = item.userId;
              const itemContact = item.contactId;
              const details = item.callDetails || {};
              const isExpanded = expandedInteractionId === (item.id || item._id);
              const toggleExpand = () => {
                const id = item.id || item._id;
                setExpandedInteractionId(isExpanded ? null : id);
              };

              return (
                <div
                  key={item.id || item._id}
                  className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs transition-all hover:border-indigo-200"
                >
                  {/* Card Header */}
                  <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    {/* Actor Info */}
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center border border-indigo-200 shrink-0">
                        {typeof itemUser === 'object' && itemUser.name
                          ? itemUser.name.slice(0, 2).toUpperCase()
                          : 'TM'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900">
                            {typeof itemUser === 'object' ? itemUser.name : 'Team Member'}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-md uppercase">
                            {typeof itemUser === 'object' ? itemUser.role || 'TEAM_MEMBER' : 'TEAM_MEMBER'}
                          </span>
                          {typeof itemUser === 'object' && itemUser.email && (
                            <span className="text-slate-400 font-mono text-[11px]">({itemUser.email})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span className="font-mono">{formatDate(item.interactionDate || item.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Badges & Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 text-xs font-semibold bg-slate-200 text-slate-700 rounded-lg">
                        {item.interactionType || 'PHONE_CALL'}
                      </span>
                      <Badge variant={getOutcomeVariant(item.outcome)}>
                        {item.outcome ? item.outcome.replace(/_/g, ' ') : 'COMPLETED'}
                      </Badge>
                      <button
                        onClick={toggleExpand}
                        className="px-3 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ml-1"
                      >
                        <span>{isExpanded ? 'Hide Details' : 'View Full Details'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Card Body — Key Summary */}
                  <div className="p-4 space-y-4 text-xs">
                    {/* Primary HR Contact info captured during call */}
                    {itemContact && typeof itemContact === 'object' && (
                      <div className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div>
                            <span className="font-semibold text-slate-900">{itemContact.name}</span>
                            {itemContact.designation && (
                              <span className="text-slate-500 text-[11px] ml-2 font-medium">
                                ({itemContact.designation})
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-slate-600 font-mono text-[11px] flex-wrap">
                          {itemContact.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{itemContact.email}</span>
                            </span>
                          )}
                          {itemContact.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{itemContact.phone}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Hiring Requirements Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div>
                        <span className="text-slate-500 font-medium block">Hiring Status</span>
                        <span className="font-bold text-slate-900 mt-0.5 block">
                          {details.hiringStatus ? details.hiringStatus.replace(/_/g, ' ') : item.outcome || 'NOT_SURE'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block">Approx Openings</span>
                        <span className="font-bold text-indigo-700 mt-0.5 block">
                          {details.openings != null ? `${details.openings} Openings` : 'Not specified'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block">Candidate Type</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">
                          {details.candidateType ? details.candidateType.replace(/_/g, ' ') : 'BOTH'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block">Opportunity Type</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">
                          {details.opportunityType ? details.opportunityType.replace(/_/g, ' ') : 'FULL_TIME'}
                        </span>
                      </div>
                    </div>

                    {/* Target Profiles Tags */}
                    {details.profiles && details.profiles.length > 0 && (
                      <div>
                        <span className="text-slate-500 font-medium block mb-1.5">Target Hiring Profiles:</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {details.profiles.map((p, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Full Details Breakdown (Collapsible or Expanded) */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-200 space-y-4 animate-fadeIn">
                        {/* Detailed Parameters Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-slate-500 font-medium block">Location</span>
                            <span className="font-medium text-slate-800 mt-0.5 block">{details.location || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium block">Work Mode</span>
                            <span className="font-medium text-slate-800 mt-0.5 block">
                              {details.workMode ? details.workMode.replace(/_/g, ' ') : 'NOT_SPECIFIED'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium block">Salary / Stipend</span>
                            <span className="font-medium text-slate-800 mt-0.5 block font-mono">
                              {details.salaryOrStipend || '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium block">Bond Terms</span>
                            <span className="font-medium text-slate-800 mt-0.5 block">
                              {details.bond ? details.bond.replace(/_/g, ' ') : 'NOT_SURE'}
                            </span>
                          </div>
                        </div>

                        {/* Special Requirements */}
                        {details.specificRequirement && (
                          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-amber-900 text-xs">
                            <span className="font-semibold block mb-0.5">Special Requirements / Criteria:</span>
                            <p className="leading-relaxed">{details.specificRequirement}</p>
                          </div>
                        )}

                        {/* HR Feedback / Conversation Notes */}
                        {(item.notes || details.hrResponse) && (
                          <div>
                            <span className="text-slate-700 font-bold block mb-1">HR Feedback & Conversation Notes:</span>
                            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs leading-relaxed italic whitespace-pre-wrap">
                              &ldquo;{item.notes || details.hrResponse}&rdquo;
                            </div>
                          </div>
                        )}

                        {/* Next Action & Follow-up */}
                        {(item.nextAction || item.followUpDate) && (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between flex-wrap gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-indigo-600" />
                              <div>
                                <span className="text-slate-500 font-medium">Next Action: </span>
                                <span className="font-semibold text-slate-900">
                                  {item.nextAction ? item.nextAction.replace(/_/g, ' ') : 'NO_ACTION'}
                                </span>
                              </div>
                            </div>
                            {item.followUpDate && (
                              <div className="flex items-center gap-2 font-mono">
                                <span className="text-slate-500">Scheduled Follow-up:</span>
                                <span className="font-bold text-indigo-700">{formatDate(item.followUpDate)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SINGLE ASSIGN / REASSIGN MODAL */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={currentAssignment ? `Reassign ${company.companyName}` : `Assign ${company.companyName}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Team Member <span className="text-rose-500">*</span>
            </label>
            <select
              value={assignMemberId}
              onChange={(e) => setAssignMemberId(e.target.value)}
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Instructions (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Workload balancing..."
              value={assignReason}
              onChange={(e) => setAssignReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!assignMemberId || assignSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
            >
              {assignSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{currentAssignment ? 'Confirm Reassignment' : 'Confirm Assignment'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM UNASSIGN DIALOG */}
      <Modal
        isOpen={isUnassignConfirmOpen}
        onClose={() => setIsUnassignConfirmOpen(false)}
        title={`Unassign ${company.companyName}?`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Ending active assignment for <strong className="text-slate-900">{currentAssignment?.assignedTo?.name}</strong>. The assignment history will be preserved, and the company will become UNASSIGNED.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Unassignment (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Account paused, team member left..."
              value={unassignReason}
              onChange={(e) => setUnassignReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setIsUnassignConfirmOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleUnassignSubmit}
              disabled={assignSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50 cursor-pointer"
            >
              {assignSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm Unassign</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Company Profile — ${company.companyName}`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register('companyName')}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              {errors.companyName && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.companyName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Industry Sector</label>
              <input
                type="text"
                {...register('industry')}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Website URL</label>
              <input
                type="text"
                {...register('website')}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">LinkedIn Profile</label>
              <input
                type="text"
                {...register('linkedin')}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                {...register('city')}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                {...register('state')}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
              <input
                type="text"
                {...register('country')}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Address / Location</label>
            <input
              type="text"
              {...register('location')}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
            <select
              {...register('status')}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Placement Cell Notes</label>
            <textarea
              {...register('remarks')}
              rows="2"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM STATUS TOGGLE DIALOG */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleToggleStatus}
        isLoading={statusLoading}
        title={
          company.status === 'ACTIVE'
            ? `Deactivate ${company.companyName}?`
            : `Activate ${company.companyName}?`
        }
        message={
          company.status === 'ACTIVE'
            ? `Deactivating ${company.companyName} marks it as inactive. Historical records are preserved, but no new assignments will be scheduled.`
            : `Activating ${company.companyName} restores active standing in the master directory.`
        }
        confirmText={company.status === 'ACTIVE' ? 'Deactivate Company' : 'Activate Company'}
        confirmVariant={company.status === 'ACTIVE' ? 'danger' : 'primary'}
      />
    </div>
  );
}
