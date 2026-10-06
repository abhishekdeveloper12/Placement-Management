import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '../../utils/zodResolver';
import superAdminService from '../../services/superAdmin.service';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  Building2,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Edit2,
  Power,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react';

// Zod validation schema for creating organization
const createOrgSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(150),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(20, 'Code cannot exceed 20 characters')
    .regex(/^[A-Za-z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens, and underscores'),
  email: z.string().email('Please enter a valid contact email address'),
  phone: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

// Zod validation schema for updating organization
const editOrgSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(150),
  email: z.string().email('Please enter a valid contact email address'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export default function OrganizationListPage() {
  const [organizations, setOrganizations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);

  // Status confirm modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [statusTargetOrg, setStatusTargetOrg] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Delete organization modal
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTargetOrg, setDeleteTargetOrg] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form hooks
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors, isSubmitting: isCreating },
  } = useForm({
    resolver: zodResolver(createOrgSchema),
    defaultValues: { status: 'ACTIVE' },
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    setValue: setEditValue,
    formState: { errors: editErrors, isSubmitting: isEditing },
  } = useForm({
    resolver: zodResolver(editOrgSchema),
  });

  // Fetch organizations
  const fetchOrganizations = useCallback(
    async (page = pagination.page) => {
      setLoading(true);
      setError(null);
      try {
        const response = await superAdminService.getOrganizations({
          page,
          limit: pagination.limit,
          search,
          status: statusFilter,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });

        if (response.success) {
          setOrganizations(response.data);
          setPagination(response.meta || { page, limit: 10, total: response.data.length, totalPages: 1 });
        }
      } catch (err) {
        console.error('Failed to fetch organizations:', err);
        setError(err.message || err.response?.data?.error?.message || 'Failed to load organizations directory');
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, pagination.page, search, statusFilter]
  );

  useEffect(() => {
    fetchOrganizations(1);
  }, [search, statusFilter]);

  // Handle Create Organization
  const onSubmitCreate = async (data) => {
    try {
      const response = await superAdminService.createOrganization(data);
      if (response.success) {
        setActionSuccess(`Organization "${response.data.name}" registered successfully.`);
        setIsCreateOpen(false);
        resetCreate();
        fetchOrganizations(1);
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Create organization error:', err);
      alert(err.message || err.response?.data?.error?.message || 'Failed to create organization');
    }
  };

  // Open Edit Modal
  const openEditModal = (org) => {
    setSelectedOrg(org);
    setEditValue('name', org.name);
    setEditValue('email', org.email);
    setEditValue('phone', org.phone || '');
    setEditValue('address', typeof org.address === 'string' ? org.address : '');
    setIsEditOpen(true);
  };

  // Handle Edit Organization
  const onSubmitEdit = async (data) => {
    if (!selectedOrg) return;
    try {
      const response = await superAdminService.updateOrganization(selectedOrg.id, data);
      if (response.success) {
        setActionSuccess(`Organization "${response.data.name}" updated successfully.`);
        setIsEditOpen(false);
        resetEdit();
        setSelectedOrg(null);
        fetchOrganizations(pagination.page);
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Update organization error:', err);
      alert(err.message || err.response?.data?.error?.message || 'Failed to update organization');
    }
  };

  // Open Status Confirmation Dialog
  const openStatusConfirm = (org) => {
    setStatusTargetOrg(org);
    setIsConfirmOpen(true);
  };

  // Handle Status Toggle
  const handleConfirmStatusChange = async () => {
    if (!statusTargetOrg) return;
    setStatusLoading(true);
    const newStatus = statusTargetOrg.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const response = await superAdminService.updateOrganizationStatus(statusTargetOrg.id, newStatus);
      if (response.success) {
        setActionSuccess(
          `Organization "${statusTargetOrg.name}" is now ${newStatus}.`
        );
        setIsConfirmOpen(false);
        setStatusTargetOrg(null);
        fetchOrganizations(pagination.page);
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Status update error:', err);
      alert(err.message || err.response?.data?.error?.message || 'Failed to update organization status');
    } finally {
      setStatusLoading(false);
    }
  };

  // Open Delete Organization Confirmation Dialog
  const openDeleteOrgConfirm = (org) => {
    setDeleteTargetOrg(org);
    setIsDeleteConfirmOpen(true);
  };

  // Handle Permanent Delete Organization
  const handleConfirmDeleteOrg = async () => {
    if (!deleteTargetOrg) return;
    setDeleteLoading(true);
    try {
      const response = await superAdminService.deleteOrganization(deleteTargetOrg.id);
      if (response.success) {
        setActionSuccess(`Organization "${deleteTargetOrg.name}" and all associated tenant data were permanently deleted.`);
        setIsDeleteConfirmOpen(false);
        setDeleteTargetOrg(null);
        fetchOrganizations(pagination.page);
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Delete organization error:', err);
      alert(err.message || err.response?.data?.error?.message || 'Failed to delete organization');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Organizations Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage institutions, configure tenants, and provision primary PMO leaders.
          </p>
        </div>

        <button
          onClick={() => {
            resetCreate();
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Register Organization</span>
        </button>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => fetchOrganizations(1)} className="font-bold underline">
            Retry
          </button>
        </div>
      )}

      {/* Controls: Search, Filter, Clear */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, code, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>

          {(search || statusFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 underline cursor-pointer"
            >
              Clear filters
            </button>
          )}

          <button
            onClick={() => fetchOrganizations(pagination.page)}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Refresh table"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
            <span className="text-xs font-medium">Loading organization directory...</span>
          </div>
        ) : organizations.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-3">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-800">No organizations found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {search || statusFilter
                ? 'No institutions match your search or filter criteria. Try clearing filters.'
                : 'There are no educational institutions registered on the platform yet.'}
            </p>
            {!search && !statusFilter && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register First Organization</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Contact Email</th>
                  <th className="py-3 px-4">Primary PMO</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        to={`/super-admin/organizations/${org.id}`}
                        className="font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                      >
                        {org.name}
                      </Link>
                      {org.phone && <div className="text-[11px] text-slate-400 mt-0.5">{org.phone}</div>}
                    </td>

                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {org.code}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {org.email}
                    </td>

                    <td className="py-3 px-4">
                      {org.pmo ? (
                        <div>
                          <div className="font-semibold text-slate-900">{org.pmo.name}</div>
                          <div className="text-[11px] text-slate-400">{org.pmo.email}</div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200">
                          Unassigned
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant={org.status}>{org.status}</Badge>
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          to={`/super-admin/organizations/${org.id}`}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                          title="View Details & Manage PMO"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => openEditModal(org)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                          title="Edit Organization"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => openStatusConfirm(org)}
                          className={`p-1 rounded transition-colors cursor-pointer ${
                            org.status === 'ACTIVE'
                              ? 'text-slate-400 hover:text-amber-600'
                              : 'text-slate-400 hover:text-emerald-600'
                          }`}
                          title={org.status === 'ACTIVE' ? 'Deactivate Organization' : 'Activate Organization'}
                        >
                          <Power className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => openDeleteOrgConfirm(org)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Delete Organization & All Associated Data"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {organizations.length > 0 && (
          <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing <strong className="text-slate-700">{(pagination.page - 1) * pagination.limit + 1}</strong> to{' '}
              <strong className="text-slate-700">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </strong>{' '}
              of <strong className="text-slate-700">{pagination.total}</strong> organizations
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchOrganizations(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => fetchOrganizations(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE ORGANIZATION MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register New Organization"
      >
        <form onSubmit={handleCreateSubmit(onSubmitCreate)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Organization Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Apex Institute of Technology"
              {...registerCreate('name')}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {createErrors.name && (
              <p className="text-[11px] text-rose-600 mt-1">{createErrors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Organization Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. APEX (Unique identifier)"
                {...registerCreate('code')}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg font-mono uppercase focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              {createErrors.code && (
                <p className="text-[11px] text-rose-600 mt-1">{createErrors.code.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                placeholder="contact@apex.edu"
                {...registerCreate('email')}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              {createErrors.email && (
                <p className="text-[11px] text-rose-600 mt-1">{createErrors.email.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                placeholder="+91-9876543210"
                {...registerCreate('phone')}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                {...registerCreate('status')}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Campus Address</label>
            <textarea
              rows={2}
              placeholder="Campus address, city, state, postal code"
              {...registerCreate('address')}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Register Organization</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT ORGANIZATION MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedOrg(null);
        }}
        title={`Edit Organization: ${selectedOrg?.code || ''}`}
      >
        <form onSubmit={handleEditSubmit(onSubmitEdit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Organization Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              {...registerEdit('name')}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {editErrors.name && (
              <p className="text-[11px] text-rose-600 mt-1">{editErrors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                {...registerEdit('email')}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              {editErrors.email && (
                <p className="text-[11px] text-rose-600 mt-1">{editErrors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                {...registerEdit('phone')}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Campus Address</label>
            <textarea
              rows={2}
              {...registerEdit('address')}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isEditing}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {isEditing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM STATUS TOGGLE DIALOG */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setStatusTargetOrg(null);
        }}
        onConfirm={handleConfirmStatusChange}
        title={statusTargetOrg?.status === 'ACTIVE' ? 'Deactivate Organization' : 'Activate Organization'}
        message={
          statusTargetOrg?.status === 'ACTIVE'
            ? `Are you sure you want to deactivate "${statusTargetOrg?.name}"? All PMO and placement team members belonging to this institution will be immediately blocked from accessing the system.`
            : `Are you sure you want to activate "${statusTargetOrg?.name}"? Its placement staff will regain access to outreach workflows.`
        }
        confirmText={statusTargetOrg?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        confirmVariant={statusTargetOrg?.status === 'ACTIVE' ? 'warning' : 'primary'}
        isLoading={statusLoading}
      />

      {/* CONFIRM DELETE ORGANIZATION DIALOG */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setDeleteTargetOrg(null);
        }}
        onConfirm={handleConfirmDeleteOrg}
        title={`Delete Organization "${deleteTargetOrg?.name}"?`}
        message={`CRITICAL WARNING: This action is permanent and CANNOT BE UNDONE. Deleting "${deleteTargetOrg?.name}" will PERMANENTLY ERASE the entire institution, all registered PMO accounts, team members, companies, contacts, assignments, outreach interactions, follow-ups, job opportunities, job roles, documents, and notifications!`}
        confirmText="Delete Organization & Wipe Data"
        confirmVariant="danger"
        isLoading={deleteLoading}
      />
    </div>
  );
}
