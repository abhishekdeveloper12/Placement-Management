import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import assignmentService from '../../services/assignment.service';
import interactionService from '../../services/interaction.service';
import QuickCallModal from '../../components/outreach/QuickCallModal';
import Badge from '../../components/common/Badge';
import {
  Building2,
  ArrowLeft,
  Globe,
  Linkedin,
  MapPin,
  Mail,
  Phone,
  UserCheck,
  AlertCircle,
  Loader2,
  PhoneCall,
  Calendar,
  Clock,
  History,
  CheckCircle2,
  PlusCircle,
  FileText,
} from 'lucide-react';

export default function TeamMemberCompanyDetailPage() {
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [outreachSummary, setOutreachSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const response = await assignmentService.getTeamMemberAssignedCompanyDetail(id);
      if (response.success) {
        setCompany(response.data);
      }

      // Load interaction history and outreach summary
      const [interRes, summaryRes] = await Promise.all([
        interactionService.getCompanyInteractions(id),
        interactionService.getCompanyOutreachSummary(id),
      ]);

      if (interRes.success) setInteractions(interRes.data || []);
      if (summaryRes.success) setOutreachSummary(summaryRes.data || null);
    } catch (err) {
      console.error('Failed to load assigned company detail or interactions:', err);
      setError(err.response?.data?.error?.message || 'Company not found or not assigned to you');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  const getOutcomeBadge = (outcome) => {
    switch (outcome) {
      case 'HIRING_NOW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Hiring Now
          </span>
        );
      case 'HIRING_PLANNED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Hiring Planned
          </span>
        );
      case 'NOT_HIRING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            Not Hiring
          </span>
        );
      case 'WAITING_FOR_JD':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            Waiting for JD
          </span>
        );
      case 'FOLLOW_UP_REQUIRED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Follow-up Required
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {outcome || 'Not Sure'}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
        <p className="text-sm">Loading assigned company details...</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="space-y-4">
        <Link
          to="/team-member/companies"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Assigned Companies</span>
        </Link>
        <div className="bg-white border border-rose-200 rounded-xl p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Access Restricted / Company Not Found</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {error || 'This company is not currently assigned to your outreach workspace.'}
          </p>
        </div>
      </div>
    );
  }

  const primaryContact = company.primaryContact;
  const currentAssignment = company.currentAssignment;

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Link
          to="/team-member/companies"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Companies</span>
        </Link>

        <div className="flex items-center gap-3">
          <Badge variant={company.status}>{company.status}</Badge>
          <button
            onClick={() => setIsCallModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Call HR / Record Outreach</span>
          </button>
        </div>
      </div>

      {/* Main Company Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 font-bold text-lg flex items-center justify-center border border-emerald-200 shrink-0">
              {company.companyName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{company.companyName}</h1>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                {company.industry && (
                  <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {company.industry}
                  </span>
                )}
                {(company.city || company.state || company.country) && (
                  <span className="flex items-center gap-1 text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{[company.city, company.state, company.country].filter(Boolean).join(', ')}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {company.website && (
              <a
                href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-indigo-600" />
                <span>Visit Website</span>
              </a>
            )}
            {company.linkedin && (
              <a
                href={company.linkedin.startsWith('http') ? company.linkedin : `https://${company.linkedin}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Linkedin className="w-3.5 h-3.5 text-blue-600" />
                <span>LinkedIn</span>
              </a>
            )}
          </div>
        </div>

        {company.remarks && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            <span className="font-bold text-slate-800">Placement Notes:</span> {company.remarks}
          </div>
        )}
      </div>

      {/* Lightweight Outreach Summary Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        <div className="pt-2 sm:pt-0">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Last Contacted
          </div>
          <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {outreachSummary?.lastContactedAt
                ? new Date(outreachSummary.lastContactedAt).toLocaleDateString()
                : 'Never Contacted'}
            </span>
          </div>
        </div>

        <div className="pt-2 sm:pt-0 sm:pl-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Last Call Outcome
          </div>
          <div>{getOutcomeBadge(outreachSummary?.lastOutcome)}</div>
        </div>

        <div className="pt-2 sm:pt-0 sm:pl-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Next Scheduled Follow-up
          </div>
          <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {outreachSummary?.nextFollowUp?.dueDate
                ? new Date(outreachSummary.nextFollowUp.dueDate).toLocaleDateString()
                : 'No Follow-up Scheduled'}
            </span>
          </div>
        </div>

        <div className="pt-2 sm:pt-0 sm:pl-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Total Calls Logged
          </div>
          <div className="text-sm font-bold text-slate-900">
            {outreachSummary?.totalInteractions || 0} calls
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Primary HR Recruiter Contact */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-600" />
              <span>Primary HR Recruiter Contact</span>
            </h2>
            <button
              onClick={() => setIsCallModalOpen(true)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              + Confirm / Edit Contact
            </button>
          </div>

          {primaryContact ? (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Contact Name</span>
                <span className="font-bold text-slate-900">{primaryContact.name}</span>
              </div>
              {primaryContact.designation && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Designation</span>
                  <span className="font-medium text-slate-700">{primaryContact.designation}</span>
                </div>
              )}
              {primaryContact.email && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Email Address</span>
                  <a href={`mailto:${primaryContact.email}`} className="font-mono text-indigo-600 font-semibold hover:underline">
                    {primaryContact.email}
                  </a>
                </div>
              )}
              {primaryContact.phone && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Phone / Mobile</span>
                  <a href={`tel:${primaryContact.phone}`} className="font-mono font-bold text-emerald-700 hover:underline">
                    {primaryContact.phone}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-slate-400 space-y-2">
              <p className="italic">No primary HR contact details recorded yet.</p>
              <button
                onClick={() => setIsCallModalOpen(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
              >
                + Add HR Contact Details
              </button>
            </div>
          )}
        </div>

        {/* Assignment Metadata */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <span>Assignment Metadata</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-500">Assigned To</span>
              <span className="font-bold text-slate-900">You (Active Owner)</span>
            </div>
            {currentAssignment?.assignedAt && (
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Assigned On</span>
                <span className="font-medium text-slate-700">
                  {new Date(currentAssignment.assignedAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {currentAssignment?.reason && (
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">PMO Instruction</span>
                <span className="font-medium text-slate-700">{currentAssignment.reason}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Organization</span>
              <span className="font-semibold text-slate-800">{company.organizationId?.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* My Outreach History Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <span>My Outreach Call History ({interactions.length})</span>
          </h2>
          <button
            onClick={() => setIsCallModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Log New Call</span>
          </button>
        </div>

        {interactions.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400 space-y-2">
            <PhoneCall className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">No Outreach Calls Recorded Yet</p>
            <p>Click "Call HR / Record Outreach" above to log your first recruiter conversation.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Conducted By</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4">HR Conversation Notes</th>
                  <th className="py-3 px-4">Next Action</th>
                  <th className="py-3 px-4">Follow-up Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {interactions.map((item) => (
                  <tr key={item.id || item._id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                      {new Date(item.interactionDate || item.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {item.userId?.name || 'Team Member'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">{getOutcomeBadge(item.callDetails?.hiringStatus || item.outcome)}</td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="line-clamp-2 text-slate-800">{item.notes || item.callDetails?.hrResponse || 'No notes entered'}</p>
                      {item.callDetails?.profiles?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.callDetails.profiles.map((p, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded font-mono">
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                      {item.nextAction}
                    </td>
                    <td className="py-3.5 px-4 font-mono whitespace-nowrap text-slate-700">
                      {item.followUpDate ? new Date(item.followUpDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedInteraction(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded font-semibold transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Feedback</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Complete Feedback Detail Modal */}
      {selectedInteraction && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Complete HR Call Feedback Details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Company: {company.companyName} &bull; Logged on{' '}
                  {new Date(selectedInteraction.interactionDate || selectedInteraction.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedInteraction(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded hover:bg-slate-200 transition-colors"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div className="text-slate-400 font-medium text-[11px]">Company</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{company.companyName}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium text-[11px]">Hiring Status</div>
                  <div className="mt-1">
                    {getOutcomeBadge(selectedInteraction.callDetails?.hiringStatus || selectedInteraction.outcome)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium text-[11px]">Conducted By</div>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {selectedInteraction.userId?.name || 'Team Member'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium text-[11px]">Date & Time</div>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {new Date(selectedInteraction.interactionDate || selectedInteraction.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Requirements & Profiles */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                <h4 className="font-bold text-slate-800 text-xs text-indigo-700">Hiring Requirements & Profiles</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Openings:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {selectedInteraction.callDetails?.openings ?? 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Candidate Type:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.callDetails?.candidateType || 'BOTH'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Opportunity Type:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.callDetails?.opportunityType || 'FULL_TIME'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">PPO Availability:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedInteraction.callDetails?.ppoAvailable || 'NOT_SURE'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] mb-1">Target Job Roles / Profiles:</span>
                  {selectedInteraction.callDetails?.profiles && selectedInteraction.callDetails.profiles.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedInteraction.callDetails.profiles.map((role, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-xs font-medium"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">No specific profiles recorded</span>
                  )}
                </div>
              </div>

              {/* Discussion Summary */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">HR Conversation Summary & Notes</label>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {selectedInteraction.notes ||
                    selectedInteraction.callDetails?.hrResponse ||
                    'No detailed notes provided.'}
                </div>
              </div>

              {selectedInteraction.callDetails?.specificRequirement && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Specific Candidate Requirements</label>
                  <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {selectedInteraction.callDetails.specificRequirement}
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end border-t border-slate-100">
                <button
                  onClick={() => setSelectedInteraction(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold cursor-pointer transition-colors"
                >
                  Close Feedback Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Call Modal */}
      <QuickCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        onSuccess={loadData}
        company={company}
        primaryContact={primaryContact}
      />
    </div>
  );
}
