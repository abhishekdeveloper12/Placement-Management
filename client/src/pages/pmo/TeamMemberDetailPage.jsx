import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '../../utils/zodResolver';
import pmoService from '../../services/pmo.service';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  Users,
  ChevronLeft,
  Mail,
  Phone,
  Calendar,
  Clock,
  Edit2,
  Power,
  Shield,
  Building2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Briefcase,
  PhoneCall,
  FileText,
  Lock,
} from 'lucide-react';

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

export default function TeamMemberDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');

  // Modals
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  // Form hook
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(editTeamMemberSchema),
  });

  const fetchMember = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await pmoService.getTeamMember(id);
      if (response.success) {
        setMember(response.data);
      }
    } catch (err) {
      console.error('Failed to load team member details:', err);
      setError(
        err.response?.status === 404
          ? 'Team member not found or belongs to another organization.'
          : err.response?.data?.error?.message || 'Failed to fetch team member details'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  // Open Edit Modal
  const openEditModal = () => {
    if (!member) return;
    reset({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      status: member.status,
      password: '',
      confirmPassword: '',
    });
    setIsEditOpen(true);
  };

  // Submit Edit
  const onSubmitEdit = async (data) => {
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

      const response = await pmoService.updateTeamMember(id, payload);
      if (response.success) {
        setActionSuccess(`Team member "${response.data.name}" profile updated.`);
        setIsEditOpen(false);
        fetchMember();
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Update member error:', err);
      alert(err.response?.data?.error?.message || 'Failed to update member');
    }
  };

  // Toggle Status
  const handleToggleStatus = async () => {
    if (!member) return;
    setStatusLoading(true);
    const newStatus = member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const response = await pmoService.updateTeamMemberStatus(id, newStatus);
      if (response.success) {
        setActionSuccess(`Status updated to ${newStatus}.`);
        setIsConfirmOpen(false);
        fetchMember();
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Status update error:', err);
      alert(err.response?.data?.error?.message || 'Failed to update status');
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

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
        <p className="text-sm font-semibold text-slate-700">Loading team member profile...</p>
        <p className="text-xs text-slate-400 mt-1">Verifying institutional credentials and tenant bounds</p>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="space-y-6">
        <Link
          to="/pmo/team-members"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Team Members</span>
        </Link>
        <div className="p-8 rounded-xl border border-rose-200 bg-rose-50 text-center max-w-xl mx-auto shadow-xs">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-rose-900">Resource Unavailable</h2>
          <p className="text-xs text-rose-700 mt-1 leading-relaxed">
            {error || 'The requested team member could not be found or access is restricted by tenant policy.'}
          </p>
          <button
            onClick={() => navigate('/pmo/team-members')}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors shadow-xs"
          >
            Return to Team Members Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          to="/pmo/team-members"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Team Members</span>
        </Link>
      </div>

      {/* Action Success Alert */}
      {actionSuccess && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm flex items-center gap-2 shadow-xs transition-all">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Profile Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 font-bold text-lg flex items-center justify-center shrink-0 border border-indigo-200 shadow-2xs">
            {member.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{member.name}</h1>
              <Badge variant="TEAM_MEMBER">TEAM_MEMBER</Badge>
              <Badge variant={member.status}>{member.status}</Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono">{member.email}</span>
              </span>
              {member.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{member.phone}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
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
              member.status === 'ACTIVE'
                ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{member.status === 'ACTIVE' ? 'Deactivate Member' : 'Activate Member'}</span>
          </button>
        </div>
      </div>

      {/* Grid: Profile Details & Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal & Contact Profile */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Profile & Institutional Scope</span>
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Full Name:</span>
              <span className="font-semibold text-slate-900">{member.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Email Address:</span>
              <span className="font-mono text-slate-700">{member.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Contact Phone:</span>
              <span className="font-mono text-slate-700">{member.phone || 'Not provided'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Assigned System Role:</span>
              <span className="font-semibold text-amber-700">TEAM_MEMBER</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Tenant Boundary (Org ID):</span>
              <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                {member.organizationId}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500 font-medium">Account Access State:</span>
              <Badge variant={member.status}>{member.status}</Badge>
            </div>
          </div>
        </div>

        {/* Account Activity & Security Audit */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span>Activity & Timestamp Audit</span>
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Last Login Timestamp:</span>
              <span className="font-medium text-slate-800">{formatDate(member.lastLoginAt)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Account Provisioned On:</span>
              <span className="font-medium text-slate-800">{formatDate(member.createdAt)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Last Profile Update:</span>
              <span className="font-medium text-slate-800">{formatDate(member.updatedAt)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500 font-medium">Security Password Hash:</span>
              <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Bcrypt (12 Rounds Hashed)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Responsibilities Notice */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h3 className="text-base font-semibold text-slate-900 mb-2 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-slate-700" />
          <span>Operational Capabilities & Workflow Scope</span>
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          Team Members are operational callers authorized to manage communication campaigns for assigned institutional companies. They cannot administer other users or modify organization settings.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-800 mb-1">
              <PhoneCall className="w-4 h-4 text-indigo-600" />
              <span>HR Outreach</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Place calls to corporate HR contacts and log call outcomes, responses, and hiring statuses.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-800 mb-1">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Opportunity Capture</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Record job opportunities, requirements, compensation packages, and JD attachments.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-800 mb-1">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Role Limitations</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Restricted from creating organizations, onboarding other team members, or viewing cross-tenant data.
            </p>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Team Member — ${member.name}`}
      >
        <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              {...register('name')}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {errors.name && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              {...register('email')}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {errors.email && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              {...register('phone')}
              placeholder="e.g. +91 98765 43210"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Account Status
            </label>
            <select
              {...register('status')}
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
              Leave blank to keep current password unchanged.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  {...register('password')}
                  placeholder="Min. 8 characters"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                {errors.password && (
                  <p className="text-[11px] text-rose-500 mt-1">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  {...register('confirmPassword')}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                {errors.confirmPassword && (
                  <p className="text-[11px] text-rose-500 mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>
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

      {/* CONFIRM STATUS DIALOG */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleToggleStatus}
        isLoading={statusLoading}
        title={
          member.status === 'ACTIVE'
            ? `Deactivate ${member.name}?`
            : `Activate ${member.name}?`
        }
        message={
          member.status === 'ACTIVE'
            ? `Deactivating ${member.name} will immediately suspend their account. They will not be able to log in until reactivated.`
            : `Activating ${member.name} will restore their login access.`
        }
        confirmText={member.status === 'ACTIVE' ? 'Deactivate Member' : 'Activate Member'}
        confirmVariant={member.status === 'ACTIVE' ? 'danger' : 'primary'}
      />
    </div>
  );
}
