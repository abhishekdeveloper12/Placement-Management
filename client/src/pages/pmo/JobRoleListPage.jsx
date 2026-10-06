import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '../../utils/zodResolver';
import jobRoleService from '../../services/jobRole.service';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  Briefcase,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Power,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
  FileText,
  User,
  Hash,
} from 'lucide-react';

const jobRoleSchema = z.object({
  name: z.string().min(2, 'Job role name must be at least 2 characters').max(100),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export default function JobRoleListPage() {
  const [jobRoles, setJobRoles] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  // Status confirm modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [statusTargetRole, setStatusTargetRole] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(jobRoleSchema),
    defaultValues: { status: 'ACTIVE' },
  });

  const fetchJobRoles = useCallback(
    async (page = pagination.page) => {
      setLoading(true);
      setError(null);
      try {
        const response = await jobRoleService.getJobRoles({
          page,
          limit: pagination.limit,
          search,
          status: statusFilter,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });

        if (response.success) {
          setJobRoles(response.data);
          setPagination(response.meta || { page, limit: 10, total: response.data.length, totalPages: 1 });
        }
      } catch (err) {
        console.error('Failed to fetch job roles:', err);
        setError(err.response?.data?.error?.message || 'Failed to load job roles');
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, pagination.page, search, statusFilter]
  );

  useEffect(() => {
    fetchJobRoles(1);
  }, [search, statusFilter]);

  const openCreateModal = () => {
    setEditingRole(null);
    reset({ name: '', description: '', status: 'ACTIVE' });
    setIsModalOpen(true);
  };

  const openEditModal = (role) => {
    setEditingRole(role);
    setValue('name', role.name);
    setValue('description', role.description || '');
    setValue('status', role.status);
    setIsModalOpen(true);
  };

  const onSubmitForm = async (data) => {
    try {
      if (editingRole) {
        await jobRoleService.updateJobRole(editingRole.id, data);
        setActionSuccess(`Job role '${data.name}' updated successfully.`);
      } else {
        await jobRoleService.createJobRole(data);
        setActionSuccess(`Job role '${data.name}' created successfully.`);
      }
      setIsModalOpen(false);
      fetchJobRoles(pagination.page);
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      console.error('Failed to save job role:', err);
      alert(err.response?.data?.error?.message || 'Failed to save job role');
    }
  };

  const openStatusConfirm = (role) => {
    setStatusTargetRole(role);
    setIsConfirmOpen(true);
  };

  const handleToggleStatus = async () => {
    if (!statusTargetRole) return;
    setStatusLoading(true);
    try {
      const newStatus = statusTargetRole.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await jobRoleService.updateJobRoleStatus(statusTargetRole.id, newStatus);
      setActionSuccess(`Status for '${statusTargetRole.name}' changed to ${newStatus}.`);
      setIsConfirmOpen(false);
      setStatusTargetRole(null);
      fetchJobRoles(pagination.page);
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      console.error('Status toggle error:', err);
      alert(err.response?.data?.error?.message || 'Failed to update status');
    } finally {
      setStatusLoading(false);
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

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Organization Job Role Master</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Define and manage the standardized job profiles available for corporate outreach call feedback across your institution.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchJobRoles(pagination.page)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Job Role</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search role name or description..."
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

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 font-medium cursor-pointer"
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
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Job Role Name</th>
                <th className="px-6 py-3.5">Description</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Used In Feedback</th>
                <th className="px-6 py-3.5">Created By</th>
                <th className="px-6 py-3.5">Created Date</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading && jobRoles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading organization job role master...</span>
                  </td>
                </tr>
              ) : jobRoles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Briefcase className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-base font-bold text-slate-800">No job roles found</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      {search || statusFilter
                        ? 'Try clearing active search or filters.'
                        : 'Create standardized job roles so Team Members can select them during HR call feedback capture.'}
                    </p>
                    <div className="mt-4">
                      <button
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add First Job Role</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                jobRoles.map((role) => (
                  <tr key={role.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <span>{role.name}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                      {role.description ? role.description : <span className="text-slate-300 italic">No description</span>}
                    </td>

                    <td className="px-6 py-4">
                      {role.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Hash className="w-3 h-3 text-indigo-500" />
                        <span>{role.usedCount || 0} Calls</span>
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-600 text-[11px]">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{role.createdBy?.name || 'PMO / System'}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-600 text-[11px]">
                      {formatDate(role.createdAt)}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(role)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
                          title="Edit role details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => openStatusConfirm(role)}
                          className={`p-1.5 rounded-lg border transition-colors shadow-2xs cursor-pointer ${
                            role.status === 'ACTIVE'
                              ? 'border-slate-200 bg-white text-rose-600 hover:bg-rose-50'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                          title={role.status === 'ACTIVE' ? 'Deactivate role' : 'Activate role'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
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
          <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-700">{jobRoles.length}</span> of{' '}
              <span className="font-semibold text-slate-700">{pagination.total}</span> job roles
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1 || loading}
                onClick={() => fetchJobRoles(pagination.page - 1)}
                className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-medium text-slate-700 px-1">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => fetchJobRoles(pagination.page + 1)}
                className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT JOB ROLE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRole(null);
        }}
        title={editingRole ? `Edit Job Role: ${editingRole.name}` : 'Add New Job Role'}
      >
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Job Role Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. MERN Stack Developer, Data Analyst, Java Engineer"
              {...register('name')}
              className={`w-full text-xs py-2 px-3 rounded-lg border ${
                errors.name ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-200 focus:ring-indigo-500'
              } focus:outline-hidden focus:ring-2`}
            />
            {errors.name && <p className="text-rose-600 text-[11px] mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description (Optional)</label>
            <textarea
              rows={3}
              placeholder="Brief description of the skills or candidate profiles expected for this role..."
              {...register('description')}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {errors.description && <p className="text-rose-600 text-[11px] mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Status</label>
            <select
              {...register('status')}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ACTIVE">ACTIVE (Selectable in HR Feedback)</option>
              <option value="INACTIVE">INACTIVE (Hidden from selection)</option>
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingRole(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingRole ? 'Update Role' : 'Create Role'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* STATUS CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setStatusTargetRole(null);
        }}
        onConfirm={handleToggleStatus}
        title={statusTargetRole?.status === 'ACTIVE' ? 'Deactivate Job Role' : 'Activate Job Role'}
        message={`Are you sure you want to change status for "${statusTargetRole?.name || ''}" to ${
          statusTargetRole?.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
        }? Inactive roles will no longer appear in future call feedback dropdowns, but historical records will be preserved.`}
        confirmText={statusTargetRole?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        variant={statusTargetRole?.status === 'ACTIVE' ? 'DANGER' : 'SUCCESS'}
        isLoading={statusLoading}
      />
    </div>
  );
}
