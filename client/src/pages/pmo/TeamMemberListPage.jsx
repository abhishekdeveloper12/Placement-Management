import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '../../utils/zodResolver';
import pmoService from '../../services/pmo.service';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  Users,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Edit2,
  Power,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
  Eye,
  Phone,
  Mail,
  Calendar,
  Lock,
  ShieldAlert,
} from 'lucide-react';

// Zod schema for creating Team Member
const createTeamMemberSchema = z
  .object({
    name: z.string().min(2, 'Full name must be at least 2 characters').max(100),
    email: z.string().email('Please enter a valid email address'),
    phone: z.string().optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// Zod schema for editing Team Member
const editTeamMemberSchema = z
  .object({
    name: z.string().min(2, 'Full name must be at least 2 characters').max(100),
    email: z.string().email('Please enter a valid email address'),
    phone: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
    password: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val || val === '') return true;
          return (
            val.length >= 8 &&
            /[A-Z]/.test(val) &&
            /[a-z]/.test(val) &&
            /[0-9]/.test(val) &&
            /[^A-Za-z0-9]/.test(val)
          );
        },
        {
          message:
            'If setting a new password, it must be at least 8 characters with uppercase, lowercase, number, and special character',
        }
      ),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.password && data.password !== '') {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }
  );

export default function TeamMemberListPage() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Status confirm modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [statusTargetMember, setStatusTargetMember] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Form hooks
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors, isSubmitting: isCreating },
  } = useForm({
    resolver: zodResolver(createTeamMemberSchema),
    defaultValues: { status: 'ACTIVE' },
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    setValue: setEditValue,
    formState: { errors: editErrors, isSubmitting: isEditing },
  } = useForm({
    resolver: zodResolver(editTeamMemberSchema),
  });

  // Fetch Team Members
  const fetchTeamMembers = useCallback(
    async (page = pagination.page) => {
      setLoading(true);
      setError(null);
      try {
        const response = await pmoService.getTeamMembers({
          page,
          limit: pagination.limit,
          search,
          status: statusFilter,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });

        if (response.success) {
          setTeamMembers(response.data);
          setPagination(response.meta || { page, limit: 10, total: response.data.length, totalPages: 1 });
        }
      } catch (err) {
        console.error('Failed to fetch team members:', err);
        setError(err.response?.data?.error?.message || 'Failed to load team members');
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, pagination.page, search, statusFilter]
  );

  useEffect(() => {
    fetchTeamMembers(1);
  }, [search, statusFilter]);

  // Handle Create Member
  const onSubmitCreate = async (data) => {
    try {
      const response = await pmoService.createTeamMember({
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        password: data.password,
        status: data.status,
      });

      if (response.success) {
        setActionSuccess(`Team member "${response.data.name}" added successfully.`);
        setIsCreateOpen(false);
        resetCreate();
        fetchTeamMembers(1);
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Create team member error:', err);
      alert(err.response?.data?.error?.message || 'Failed to create team member');
    }
  };

  // Open Edit Modal
  const openEditModal = (member) => {
    setSelectedMember(member);
    resetEdit({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      status: member.status,
      password: '',
      confirmPassword: '',
    });
    setIsEditOpen(true);
  };

  // Handle Edit Member
  const onSubmitEdit = async (data) => {
    if (!selectedMember) return;
    try {
      const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        status: data.status,
      };
      if (data.password && data.password.trim() !== '') {
        payload.password = data.password;
      }

      const response = await pmoService.updateTeamMember(selectedMember.id, payload);
      if (response.success) {
        setActionSuccess(`Team member "${response.data.name}" updated successfully.`);
        setIsEditOpen(false);
        setSelectedMember(null);
        fetchTeamMembers(pagination.page);
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Update team member error:', err);
      alert(err.response?.data?.error?.message || 'Failed to update team member');
    }
  };

  // Open Status Confirmation Dialog
  const openStatusConfirm = (member) => {
    setStatusTargetMember(member);
    setIsConfirmOpen(true);
  };

  // Execute Status Toggle
  const handleToggleStatus = async () => {
    if (!statusTargetMember) return;
    setStatusLoading(true);
    const newStatus = statusTargetMember.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const response = await pmoService.updateTeamMemberStatus(statusTargetMember.id, newStatus);
      if (response.success) {
        setActionSuccess(
          `Team member "${statusTargetMember.name}" status updated to ${newStatus}.`
        );
        setIsConfirmOpen(false);
        setStatusTargetMember(null);
        fetchTeamMembers(pagination.page);
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Status toggle error:', err);
      alert(err.response?.data?.error?.message || 'Failed to update member status');
    } finally {
      setStatusLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
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

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Operational Team Members
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage caller accounts, reset credentials, and oversee outreach staff within your institution.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchTeamMembers(pagination.page)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              resetCreate({ status: 'ACTIVE' });
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        </div>
      </div>

      {/* Action Success Toast */}
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
            onClick={() => fetchTeamMembers(1)}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by team member name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400"
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

        {/* Status filter dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-700 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>

          {(search || statusFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Team Member Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Team Member</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Phone</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Last Login</th>
                <th className="px-6 py-3.5">Created Date</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading && teamMembers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading team members...</span>
                  </td>
                </tr>
              ) : teamMembers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-600">No team members found</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {search || statusFilter
                        ? 'Try modifying your search or filter criteria to locate members.'
                        : 'Onboard your first outreach team member to get started.'}
                    </p>
                    {!search && !statusFilter && (
                      <button
                        onClick={() => {
                          resetCreate({ status: 'ACTIVE' });
                          setIsCreateOpen(true);
                        }}
                        className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add First Member</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                teamMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Name & Email */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center text-xs shrink-0">
                          {member.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <Link
                            to={`/pmo/team-members/${member.id}`}
                            className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
                          >
                            {member.name}
                          </Link>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4">
                      <Badge variant="TEAM_MEMBER">TEAM_MEMBER</Badge>
                    </td>

                    {/* Phone */}
                    <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
                      {member.phone || <span className="text-slate-300">—</span>}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <Badge variant={member.status}>{member.status}</Badge>
                    </td>

                    {/* Last Login */}
                    <td className="px-6 py-4 text-slate-500 text-[11px]">
                      {formatDate(member.lastLoginAt)}
                    </td>

                    {/* Created Date */}
                    <td className="px-6 py-4 text-slate-500 text-[11px]">
                      {formatDate(member.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/pmo/team-members/${member.id}`}
                          className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => openEditModal(member)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                          title="Edit Member"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openStatusConfirm(member)}
                          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                            member.status === 'ACTIVE'
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={member.status === 'ACTIVE' ? 'Deactivate Member' : 'Activate Member'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-700">{teamMembers.length}</span> of{' '}
              <span className="font-semibold text-slate-700">{pagination.total}</span> team members
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1 || loading}
                onClick={() => fetchTeamMembers(pagination.page - 1)}
                className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-medium text-slate-700 px-1">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => fetchTeamMembers(pagination.page + 1)}
                className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE TEAM MEMBER MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Team Member"
      >
        <form onSubmit={handleCreateSubmit(onSubmitCreate)} className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2">
            <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Tenant Isolated:</strong> This team member will be created strictly under your institution and assigned the <code className="bg-blue-100 px-1 rounded font-mono">TEAM_MEMBER</code> role.
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              {...registerCreate('name')}
              placeholder="e.g. John Doe"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {createErrors.name && (
              <p className="text-[11px] text-rose-500 mt-1">{createErrors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              {...registerCreate('email')}
              placeholder="e.g. john.doe@placement.org"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {createErrors.email && (
              <p className="text-[11px] text-rose-500 mt-1">{createErrors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              {...registerCreate('phone')}
              placeholder="e.g. +91 98765 43210"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                {...registerCreate('password')}
                placeholder="Min. 8 characters"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              {createErrors.password && (
                <p className="text-[11px] text-rose-500 mt-1">{createErrors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                {...registerCreate('confirmPassword')}
                placeholder="Re-enter password"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              {createErrors.confirmPassword && (
                <p className="text-[11px] text-rose-500 mt-1">{createErrors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Initial Account Status
            </label>
            <select
              {...registerCreate('status')}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ACTIVE">ACTIVE (Authorized to log in)</option>
              <option value="INACTIVE">INACTIVE (Access suspended)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
            >
              {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Create Team Member</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT TEAM MEMBER MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedMember(null);
        }}
        title={`Edit Team Member — ${selectedMember?.name || ''}`}
      >
        <form onSubmit={handleEditSubmit(onSubmitEdit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              {...registerEdit('name')}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {editErrors.name && (
              <p className="text-[11px] text-rose-500 mt-1">{editErrors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              {...registerEdit('email')}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {editErrors.email && (
              <p className="text-[11px] text-rose-500 mt-1">{editErrors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              {...registerEdit('phone')}
              placeholder="e.g. +91 98765 43210"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Account Status
            </label>
            <select
              {...registerEdit('status')}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          {/* Optional Password Reset section */}
          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 mb-1">
              Reset Password (Optional)
            </h4>
            <p className="text-[11px] text-slate-400 mb-3">
              Leave blank to keep existing password unchanged.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  {...registerEdit('password')}
                  placeholder="Leave blank to keep current"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                {editErrors.password && (
                  <p className="text-[11px] text-rose-500 mt-1">{editErrors.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  {...registerEdit('confirmPassword')}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                {editErrors.confirmPassword && (
                  <p className="text-[11px] text-rose-500 mt-1">{editErrors.confirmPassword.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsEditOpen(false);
                setSelectedMember(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isEditing}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
            >
              {isEditing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* STATUS TOGGLE CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setStatusTargetMember(null);
        }}
        onConfirm={handleToggleStatus}
        isLoading={statusLoading}
        title={
          statusTargetMember?.status === 'ACTIVE'
            ? `Deactivate ${statusTargetMember?.name}?`
            : `Activate ${statusTargetMember?.name}?`
        }
        message={
          statusTargetMember?.status === 'ACTIVE'
            ? `Deactivating ${statusTargetMember?.name} will immediately suspend their account. They will not be able to log in or conduct outreach campaigns until reactivated.`
            : `Activating ${statusTargetMember?.name} will restore their login access and allow them to conduct assigned company outreach.`
        }
        confirmText={
          statusTargetMember?.status === 'ACTIVE' ? 'Deactivate Member' : 'Activate Member'
        }
        confirmVariant={statusTargetMember?.status === 'ACTIVE' ? 'danger' : 'primary'}
      />
    </div>
  );
}
