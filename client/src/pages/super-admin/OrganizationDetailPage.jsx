import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '../../utils/zodResolver';
import superAdminService from '../../services/superAdmin.service';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  Building2,
  Users,
  Shield,
  Edit2,
  Power,
  ChevronLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Plus,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Lock,
  X,
  Briefcase,
} from 'lucide-react';

// Zod schema for editing organization
const editOrgSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(150),
  email: z.string().email('Please enter a valid contact email address'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

// Zod schema for creating PMO
const createPmoSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid corporate email address'),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

// Zod schema for editing PMO
const editPmoSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  phone: z.string().optional(),
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
          'If changing password, it must be at least 8 characters and contain uppercase, lowercase, number, and special character',
      }
    ),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export default function OrganizationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [org, setOrg] = useState(null);
  const [orgAnalytics, setOrgAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');

  // Modals
  const [isEditOrgOpen, setIsEditOrgOpen] = useState(false);
  const [isCreatePmoOpen, setIsCreatePmoOpen] = useState(false);
  const [isEditPmoOpen, setIsEditPmoOpen] = useState(false);

  // Status confirm dialogs
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    confirmVariant: 'danger',
    action: null,
    isLoading: false,
  });

  // Edit Org Form
  const {
    register: registerOrg,
    handleSubmit: handleOrgSubmit,
    reset: resetOrgForm,
    formState: { errors: orgErrors, isSubmitting: isSubmittingOrg },
  } = useForm({
    resolver: zodResolver(editOrgSchema),
  });

  // Create PMO Form
  const {
    register: registerCreatePmo,
    handleSubmit: handleCreatePmoSubmit,
    reset: resetCreatePmoForm,
    formState: { errors: createPmoErrors, isSubmitting: isSubmittingCreatePmo },
  } = useForm({
    resolver: zodResolver(createPmoSchema),
    defaultValues: { status: 'ACTIVE' },
  });

  // Edit PMO Form
  const {
    register: registerEditPmo,
    handleSubmit: handleEditPmoSubmit,
    reset: resetEditPmoForm,
    setValue: setEditPmoValue,
    formState: { errors: editPmoErrors, isSubmitting: isSubmittingEditPmo },
  } = useForm({
    resolver: zodResolver(editPmoSchema),
  });

  // Fetch Organization & PMO details
  const fetchOrganizationDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [response, analyticsRes] = await Promise.all([
        superAdminService.getOrganization(id),
        superAdminService.getOrganizationAnalytics(id),
      ]);
      if (response.success) {
        setOrg(response.data);
      }
      if (analyticsRes.success) {
        setOrgAnalytics(analyticsRes.data);
      }
    } catch (err) {
      console.error('Failed to load organization:', err);
      setError(err.response?.data?.error?.message || 'Failed to load organization details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrganizationDetails();
  }, [fetchOrganizationDetails]);

  // Open Edit Organization Modal
  const openEditOrgModal = () => {
    if (!org) return;
    resetOrgForm({
      name: org.name,
      email: org.email,
      phone: org.phone || '',
      address: typeof org.address === 'string' ? org.address : '',
    });
    setIsEditOrgOpen(true);
  };

  // Submit Organization Update
  const onSubmitOrgEdit = async (data) => {
    try {
      const response = await superAdminService.updateOrganization(id, data);
      if (response.success) {
        setActionSuccess('Organization details updated successfully.');
        setIsEditOrgOpen(false);
        fetchOrganizationDetails();
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Update org error:', err);
      alert(err.response?.data?.error?.message || 'Failed to update organization');
    }
  };

  // Toggle Organization Status
  const handleToggleOrgStatus = () => {
    const nextStatus = org.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setConfirmDialog({
      isOpen: true,
      title: nextStatus === 'INACTIVE' ? 'Deactivate Organization' : 'Activate Organization',
      message:
        nextStatus === 'INACTIVE'
          ? `Deactivating "${org.name}" will immediately prevent its PMO and placement team from logging in or conducting outreach.`
          : `Activating "${org.name}" will restore login access for its placement staff.`,
      confirmText: nextStatus === 'INACTIVE' ? 'Deactivate' : 'Activate',
      confirmVariant: nextStatus === 'INACTIVE' ? 'danger' : 'primary',
      action: async () => {
        setConfirmDialog((prev) => ({ ...prev, isLoading: true }));
        try {
          await superAdminService.updateOrganizationStatus(id, nextStatus);
          setActionSuccess(`Organization status changed to ${nextStatus}.`);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          fetchOrganizationDetails();
          setTimeout(() => setActionSuccess(''), 4000);
        } catch (err) {
          setConfirmDialog((prev) => ({ ...prev, isLoading: false }));
          alert(err.response?.data?.error?.message || 'Failed to update organization status');
        }
      },
      isLoading: false,
    });
  };

  // Open Create PMO Modal
  const openCreatePmoModal = () => {
    resetCreatePmoForm({
      name: '',
      email: '',
      phone: '',
      password: '',
      status: 'ACTIVE',
    });
    setIsCreatePmoOpen(true);
  };

  // Submit Create PMO
  const onSubmitCreatePmo = async (data) => {
    try {
      const response = await superAdminService.createOrganizationPmo(id, data);
      if (response.success) {
        setActionSuccess(`Primary PMO "${response.data.name}" provisioned successfully.`);
        setIsCreatePmoOpen(false);
        resetCreatePmoForm();
        fetchOrganizationDetails();
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Create PMO error:', err);
      alert(err.response?.data?.error?.message || 'Failed to provision PMO');
    }
  };

  // Open Edit PMO Modal
  const openEditPmoModal = () => {
    if (!org?.pmo) return;
    resetEditPmoForm({
      name: org.pmo.name,
      phone: org.pmo.phone || '',
      password: '',
      status: org.pmo.status,
    });
    setIsEditPmoOpen(true);
  };

  // Submit Edit PMO
  const onSubmitEditPmo = async (data) => {
    try {
      const payload = {
        name: data.name,
        phone: data.phone,
        status: data.status,
      };
      if (data.password && data.password.trim()) {
        payload.password = data.password.trim();
      }

      const response = await superAdminService.updateOrganizationPmo(id, payload);
      if (response.success) {
        setActionSuccess('PMO details updated successfully.');
        setIsEditPmoOpen(false);
        resetEditPmoForm();
        fetchOrganizationDetails();
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Update PMO error:', err);
      alert(err.response?.data?.error?.message || 'Failed to update PMO');
    }
  };

  // Toggle PMO Status
  const handleTogglePmoStatus = () => {
    if (!org?.pmo) return;
    const nextStatus = org.pmo.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setConfirmDialog({
      isOpen: true,
      title: nextStatus === 'INACTIVE' ? 'Deactivate PMO Account' : 'Activate PMO Account',
      message:
        nextStatus === 'INACTIVE'
          ? `Deactivating "${org.pmo.name}" will immediately invalidate active sessions and prevent this user from logging in.`
          : `Activating "${org.pmo.name}" will restore login access to the PMO portal.`,
      confirmText: nextStatus === 'INACTIVE' ? 'Deactivate' : 'Activate',
      confirmVariant: nextStatus === 'INACTIVE' ? 'danger' : 'primary',
      action: async () => {
        setConfirmDialog((prev) => ({ ...prev, isLoading: true }));
        try {
          await superAdminService.updateOrganizationPmoStatus(id, nextStatus);
          setActionSuccess(`PMO status updated to ${nextStatus}.`);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          fetchOrganizationDetails();
          setTimeout(() => setActionSuccess(''), 4000);
        } catch (err) {
          setConfirmDialog((prev) => ({ ...prev, isLoading: false }));
          alert(err.response?.data?.error?.message || 'Failed to update PMO status');
        }
      },
      isLoading: false,
    });
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-sm font-medium">Loading organization profile...</span>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4 shadow-xs">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Organization Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">{error || 'Unable to retrieve details for this institution.'}</p>
        <Link
          to="/super-admin/organizations"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Organizations</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/super-admin" className="hover:text-slate-800 transition-colors">
          Super Admin
        </Link>
        <span>/</span>
        <Link to="/super-admin/organizations" className="hover:text-slate-800 transition-colors">
          Organizations
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-800">{org.name}</span>
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

      {/* Top Banner & Quick Actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-base">
            {org.code.slice(0, 3)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{org.name}</h1>
              <Badge variant={org.status}>{org.status}</Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
              <span>Code: <strong className="font-mono text-slate-700">{org.code}</strong></span>
              <span>&bull;</span>
              <span>Registered: {new Date(org.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={openEditOrgModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Organization</span>
          </button>

          <button
            onClick={handleToggleOrgStatus}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer ${
              org.status === 'ACTIVE'
                ? 'text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100'
                : 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{org.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Details (Left 2 cols) & PMO Management (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Organization Information & Future Modules */}
        <div className="lg:col-span-2 space-y-6">
          {/* Organization Information Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Institutional Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Legal Name</span>
                <span className="font-semibold text-slate-800 text-sm">{org.name}</span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Tenant Code (Slug)</span>
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs">
                  {org.code}
                </span>
              </div>

              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400 block mb-0.5">Contact Email</span>
                  <span className="font-medium text-slate-800">{org.email}</span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400 block mb-0.5">Phone Number</span>
                  <span className="font-medium text-slate-800">{org.phone || 'Not provided'}</span>
                </div>
              </div>

              <div className="sm:col-span-2 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400 block mb-0.5">Campus Address</span>
                  <span className="font-medium text-slate-800">
                    {typeof org.address === 'string' && org.address
                      ? org.address
                      : 'No address provided'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-2 border-t border-slate-100">
                <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400 block mb-0.5">Created At</span>
                  <span className="text-slate-600">{new Date(org.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-2 border-t border-slate-100">
                <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-400 block mb-0.5">Last Updated</span>
                  <span className="text-slate-600">{new Date(org.updatedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Organization Drill-Down Analytics Dashboard */}
          {orgAnalytics && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <span>Institutional Operational & Hiring Analytics</span>
                </span>
                <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded border border-indigo-200">
                  {org.code}
                </span>
              </h2>

              {/* People & Staffing */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">Staffing & Accounts</span>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <span className="text-purple-800 font-semibold block">PMO Officers</span>
                    <span className="text-2xl font-bold text-purple-900 mt-1 block">{orgAnalytics.people?.pmos || 0}</span>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <span className="text-indigo-800 font-semibold block">Calling Members</span>
                    <span className="text-2xl font-bold text-indigo-900 mt-1 block">{orgAnalytics.people?.teamMembers || 0}</span>
                  </div>
                  <div className="p-3 bg-slate-100 rounded-lg border border-slate-200">
                    <span className="text-slate-700 font-semibold block">Total Users</span>
                    <span className="text-2xl font-bold text-slate-800 mt-1 block">{orgAnalytics.people?.totalUsers || 0}</span>
                  </div>
                </div>
              </div>

              {/* Company Directory & Outreach Coverage */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">Corporate Directory</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-600 font-semibold block">Total Companies</span>
                    <span className="text-xl font-bold text-slate-900 mt-1 block">{orgAnalytics.companies?.totalCompanies || 0}</span>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <span className="text-indigo-800 font-semibold block">Assigned</span>
                    <span className="text-xl font-bold text-indigo-900 mt-1 block">{orgAnalytics.companies?.assignedCompanies || 0}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="text-emerald-800 font-semibold block">Contacted</span>
                    <span className="text-xl font-bold text-emerald-900 mt-1 block">{orgAnalytics.companies?.contactedCompanies || 0}</span>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                    <span className="text-rose-800 font-semibold block">Not Contacted</span>
                    <span className="text-xl font-bold text-rose-900 mt-1 block">{orgAnalytics.companies?.notContactedCompanies || 0}</span>
                  </div>
                </div>
              </div>

              {/* Hiring Requirements & Shortlists */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">Hiring & Shortlists</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="text-emerald-800 font-semibold block">Hiring Now</span>
                    <span className="text-xl font-bold text-emerald-900 mt-1 block">{orgAnalytics.hiring?.currentlyHiring || 0}</span>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="text-blue-800 font-semibold block">Planned</span>
                    <span className="text-xl font-bold text-blue-900 mt-1 block">{orgAnalytics.hiring?.hiringPlanned || 0}</span>
                  </div>
                  <div className="p-3 bg-amber-500 text-white rounded-lg shadow-2xs">
                    <span className="font-bold text-amber-100 block">Shortlisted ⭐</span>
                    <span className="text-xl font-extrabold mt-1 block">{orgAnalytics.hiring?.shortlistedOpportunities || 0}</span>
                  </div>
                  <div className="p-3 bg-slate-100 rounded-lg border border-slate-200">
                    <span className="text-slate-700 font-semibold block">Total Roles</span>
                    <span className="text-xl font-bold text-slate-800 mt-1 block">{orgAnalytics.hiring?.totalOpportunities || 0}</span>
                  </div>
                </div>
              </div>

              {/* Follow-up Queue */}
              {orgAnalytics.followUps && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-slate-700">Follow-Up Tasks:</span>
                    <div className="flex items-center gap-3">
                      <span className="text-rose-600 font-bold">Overdue: {orgAnalytics.followUps.overdue || 0}</span>
                      <span className="text-amber-600 font-semibold">Today: {orgAnalytics.followUps.today || 0}</span>
                      <span className="text-blue-600">Upcoming: {orgAnalytics.followUps.upcoming || 0}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: PMO Information Card */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-600" />
                Primary Placement Officer (PMO)
              </h2>
              {org.pmo && <Badge variant={org.pmo.status}>{org.pmo.status}</Badge>}
            </div>

            {org.pmo ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-lg">
                  <div className="text-sm font-bold text-slate-900">{org.pmo.name}</div>
                  <div className="text-slate-600 font-mono mt-0.5">{org.pmo.email}</div>
                  {org.pmo.phone && <div className="text-slate-500 mt-1">{org.pmo.phone}</div>}
                </div>

                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Assigned Role:</span>
                    <Badge variant="PMO">PMO (Org Admin)</Badge>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Last Login:</span>
                    <span className="text-slate-700 font-medium">
                      {org.pmo.lastLoginAt
                        ? new Date(org.pmo.lastLoginAt).toLocaleString()
                        : 'Never logged in'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Created:</span>
                    <span className="text-slate-700">
                      {new Date(org.pmo.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* PMO Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={openEditPmoModal}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit PMO</span>
                  </button>

                  <button
                    onClick={handleTogglePmoStatus}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer ${
                      org.pmo.status === 'ACTIVE'
                        ? 'text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100'
                        : 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{org.pmo.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">No PMO Assigned</div>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                    This institution does not have a primary placement officer provisioned yet to administer corporate outreach.
                  </p>
                </div>

                {org.status === 'ACTIVE' ? (
                  <button
                    onClick={openCreatePmoModal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Provision Primary PMO</span>
                  </button>
                ) : (
                  <div className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
                    Cannot provision PMO while organization is inactive. Please activate organization first.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EDIT ORGANIZATION MODAL */}
      <Modal
        isOpen={isEditOrgOpen}
        onClose={() => setIsEditOrgOpen(false)}
        title={`Edit Organization: ${org.code}`}
      >
        <form onSubmit={handleOrgSubmit(onSubmitOrgEdit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Organization Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              {...registerOrg('name')}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {orgErrors.name && (
              <p className="text-[11px] text-rose-600 mt-1">{orgErrors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                {...registerOrg('email')}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              {orgErrors.email && (
                <p className="text-[11px] text-rose-600 mt-1">{orgErrors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                {...registerOrg('phone')}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Campus Address</label>
            <textarea
              rows={2}
              {...registerOrg('address')}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditOrgOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingOrg}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {isSubmittingOrg && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* CREATE PMO MODAL */}
      <Modal
        isOpen={isCreatePmoOpen}
        onClose={() => setIsCreatePmoOpen(false)}
        title={`Provision Primary PMO for ${org.name}`}
      >
        <form onSubmit={handleCreatePmoSubmit(onSubmitCreatePmo)} className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            The provisioned user will be assigned the <strong className="text-slate-800">PMO</strong> role and bound exclusively to this organization tenant.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Dr. Ramesh Kumar"
              {...registerCreatePmo('name')}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {createPmoErrors.name && (
              <p className="text-[11px] text-rose-600 mt-1">{createPmoErrors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Corporate Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                placeholder="pmo@institution.edu"
                {...registerCreatePmo('email')}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              {createPmoErrors.email && (
                <p className="text-[11px] text-rose-600 mt-1">{createPmoErrors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                placeholder="+91-9876543210"
                {...registerCreatePmo('phone')}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Initial Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              placeholder="Min 8 chars, uppercase, lowercase, number, symbol"
              {...registerCreatePmo('password')}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {createPmoErrors.password && (
              <p className="text-[11px] text-rose-600 mt-1">{createPmoErrors.password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
            <select
              {...registerCreatePmo('status')}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreatePmoOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingCreatePmo}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {isSubmittingCreatePmo && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Provision PMO</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT PMO MODAL */}
      <Modal
        isOpen={isEditPmoOpen}
        onClose={() => setIsEditPmoOpen(false)}
        title="Edit Placement Officer Details"
      >
        <form onSubmit={handleEditPmoSubmit(onSubmitEditPmo)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              {...registerEditPmo('name')}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {editPmoErrors.name && (
              <p className="text-[11px] text-rose-600 mt-1">{editPmoErrors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                {...registerEditPmo('phone')}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                {...registerEditPmo('status')}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reset Password (Optional)
            </label>
            <input
              type="password"
              placeholder="Leave blank to retain current password"
              {...registerEditPmo('password')}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {editPmoErrors.password && (
              <p className="text-[11px] text-rose-600 mt-1">{editPmoErrors.password.message}</p>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              If provided, this immediately invalidates existing PMO sessions across devices.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditPmoOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingEditPmo}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {isSubmittingEditPmo && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save PMO Details</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.action}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        confirmVariant={confirmDialog.confirmVariant}
        isLoading={confirmDialog.isLoading}
      />
    </div>
  );
}
