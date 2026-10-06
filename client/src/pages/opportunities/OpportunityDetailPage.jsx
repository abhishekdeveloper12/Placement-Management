import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import opportunityService from '../../services/opportunity.service';
import OpportunityFormModal from '../../components/opportunities/OpportunityFormModal';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import {
  Briefcase,
  Building2,
  MapPin,
  DollarSign,
  FileText,
  Download,
  Upload,
  Trash2,
  Edit,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Clock,
  User,
  CheckCircle2,
  Globe,
  FileCode,
  Shield,
  Star,
  MessageSquare,
  Check,
} from 'lucide-react';

export default function OpportunityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);

  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [uploadingJd, setUploadingJd] = useState(false);

  const [shortlistLoading, setShortlistLoading] = useState(false);
  const [reviewNoteInput, setReviewNoteInput] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);

  const isPmoOrSuperAdmin = currentUser?.role === 'PMO' || currentUser?.role === 'SUPER_ADMIN';

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await opportunityService.getOpportunityById(id);
      if (res.success) {
        setOpportunity(res.data);
        setReviewNoteInput(res.data.pmoReviewNote || '');
      }
    } catch (err) {
      console.error('Failed to load opportunity detail:', err);
      setError(err.response?.data?.error?.message || 'Failed to load job opportunity details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleJdFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingJd(true);
      try {
        const res = await opportunityService.uploadJdDocument(id, file);
        if (res.success) {
          fetchDetail();
        }
      } catch (err) {
        alert(err.response?.data?.error?.message || 'Failed to upload JD document');
      } finally {
        setUploadingJd(false);
      }
    }
  };

  const handleRemoveJd = async () => {
    if (!window.confirm('Are you sure you want to remove the current JD document?')) return;
    try {
      const res = await opportunityService.deleteJdDocument(id);
      if (res.success) {
        fetchDetail();
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to remove JD document');
    }
  };

  const handleToggleShortlist = async (targetShortlistedState) => {
    setShortlistLoading(true);
    try {
      const res = await opportunityService.shortlistOpportunity(id, {
        isShortlisted: targetShortlistedState,
        pmoReviewNote: reviewNoteInput,
      });
      if (res.success) {
        setOpportunity(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update shortlist status');
    } finally {
      setShortlistLoading(false);
    }
  };

  const handleSaveReviewNote = async () => {
    setShortlistLoading(true);
    try {
      const res = await opportunityService.shortlistOpportunity(id, {
        isShortlisted: opportunity.isShortlisted,
        pmoReviewNote: reviewNoteInput,
      });
      if (res.success) {
        setOpportunity(res.data);
        setIsEditingNote(false);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to save review note');
    } finally {
      setShortlistLoading(false);
    }
  };

  const formatDate = (dateStr) => {
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'HIRING_NOW':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Hiring Now</span>;
      case 'HIRING_PLANNED':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Planned</span>;
      case 'NOT_HIRING':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Not Hiring</span>;
      case 'ON_HOLD':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">On Hold</span>;
      case 'CLOSED':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">Closed</span>;
      default:
        return status;
    }
  };

  const getOppTypeBadge = (type) => {
    switch (type) {
      case 'FULL_TIME':
        return <span className="px-3 py-1 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">Full-Time Position</span>;
      case 'INTERNSHIP':
        return <span className="px-3 py-1 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">Internship</span>;
      case 'INTERNSHIP_PPO':
        return <span className="px-3 py-1 rounded text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">Internship + PPO</span>;
      case 'MULTIPLE':
        return <span className="px-3 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Multiple Profiles</span>;
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-sm font-medium">Loading job opportunity details...</span>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="p-8 text-center text-rose-600 space-y-4">
        <AlertCircle className="w-10 h-10 mx-auto" />
        <div className="font-bold text-base">{error || 'Opportunity not found'}</div>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  const backRoute = currentUser?.role === 'PMO' ? '/pmo/opportunities' : '/team-member/opportunities';

  return (
    <div className="space-y-6">
      {/* Back Link & Header Banner */}
      <div>
        <Link to={backRoute} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Opportunities</span>
        </Link>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{opportunity.title}</h1>
              {getStatusBadge(opportunity.hiringStatus)}
              {opportunity.isShortlisted && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>Shortlisted</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
              <span className="flex items-center gap-1 font-semibold text-slate-800">
                <Building2 className="w-4 h-4 text-slate-400" />
                {opportunity.company?.name}
              </span>
              <span>&bull;</span>
              <span>Captured: {formatDate(opportunity.createdAt)}</span>
              <span>&bull;</span>
              <span>Source: {opportunity.source}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEditOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Edit className="w-4 h-4" />
              <span>Edit Opportunity</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Opportunity Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-6">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              <span>Hiring Requirements & Profile Specifications</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Opportunity Type</span>
                <div className="mt-1">{getOppTypeBadge(opportunity.opportunityType)}</div>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Target Candidate Group</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{opportunity.candidateType}</span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Estimated Openings</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{opportunity.openings || 'Not specified'}</span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Job Location & Work Mode</span>
                <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                  {opportunity.location || 'Flexible'} {opportunity.workMode && `(${opportunity.workMode})`}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Salary / CTC Package</span>
                <span className="font-bold text-emerald-700 text-sm mt-0.5 block">{opportunity.salary || 'Not disclosed'}</span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Stipend Amount</span>
                <span className="font-bold text-indigo-700 text-sm mt-0.5 block">{opportunity.stipend || 'Not applicable / disclosed'}</span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Bond / Service Agreement</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{opportunity.bond || 'None'}</span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Captured By</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {opportunity.creator?.name || 'N/A'} ({opportunity.creator?.email})
                </span>
              </div>
            </div>

            {opportunity.specialRequirement && (
              <div className="pt-4 border-t border-slate-100">
                <span className="text-slate-500 font-semibold block text-xs mb-1">
                  Special Requirements / Eligibility Criteria
                </span>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-slate-800 text-xs leading-relaxed whitespace-pre-wrap">
                  {opportunity.specialRequirement}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: JD Attachment & Company Context Card */}
        <div className="space-y-6">
          {/* PMO Review & Shortlist Status Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Star className={`w-5 h-5 ${opportunity.isShortlisted ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                <span>PMO Review & Shortlisting</span>
              </span>
              {opportunity.isShortlisted && (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Shortlisted
                </span>
              )}
            </h2>

            {isPmoOrSuperAdmin ? (
              <div className="space-y-4 text-xs">
                <p className="text-slate-500 leading-relaxed">
                  Shortlisting makes this opportunity visible for student matching, eligibility verification, and placement drive scheduling.
                </p>

                <button
                  disabled={shortlistLoading}
                  onClick={() => handleToggleShortlist(!opportunity.isShortlisted)}
                  className={`w-full py-2.5 px-4 rounded-lg font-bold flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer ${
                    opportunity.isShortlisted
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
                >
                  {shortlistLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Star className={`w-4 h-4 ${opportunity.isShortlisted ? 'fill-amber-600 text-amber-600' : 'fill-white text-white'}`} />
                      <span>{opportunity.isShortlisted ? 'Unshortlist Opportunity' : 'Shortlist Opportunity for Students'}</span>
                    </>
                  )}
                </button>

                {/* Review Note Section */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                      <span>PMO Internal Review Note</span>
                    </label>
                    {!isEditingNote && (
                      <button
                        onClick={() => setIsEditingNote(true)}
                        className="text-[11px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                      >
                        {opportunity.pmoReviewNote ? 'Edit Note' : 'Add Note'}
                      </button>
                    )}
                  </div>

                  {isEditingNote ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={reviewNoteInput}
                        onChange={(e) => setReviewNoteInput(e.target.value)}
                        placeholder="Enter PMO evaluation notes, candidate criteria guidance, or placement priorities..."
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReviewNoteInput(opportunity.pmoReviewNote || '');
                            setIsEditingNote(false);
                          }}
                          className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded font-medium cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={shortlistLoading}
                          onClick={handleSaveReviewNote}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          {shortlistLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          <span>Save Note</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-700 text-xs italic">
                      {opportunity.pmoReviewNote ? `"${opportunity.pmoReviewNote}"` : 'No review notes added by PMO yet.'}
                    </div>
                  )}
                </div>

                {/* Audit Info */}
                {opportunity.shortlistedAt && (
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 space-y-0.5">
                    <div>Shortlisted on: {formatDate(opportunity.shortlistedAt)}</div>
                    {opportunity.shortlistedByUser && (
                      <div>By: {opportunity.shortlistedByUser.name} ({opportunity.shortlistedByUser.email})</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-700">Status:</span>
                  {opportunity.isShortlisted ? (
                    <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Shortlisted by PMO</span>
                  ) : (
                    <span className="text-slate-500 font-medium">Standard / Under PMO Review</span>
                  )}
                </div>

                {opportunity.pmoReviewNote && (
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-700 block">PMO Review Note:</span>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-700 italic">
                      "{opportunity.pmoReviewNote}"
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Job Description (JD) Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>Job Description (JD)</span>
              </span>
            </h2>

            {opportunity.jdDocument ? (
              <div className="space-y-4 text-xs">
                <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 truncate max-w-[180px]">
                        {opportunity.jdDocument.originalFileName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Uploaded: {formatDate(opportunity.jdDocument.createdAt)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Size: {(opportunity.jdDocument.fileSize / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <a
                    href={opportunityService.getJdDownloadUrl(opportunity.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download / View JD File</span>
                  </a>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <label className="text-xs text-slate-600 hover:text-indigo-600 font-semibold cursor-pointer flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Replace File</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={handleJdFileChange}
                      />
                    </label>

                    <button
                      onClick={handleRemoveJd}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-3">
                <Upload className="w-8 h-8 mx-auto text-slate-300" />
                <div className="text-xs text-slate-500">No Job Description file attached to this opportunity yet.</div>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Attach JD File (.pdf, .doc)</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleJdFileChange}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Company Summary Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>Target Company Details</span>
            </h3>

            <div className="font-bold text-slate-900 text-sm">{opportunity.company?.name}</div>
            <div className="text-slate-500">
              <strong>Industry:</strong> {opportunity.company?.industry || 'N/A'}
            </div>
            <div className="text-slate-500">
              <strong>Location:</strong> {opportunity.company?.city || 'N/A'}
            </div>
            {opportunity.company?.website && (
              <a
                href={opportunity.company.website.startsWith('http') ? opportunity.company.website : `https://${opportunity.company.website}`}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline flex items-center gap-1 mt-1 truncate"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{opportunity.company.website}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Edit Form Modal */}
      {isEditOpen && (
        <OpportunityFormModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSuccess={() => fetchDetail()}
          initialData={opportunity}
        />
      )}
    </div>
  );
}
