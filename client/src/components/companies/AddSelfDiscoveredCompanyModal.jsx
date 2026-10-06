import React, { useState, useEffect } from 'react';
import companyService from '../../services/company.service';
import {
  X,
  Search,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  ArrowRight,
  Globe,
  MapPin,
  User,
  Mail,
  Phone,
  Briefcase,
  ShieldAlert,
} from 'lucide-react';

export default function AddSelfDiscoveredCompanyModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1: Search Pre-Check, 2: Registration Form, 3: Success
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [exactMatchFound, setExactMatchFound] = useState(null);

  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    website: '',
    linkedin: '',
    country: 'India',
    state: '',
    city: '',
    location: '',
    remarks: '',
    primaryContact: {
      name: '',
      designation: '',
      email: '',
      phone: '',
      linkedin: '',
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [createdCompany, setCreatedCompany] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSearchQuery('');
      setSearchResults([]);
      setHasSearched(false);
      setExactMatchFound(null);
      setFormError(null);
      setCreatedCompany(null);
      setFormData({
        companyName: '',
        industry: '',
        website: '',
        linkedin: '',
        country: 'India',
        state: '',
        city: '',
        location: '',
        remarks: '',
        primaryContact: { name: '', designation: '', email: '', phone: '', linkedin: '' },
      });
    }
  }, [isOpen]);

  const normalizeStr = (str) => (str || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  const handleSearchCheck = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setFormError(null);
    setExactMatchFound(null);

    try {
      const res = await companyService.getCompanies({ search: searchQuery.trim(), limit: 20 });
      if (res.success) {
        const docs = res.data || [];
        setSearchResults(docs);
        setHasSearched(true);

        const targetNorm = normalizeStr(searchQuery);
        const match = docs.find((c) => normalizeStr(c.companyName) === targetNorm);
        if (match) {
          setExactMatchFound(match);
        }
      }
    } catch (err) {
      console.error('Search check failed:', err);
      // Fallback: allow user to proceed if search service fails
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleProceedToForm = () => {
    setFormData((prev) => ({
      ...prev,
      companyName: searchQuery.trim(),
    }));
    setStep(2);
  };

  const handleSubmitCompany = async (e) => {
    e.preventDefault();
    if (!formData.companyName.trim()) {
      setFormError('Company name is required');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        companyName: formData.companyName.trim(),
        industry: formData.industry.trim(),
        website: formData.website.trim(),
        linkedin: formData.linkedin.trim(),
        country: formData.country.trim() || 'India',
        state: formData.state.trim(),
        city: formData.city.trim(),
        location: formData.location.trim(),
        remarks: formData.remarks.trim(),
        primaryContact: formData.primaryContact.name.trim()
          ? {
              name: formData.primaryContact.name.trim(),
              designation: formData.primaryContact.designation.trim(),
              email: formData.primaryContact.email.trim(),
              phone: formData.primaryContact.phone.trim(),
              linkedin: formData.primaryContact.linkedin.trim(),
            }
          : undefined,
      };

      const res = await companyService.createCompany(payload);

      if (res.success) {
        setCreatedCompany(res.data);
        setStep(3);
        if (onSuccess) onSuccess(res.data);
      }
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to add company. Please verify details.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add Self-Discovered Company</h2>
            <p className="text-xs text-slate-500">
              Register a company you researched independently. It will be assigned to you automatically.
            </p>
          </div>
        </div>

        {/* STEP 1: Search & Duplication Pre-Check */}
        {step === 1 && (
          <div className="py-6 space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Step 1: Check Portal Duplicates First
              </label>
              <form onSubmit={handleSearchCheck} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Type company name (e.g. Acme Tech Solutions)..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setHasSearched(false);
                      setExactMatchFound(null);
                    }}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!searchQuery.trim() || isSearching}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isSearching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Search Portal
                </button>
              </form>
            </div>

            {/* Exact Match Alert */}
            {exactMatchFound && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-900 space-y-1">
                  <div className="font-bold text-rose-950">Company Already Registered in Portal</div>
                  <p>
                    <span className="font-bold">{exactMatchFound.companyName}</span> is already registered in your organization. Companies cannot be duplicated.
                  </p>
                  <p className="text-slate-600 pt-1">
                    Please search for this company in your directory or contact your PMO to request access.
                  </p>
                </div>
              </div>
            )}

            {/* Search Results / No Match State */}
            {hasSearched && !exactMatchFound && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-xs text-emerald-950">
                    <span className="font-bold">No Exact Duplicate Found</span> for &quot;{searchQuery}&quot;. You can proceed to add this company.
                  </div>
                </div>

                <button
                  onClick={handleProceedToForm}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  <span>Continue & Register</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Company Details Form */}
        {step === 2 && (
          <form onSubmit={handleSubmitCompany} className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {formError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2 text-xs font-semibold text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Company Information */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500">
                Company Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Industry</label>
                  <input
                    type="text"
                    placeholder="e.g. Information Technology"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Website URL</label>
                  <input
                    type="text"
                    placeholder="e.g. www.acme.com"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">LinkedIn Page</label>
                  <input
                    type="text"
                    placeholder="e.g. linkedin.com/company/acme"
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Bangalore"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    placeholder="e.g. Karnataka"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Primary HR Contact */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Primary HR / Recruiter Contact (Optional)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">HR Contact Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Jane Doe"
                    value={formData.primaryContact.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        primaryContact: { ...formData.primaryContact, name: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">HR Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Talent Acquisition Manager"
                    value={formData.primaryContact.designation}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        primaryContact: { ...formData.primaryContact, designation: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">HR Email</label>
                  <input
                    type="email"
                    placeholder="e.g. hr@company.com"
                    value={formData.primaryContact.email}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        primaryContact: { ...formData.primaryContact, email: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">HR Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 9876543210"
                    value={formData.primaryContact.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        primaryContact: { ...formData.primaryContact, phone: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Back to Search
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save & Assign Company
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Success Banner */}
        {step === 3 && createdCompany && (
          <div className="py-6 space-y-5 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">Company Registered Successfully!</h3>
              <p className="text-xs text-slate-500 mt-1">
                <span className="font-semibold text-slate-800">&quot;{createdCompany.companyName}&quot;</span> has been registered and automatically assigned to you for outreach.
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 inline-block text-left w-full">
              <div className="font-bold mb-1">Company Summary:</div>
              <div>Industry: {createdCompany.industry || 'N/A'}</div>
              <div>Location: {[createdCompany.city, createdCompany.country].filter(Boolean).join(', ') || 'N/A'}</div>
              <div>Source: <span className="font-semibold">Team Member Self-Added</span></div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
              >
                Done & View My Companies
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
