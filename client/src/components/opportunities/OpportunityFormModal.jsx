import React, { useState, useEffect } from 'react';
import opportunityService from '../../services/opportunity.service';
import assignmentService from '../../services/assignment.service';
import companyService from '../../services/company.service';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import {
  Briefcase,
  X,
  Loader2,
  Upload,
  FileText,
  AlertCircle,
  Building2,
  DollarSign,
  MapPin,
  Clock,
  Shield,
} from 'lucide-react';

export default function OpportunityFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData = null,
  preselectedCompanyId = '',
}) {
  const user = useSelector(selectCurrentUser);
  const isEditing = Boolean(initialData);

  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    companyId: preselectedCompanyId || '',
    title: '',
    opportunityType: 'FULL_TIME',
    candidateType: 'FRESHERS',
    hiringStatus: 'HIRING_NOW',
    source: 'MANUAL',
    openings: '',
    location: '',
    workMode: 'ON_SITE',
    salary: '',
    stipend: '',
    bond: '',
    specialRequirement: '',
  });

  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    // Load initial values if editing
    if (initialData) {
      setFormData({
        companyId: initialData.companyId?.id || initialData.companyId || '',
        title: initialData.title || '',
        opportunityType: initialData.opportunityType || 'FULL_TIME',
        candidateType: initialData.candidateType || 'FRESHERS',
        hiringStatus: initialData.hiringStatus || 'HIRING_NOW',
        source: initialData.source || 'MANUAL',
        openings: initialData.openings || '',
        location: initialData.location || '',
        workMode: initialData.workMode || '',
        salary: initialData.salary || '',
        stipend: initialData.stipend || '',
        bond: initialData.bond || '',
        specialRequirement: initialData.specialRequirement || '',
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        companyId: preselectedCompanyId || prev.companyId || '',
      }));
    }

    // Load available companies
    async function loadCompanies() {
      setLoadingCompanies(true);
      try {
        if (user?.role === 'TEAM_MEMBER') {
          const res = await assignmentService.getTeamMemberAssignedCompanies({ limit: 100 });
          if (res.success) {
            setCompanies(res.data);
            if (!preselectedCompanyId && !initialData && res.data.length > 0) {
              setFormData((p) => ({ ...p, companyId: res.data[0]._id }));
            }
          }
        } else {
          const res = await companyService.getCompanies({ limit: 100 });
          if (res.success) {
            setCompanies(res.data);
            if (!preselectedCompanyId && !initialData && res.data.length > 0) {
              setFormData((p) => ({ ...p, companyId: res.data[0]._id }));
            }
          }
        }
      } catch (err) {
        console.error('Failed to load companies dropdown:', err);
      } finally {
        setLoadingCompanies(false);
      }
    }

    loadCompanies();
  }, [isOpen, initialData, preselectedCompanyId, user?.role]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedExts = ['.pdf', '.doc', '.docx'];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!allowedExts.includes(ext)) {
        alert('Invalid file format. Only PDF, DOC, and DOCX files are allowed.');
        e.target.value = '';
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.companyId || !formData.title || !formData.opportunityType || !formData.candidateType) {
      setError('Please fill in Company, Job Profile, Opportunity Type, and Candidate Type.');
      return;
    }

    setSubmitting(true);
    try {
      let oppResult;
      if (isEditing) {
        const res = await opportunityService.updateOpportunity(initialData.id, formData);
        oppResult = res.data;
      } else {
        const res = await opportunityService.createOpportunity(formData);
        oppResult = res.data;
      }

      // If a file is attached, upload it
      if (selectedFile && oppResult && oppResult.id) {
        await opportunityService.uploadJdDocument(oppResult.id, selectedFile);
      }

      onSuccess(oppResult);
      onClose();
    } catch (err) {
      console.error('Failed to save opportunity:', err);
      setError(err.response?.data?.error?.message || 'Failed to save job opportunity');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden my-8 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            <span>{isEditing ? 'Edit Job Opportunity' : 'Create New Job Opportunity'}</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="m-6 mb-0 p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Target Company & Job Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company *</label>
              {loadingCompanies ? (
                <div className="flex items-center gap-2 text-slate-400 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading companies...</span>
                </div>
              ) : (
                <select
                  required
                  disabled={isEditing || Boolean(preselectedCompanyId)}
                  value={formData.companyId}
                  onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium text-slate-900 disabled:bg-slate-100"
                >
                  <option value="">Select Company...</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name || c.companyName} ({c.industry || 'General'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Job Profile / Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Software Engineer Trainee"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
              />
            </div>
          </div>

          {/* Opportunity Type & Candidate Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Opportunity Type *</label>
              <select
                value={formData.opportunityType}
                onChange={(e) => setFormData({ ...formData, opportunityType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
              >
                <option value="FULL_TIME">Full-Time</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="INTERNSHIP_PPO">Internship + PPO</option>
                <option value="MULTIPLE">Multiple Profiles</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Candidates *</label>
              <select
                value={formData.candidateType}
                onChange={(e) => setFormData({ ...formData, candidateType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
              >
                <option value="FRESHERS">Freshers Only</option>
                <option value="EXPERIENCED">Experienced Only</option>
                <option value="BOTH">Freshers & Experienced</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hiring Status *</label>
              <select
                value={formData.hiringStatus}
                onChange={(e) => setFormData({ ...formData, hiringStatus: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-semibold"
              >
                <option value="HIRING_NOW">Hiring Now</option>
                <option value="HIRING_PLANNED">Hiring Planned</option>
                <option value="NOT_HIRING">Not Hiring</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>

          {/* Conditional Prominent Compensation & Openings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Expected Openings</label>
              <input
                type="text"
                placeholder="e.g. 10 or Approx 15"
                value={formData.openings}
                onChange={(e) => setFormData({ ...formData, openings: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Salary / CTC {formData.opportunityType === 'FULL_TIME' && <span className="text-indigo-600 font-bold">(Primary)</span>}
              </label>
              <input
                type="text"
                placeholder="e.g. ₹6–8 LPA"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Stipend {(formData.opportunityType === 'INTERNSHIP' || formData.opportunityType === 'INTERNSHIP_PPO') && <span className="text-indigo-600 font-bold">(Prominent)</span>}
              </label>
              <input
                type="text"
                placeholder="e.g. ₹15,000/month"
                value={formData.stipend}
                onChange={(e) => setFormData({ ...formData, stipend: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              />
            </div>
          </div>

          {/* Location, Work Mode, Bond & Source */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Job Location</label>
              <input
                type="text"
                placeholder="e.g. Bangalore / Remote"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Work Mode</label>
              <select
                value={formData.workMode}
                onChange={(e) => setFormData({ ...formData, workMode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value="ON_SITE">On-Site</option>
                <option value="HYBRID">Hybrid</option>
                <option value="REMOTE">Remote</option>
                <option value="">Not Specified</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bond / Agreement</label>
              <input
                type="text"
                placeholder="e.g. 1 Year / None"
                value={formData.bond}
                onChange={(e) => setFormData({ ...formData, bond: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Opportunity Source</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value="HR_CALL">HR Call</option>
                <option value="HR_EMAIL">HR Email</option>
                <option value="HR_WHATSAPP">HR WhatsApp</option>
                <option value="LINKEDIN">LinkedIn</option>
                <option value="WEBSITE">Website</option>
                <option value="REFERRAL">Referral</option>
                <option value="MANUAL">Manual Entry</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          {/* Special Requirements */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Special Requirements / Eligibility Criteria</label>
            <textarea
              rows={2}
              placeholder="e.g. Min 65% aggregate, B.Tech CS/IT 2026 Batch, no active backlogs..."
              value={formData.specialRequirement}
              onChange={(e) => setFormData({ ...formData, specialRequirement: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* JD File Attachment Input */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block font-semibold text-slate-700 mb-1">
              Attach Job Description (JD) File (.pdf, .doc, .docx)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
              {selectedFile && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                  Ready to upload: {selectedFile.name}
                </span>
              )}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-2xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isEditing ? 'Save Changes' : 'Create Opportunity'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
