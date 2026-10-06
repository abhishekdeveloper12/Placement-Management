import React, { useState, useEffect } from 'react';
import {
  X,
  PhoneCall,
  UserCheck,
  Edit3,
  Calendar,
  Clock,
  Briefcase,
  MapPin,
  Building2,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  FileText,
  Search,
  Check,
  Tag,
} from 'lucide-react';
import interactionService from '../../services/interaction.service';
import jobRoleService from '../../services/jobRole.service';

export default function QuickCallModal({ isOpen, onClose, onSuccess, company, primaryContact }) {
  // Contact State (Inline Edit Support)
  const [showEditContact, setShowEditContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    id: '',
    name: '',
    designation: '',
    email: '',
    phone: '',
    linkedin: '',
  });

  // Job Roles Master State
  const [availableJobRoles, setAvailableJobRoles] = useState([]);
  const [selectedJobRoleIds, setSelectedJobRoleIds] = useState([]);
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);

  // Call Questionnaire Form State
  const [hiringStatus, setHiringStatus] = useState('YES');
  const [candidateType, setCandidateType] = useState('BOTH');
  const [openings, setOpenings] = useState('');
  const [opportunityType, setOpportunityType] = useState('FULL_TIME');
  const [ppoAvailable, setPpoAvailable] = useState('NOT_SURE');
  const [location, setLocation] = useState('');
  const [workMode, setWorkMode] = useState('NOT_SPECIFIED');
  const [salaryOrStipend, setSalaryOrStipend] = useState('');
  const [bond, setBond] = useState('NOT_SURE');
  const [specificRequirement, setSpecificRequirement] = useState('');
  const [hrResponse, setHrResponse] = useState('');
  const [nextAction, setNextAction] = useState('FOLLOW_UP');
  const [followUpDate, setFollowUpDate] = useState('');
  const [interactionDate, setInteractionDate] = useState('');

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Initialize form when modal opens or company/contact changes
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      setIsSubmitting(false);
      setSelectedJobRoleIds([]);
      setRoleSearchQuery('');

      if (primaryContact) {
        setContactForm({
          id: primaryContact.id || primaryContact._id || '',
          name: primaryContact.name || '',
          designation: primaryContact.designation || '',
          email: primaryContact.email || '',
          phone: primaryContact.phone || '',
          linkedin: primaryContact.linkedin || '',
        });
      } else {
        setContactForm({ id: '', name: '', designation: '', email: '', phone: '', linkedin: '' });
      }

      // Default follow-up date to 7 days from now
      const defaultFollowUp = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      setFollowUpDate(defaultFollowUp);

      // Default call date-time to now
      const nowFormatted = new Date().toISOString().slice(0, 16);
      setInteractionDate(nowFormatted);

      // Fetch active job roles for selection
      fetchActiveRoles();
    }
  }, [isOpen, primaryContact, company]);

  const fetchActiveRoles = async () => {
    try {
      setIsLoadingRoles(true);
      const res = await jobRoleService.getActiveJobRoles();
      setAvailableJobRoles(res.data || []);
    } catch (err) {
      console.error('Failed to load active job roles:', err);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  if (!isOpen || !company) return null;

  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setContactForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleJobRole = (roleId) => {
    setSelectedJobRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Validation
    if (nextAction === 'FOLLOW_UP' && !followUpDate) {
      setErrorMsg('Follow-up date is required when next action is FOLLOW_UP');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        hiringStatus,
        jobRoleIds: selectedJobRoleIds,
        candidateType,
        openings: openings ? Number(openings) : null,
        opportunityType,
        ppoAvailable,
        location,
        workMode,
        salaryOrStipend,
        bond,
        specificRequirement,
        hrResponse,
        nextAction,
        followUpDate: nextAction === 'FOLLOW_UP' ? followUpDate : null,
        interactionDate: interactionDate ? new Date(interactionDate).toISOString() : new Date().toISOString(),
        contact: contactForm.name ? contactForm : null,
      };

      const companyId = company.id || company._id;
      const res = await interactionService.recordCallInteraction(companyId, payload);

      setSuccessMsg('Call record saved successfully.');

      setTimeout(() => {
        if (onSuccess) onSuccess(res.data);
        onClose();
      }, 1000);
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to record call interaction';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Quick HR Call Record
              </h2>
              <p className="text-xs text-slate-300">
                {company.companyName} &bull; {company.industry || 'Corporate Partner'} &bull; {company.city || 'India'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="font-semibold">{successMsg}</div>
            </div>
          )}

          {/* Section 1: HR Contact Card & Inline Confirmation */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span>Primary HR Contact Details</span>
              </div>
              <button
                type="button"
                onClick={() => setShowEditContact(!showEditContact)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{showEditContact ? 'Close Contact Form' : contactForm.name ? 'Edit Contact' : '+ Add Contact'}</span>
              </button>
            </div>

            {!showEditContact ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">HR Name:</span>
                  <span className="font-semibold text-slate-900">{contactForm.name || 'Not Specified'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Designation:</span>
                  <span className="font-medium text-slate-800">{contactForm.designation || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Phone / Mobile:</span>
                  <span className="font-semibold text-indigo-600 font-mono">{contactForm.phone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Corporate Email:</span>
                  <span className="font-mono text-slate-700">{contactForm.email || 'N/A'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[11px]">LinkedIn Profile:</span>
                  <span className="text-slate-600 truncate block">{contactForm.linkedin || 'N/A'}</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">HR Name</label>
                  <input
                    type="text"
                    name="name"
                    value={contactForm.name}
                    onChange={handleContactChange}
                    placeholder="e.g. Ms. Anjali Sharma"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    name="designation"
                    value={contactForm.designation}
                    onChange={handleContactChange}
                    placeholder="e.g. Talent Acquisition Head"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    name="phone"
                    value={contactForm.phone}
                    onChange={handleContactChange}
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={contactForm.email}
                    onChange={handleContactChange}
                    placeholder="hr@company.com"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">LinkedIn Profile</label>
                  <input
                    type="text"
                    name="linkedin"
                    value={contactForm.linkedin}
                    onChange={handleContactChange}
                    placeholder="https://linkedin.com/in/hr-profile"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Call Date & Time */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Call Log Timestamp</span>
            </div>
            <input
              type="datetime-local"
              value={interactionDate}
              onChange={(e) => setInteractionDate(e.target.value)}
              className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Section 3: Question 1 — Currently Hiring? */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
              1. Is the employer currently hiring students/graduates? <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { value: 'YES', label: 'YES (Actively Hiring)', color: 'border-emerald-300 bg-emerald-50/50 text-emerald-900' },
                { value: 'HIRING_PLANNED', label: 'HIRING PLANNED', color: 'border-blue-300 bg-blue-50/50 text-blue-900' },
                { value: 'NO', label: 'NO (Budget Frozen)', color: 'border-rose-300 bg-rose-50/50 text-rose-900' },
                { value: 'NOT_SURE', label: 'NOT SURE', color: 'border-slate-300 bg-slate-50 text-slate-900' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setHiringStatus(opt.value)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                    hiringStatus === opt.value
                      ? `${opt.color} ring-2 ring-indigo-500 shadow-xs`
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional UX Banner when Hiring Status = NO */}
          {hiringStatus === 'NO' && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Employer Not Hiring:</strong> Unnecessary hiring profile inputs are hidden. Focus on capturing the HR response notes, setting next action, and scheduling follow-up date below.
              </div>
            </div>
          )}

          {/* Section 4: Progressive Hiring Questionnaire (Shown if Hiring != NO) */}
          {hiringStatus !== 'NO' && (
            <div className="space-y-4 p-4 rounded-xl border border-indigo-100 bg-indigo-50/20">
              <div className="text-xs font-bold text-indigo-950 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                Quick Hiring Requirements
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* 2. Job Roles Selection (PMO-Managed Master) */}
                <div className="sm:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-slate-800">
                      2. Hiring Profiles / Job Roles (Select from PMO Master)
                    </label>
                    <span className="text-[11px] font-medium text-slate-500">
                      {selectedJobRoleIds.length} role(s) selected
                    </span>
                  </div>

                  {/* Selected Role Badges */}
                  {selectedJobRoleIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-lg border border-indigo-200">
                      {selectedJobRoleIds.map((id) => {
                        const roleObj = availableJobRoles.find((r) => (r._id || r.id) === id);
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
                          >
                            <Tag className="w-3 h-3 text-indigo-500" />
                            {roleObj ? roleObj.name : 'Unknown Role'}
                            <button
                              type="button"
                              onClick={() => toggleJobRole(id)}
                              className="text-indigo-400 hover:text-indigo-900 rounded-full p-0.5 hover:bg-indigo-100 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Search and Selection Container */}
                  <div className="bg-white rounded-xl border border-slate-200 p-2.5 space-y-2 shadow-2xs">
                    {/* Search Filter Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={roleSearchQuery}
                        onChange={(e) => setRoleSearchQuery(e.target.value)}
                        placeholder="Search active job roles..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Roles List */}
                    {isLoadingRoles ? (
                      <div className="py-4 text-center text-xs text-slate-500">Loading PMO job roles...</div>
                    ) : availableJobRoles.length === 0 ? (
                      <div className="py-3 px-2 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        No active job roles available in PMO Master. Configure job roles in PMO portal.
                      </div>
                    ) : (
                      <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 pr-1">
                        {availableJobRoles
                          .filter((role) => role.name.toLowerCase().includes(roleSearchQuery.toLowerCase()))
                          .map((role) => {
                            const roleId = role._id || role.id;
                            const isChecked = selectedJobRoleIds.includes(roleId);
                            return (
                              <label
                                key={roleId}
                                onClick={() => toggleJobRole(roleId)}
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                                  isChecked
                                    ? 'bg-indigo-50/70 text-indigo-950 font-semibold'
                                    : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}}
                                    className="w-3.5 h-3.5 text-indigo-600 rounded-xs border-slate-300 focus:ring-indigo-500"
                                  />
                                  <span>{role.name}</span>
                                </div>
                                {role.description && (
                                  <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                                    {role.description}
                                  </span>
                                )}
                              </label>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Candidate Type */}
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">3. Candidate Experience Type</label>
                  <select
                    value={candidateType}
                    onChange={(e) => setCandidateType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="FRESHERS">Freshers (Campus)</option>
                    <option value="EXPERIENCED">Experienced (Lateral)</option>
                    <option value="BOTH">Both Freshers & Experienced</option>
                  </select>
                </div>

                {/* 4. Approximate Openings */}
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">4. Approx. Openings (Count)</label>
                  <input
                    type="number"
                    min="0"
                    value={openings}
                    onChange={(e) => setOpenings(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* 5. Opportunity Type */}
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">5. Opportunity Type</label>
                  <select
                    value={opportunityType}
                    onChange={(e) => setOpportunityType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="FULL_TIME">Full-Time Direct</option>
                    <option value="INTERNSHIP">Internship Only</option>
                    <option value="INTERNSHIP_PPO">Internship with PPO</option>
                    <option value="MULTIPLE">Multiple Offer Types</option>
                  </select>
                </div>

                {/* Conditional PPO Field */}
                {(opportunityType === 'INTERNSHIP' || opportunityType === 'INTERNSHIP_PPO') && (
                  <div>
                    <label className="block font-semibold text-slate-800 mb-1">PPO Available?</label>
                    <select
                      value={ppoAvailable}
                      onChange={(e) => setPpoAvailable(e.target.value)}
                      className="w-full px-3 py-2 border border-indigo-300 rounded-lg bg-indigo-50/50 font-semibold text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      <option value="YES">YES — PPO Offered</option>
                      <option value="NO">NO — Internship Only</option>
                      <option value="NOT_SURE">NOT SURE</option>
                    </select>
                  </div>
                )}

                {/* 6. Location */}
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">6. Job Location(s)</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Noida, Gurgaon, Bangalore"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* 7. Work Mode */}
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">7. Work Mode</label>
                  <select
                    value={workMode}
                    onChange={(e) => setWorkMode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="ONSITE">On-site (Office)</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="REMOTE">Remote (Work from Home)</option>
                    <option value="NOT_SPECIFIED">Not Specified</option>
                  </select>
                </div>

                {/* 8. Salary / Stipend */}
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">8. Approx. Package / Stipend</label>
                  <input
                    type="text"
                    value={salaryOrStipend}
                    onChange={(e) => setSalaryOrStipend(e.target.value)}
                    placeholder="e.g. ₹6 LPA or ₹25,000/month"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* 9. Service Agreement / Bond */}
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">9. Service Bond / Agreement?</label>
                  <select
                    value={bond}
                    onChange={(e) => setBond(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="NO">NO Bond</option>
                    <option value="YES">YES (Bond Required)</option>
                    <option value="NOT_SURE">NOT SURE</option>
                  </select>
                </div>

                {/* 10. Specific Requirement */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-800 mb-1">
                    10. Specific Eligibility / Criteria Notes
                  </label>
                  <input
                    type="text"
                    value={specificRequirement}
                    onChange={(e) => setSpecificRequirement(e.target.value)}
                    placeholder="e.g. Minimum 60% aggregate, B.Tech CS/IT only, No active backlogs"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 5: HR Response / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
              12. HR Conversation Summary & Notes <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={hrResponse}
              onChange={(e) => setHrResponse(e.target.value)}
              placeholder="Spoke with HR manager. Discussed headcount requirements, JD dispatch timeline, callback dates..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Section 6: Next Action & Follow-up Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <label className="block font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                13. Next Action Step <span className="text-rose-500">*</span>
              </label>
              <select
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="FOLLOW_UP">FOLLOW UP (Scheduled Callback)</option>
                <option value="WAITING_FOR_JD">WAITING FOR JD (HR sending JD)</option>
                <option value="NO_ACTION">NO ACTION (Not interested / Closed)</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>14. Scheduled Follow-up Date</span>
                {nextAction === 'FOLLOW_UP' && <span className="text-rose-600 font-semibold">(Required)</span>}
              </label>
              <input
                type="date"
                required={nextAction === 'FOLLOW_UP'}
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg bg-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden ${
                  nextAction === 'FOLLOW_UP' ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-300'
                }`}
              />
            </div>
          </div>
        </form>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>Saving Call Record...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Save Call Record
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
