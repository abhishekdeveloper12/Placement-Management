import mongoose from 'mongoose';
import Interaction from '../models/Interaction.js';
import FollowUp from '../models/FollowUp.js';
import Company from '../models/Company.js';
import Contact from '../models/Contact.js';
import Assignment from '../models/Assignment.js';
import JobRole from '../models/JobRole.js';
import JobOpportunity from '../models/JobOpportunity.js';
import auditService from './audit.service.js';

class InteractionService {
  /**
   * Helper to verify active assignment for Team Member (Resource Hiding)
   */
  async verifyActiveAssignment(orgId, companyId, userId, role = 'TEAM_MEMBER') {
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      const error = new Error('Company not found');
      error.statusCode = 404;
      error.code = 'COMPANY_NOT_FOUND';
      throw error;
    }

    const company = await Company.findOne({ _id: companyId, organizationId: orgId });
    if (!company) {
      const error = new Error('Company not found');
      error.statusCode = 404;
      error.code = 'COMPANY_NOT_FOUND';
      throw error;
    }

    if (role === 'PMO' || role === 'SUPER_ADMIN') {
      return { company, activeAssignment: null };
    }

    const activeAssignment = await Assignment.findOne({
      organizationId: orgId,
      companyId: company._id,
      assignedTo: userId,
      status: 'ACTIVE',
    });

    if (!activeAssignment) {
      const error = new Error('Company not found or not assigned to you');
      error.statusCode = 404;
      error.code = 'COMPANY_NOT_FOUND';
      throw error;
    }

    return { company, activeAssignment };
  }

  /**
   * Record a Quick HR Outreach Phone Call
   */
  async recordCallInteraction(userContext, companyId, payload) {
    if (!['TEAM_MEMBER', 'PMO', 'SUPER_ADMIN'].includes(userContext.role)) {
      const error = new Error('Access denied to record call interactions');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    const orgId = userContext.organizationId;
    const userId = userContext.id || userContext._id;

    // Verify tenant boundary and active assignment
    const { company } = await this.verifyActiveAssignment(orgId, companyId, userId, userContext.role);

    const {
      hiringStatus = 'NOT_SURE',
      profiles = [],
      jobRoleIds = [],
      candidateType = 'BOTH',
      openings = null,
      opportunityType = 'FULL_TIME',
      ppoAvailable = 'NOT_SURE',
      location = '',
      workMode = 'NOT_SPECIFIED',
      salaryOrStipend = '',
      bond = 'NOT_SURE',
      specificRequirement = '',
      hrResponse = '',
      notes = '',
      nextAction = 'NO_ACTION',
      followUpDate = null,
      interactionDate = null,
      contact = null,
      outcome: customOutcome = null,
    } = payload;

    // Validation
    const validHiringStatuses = ['YES', 'NO', 'HIRING_PLANNED', 'NOT_SURE'];
    if (!validHiringStatuses.includes(hiringStatus)) {
      const error = new Error(`hiringStatus must be one of: ${validHiringStatuses.join(', ')}`);
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    const validNextActions = ['FOLLOW_UP', 'WAITING_FOR_JD', 'NO_ACTION', 'OTHER'];
    if (!validNextActions.includes(nextAction)) {
      const error = new Error(`nextAction must be one of: ${validNextActions.join(', ')}`);
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    // STRICT FOLLOW-UP VALIDATION: Required if nextAction === 'FOLLOW_UP'
    let parsedFollowUpDate = null;
    if (nextAction === 'FOLLOW_UP') {
      if (!followUpDate) {
        const error = new Error('Follow-up date is required when next action is FOLLOW_UP');
        error.statusCode = 400;
        error.code = 'FOLLOWUP_DATE_REQUIRED';
        throw error;
      }

      parsedFollowUpDate = new Date(followUpDate);
      if (isNaN(parsedFollowUpDate.getTime())) {
        const error = new Error('Invalid follow-up date format');
        error.statusCode = 400;
        error.code = 'INVALID_FOLLOWUP_DATE';
        throw error;
      }
    } else if (followUpDate) {
      const d = new Date(followUpDate);
      if (!isNaN(d.getTime())) {
        parsedFollowUpDate = d;
      }
    }

    if (openings !== null && openings !== undefined && openings !== '') {
      const numOpenings = Number(openings);
      if (isNaN(numOpenings) || numOpenings < 0) {
        const error = new Error('Approximate openings must be a non-negative number');
        error.statusCode = 400;
        error.code = 'VALIDATION_ERROR';
        throw error;
      }
    }

    // Determine Call Outcome
    let outcome = customOutcome;
    if (!outcome) {
      if (nextAction === 'WAITING_FOR_JD') {
        outcome = 'WAITING_FOR_JD';
      } else if (nextAction === 'FOLLOW_UP') {
        outcome = 'FOLLOW_UP_REQUIRED';
      } else if (hiringStatus === 'YES') {
        outcome = 'HIRING_NOW';
      } else if (hiringStatus === 'HIRING_PLANNED') {
        outcome = 'HIRING_PLANNED';
      } else if (hiringStatus === 'NO') {
        outcome = 'NOT_HIRING';
      } else {
        outcome = 'NOT_SURE';
      }
    }

    // Contact Processing (Update or Inline Create)
    let contactId = null;
    let contactDoc = null;

    if (contact && typeof contact === 'object') {
      if (contact.id && mongoose.Types.ObjectId.isValid(contact.id)) {
        contactDoc = await Contact.findOne({ _id: contact.id, companyId: company._id, organizationId: orgId });
      }

      if (!contactDoc) {
        contactDoc = await Contact.findOne({ companyId: company._id, organizationId: orgId, isPrimary: true });
      }

      const cleanName = (contact.name || '').trim();
      const cleanDesignation = (contact.designation || '').trim();
      const cleanEmail = (contact.email || '').trim().toLowerCase();
      const cleanPhone = (contact.phone || '').trim();
      const cleanLinkedin = (contact.linkedin || '').trim();

      if (contactDoc) {
        // Update existing contact
        let updated = false;
        if (cleanName && contactDoc.name !== cleanName) { contactDoc.name = cleanName; updated = true; }
        if (cleanDesignation && contactDoc.designation !== cleanDesignation) { contactDoc.designation = cleanDesignation; updated = true; }
        if (cleanEmail && contactDoc.email !== cleanEmail) { contactDoc.email = cleanEmail; updated = true; }
        if (cleanPhone && contactDoc.phone !== cleanPhone) { contactDoc.phone = cleanPhone; updated = true; }
        if (cleanLinkedin && contactDoc.linkedin !== cleanLinkedin) { contactDoc.linkedin = cleanLinkedin; updated = true; }

        if (updated) {
          await contactDoc.save();
          await auditService.logAction({
            organizationId: orgId,
            performedBy: userId,
            action: 'HR_CONTACT_UPDATED',
            entityType: 'Contact',
            entityId: contactDoc._id,
            metadata: { companyId: company._id, contactName: contactDoc.name },
          });
        }
        contactId = contactDoc._id;
      } else if (cleanName) {
        // Create new primary HR contact inline
        contactDoc = await Contact.create({
          organizationId: orgId,
          companyId: company._id,
          name: cleanName,
          designation: cleanDesignation,
          email: cleanEmail,
          phone: cleanPhone,
          linkedin: cleanLinkedin,
          isPrimary: true,
        });

        await auditService.logAction({
          organizationId: orgId,
          performedBy: userId,
          action: 'HR_CONTACT_CREATED',
          entityType: 'Contact',
          entityId: contactDoc._id,
          metadata: { companyId: company._id, contactName: contactDoc.name },
        });
        contactId = contactDoc._id;
      }
    }

    // Validate and process Job Roles if provided
    let verifiedJobRoleIds = [];
    let verifiedJobRoleSnapshots = [];
    let normalizedProfiles = [];

    if (Array.isArray(jobRoleIds) && jobRoleIds.length > 0) {
      const uniqueRoleIds = Array.from(new Set(jobRoleIds.map((id) => id.toString()).filter(Boolean)));
      if (uniqueRoleIds.length > 0) {
        const validRoles = await JobRole.find({
          _id: { $in: uniqueRoleIds.map((id) => new mongoose.Types.ObjectId(id)) },
          organizationId: orgId,
          status: 'ACTIVE',
        });

        if (validRoles.length !== uniqueRoleIds.length) {
          const error = new Error('One or more selected job roles are invalid, inactive, or belong to another organization');
          error.statusCode = 400;
          error.code = 'INVALID_JOB_ROLE';
          throw error;
        }

        verifiedJobRoleIds = validRoles.map((r) => r._id);
        verifiedJobRoleSnapshots = validRoles.map((r) => ({ roleId: r._id, name: r.name }));
        normalizedProfiles = validRoles.map((r) => r.name);
      }
    }

    if (normalizedProfiles.length === 0) {
      if (Array.isArray(profiles)) {
        normalizedProfiles = profiles.map((p) => String(p).trim()).filter(Boolean);
      } else if (typeof profiles === 'string' && profiles.trim()) {
        normalizedProfiles = profiles.split(',').map((p) => p.trim()).filter(Boolean);
      }
    }

    const combinedNotes = (hrResponse || notes || '').trim();

    // Create Interaction Document
    const interaction = await Interaction.create({
      organizationId: orgId,
      companyId: company._id,
      contactId,
      userId,
      interactionType: 'PHONE_CALL',
      outcome,
      notes: combinedNotes,
      interactionDate: interactionDate ? new Date(interactionDate) : new Date(),
      nextAction,
      followUpDate: parsedFollowUpDate,
      callDetails: {
        hiringStatus,
        profiles: normalizedProfiles,
        jobRoleIds: verifiedJobRoleIds,
        jobRoleSnapshots: verifiedJobRoleSnapshots,
        candidateType,
        openings: openings !== null && openings !== undefined && openings !== '' ? Number(openings) : null,
        opportunityType,
        ppoAvailable,
        location: location.trim(),
        workMode,
        salaryOrStipend: salaryOrStipend.trim(),
        bond,
        specificRequirement: specificRequirement.trim(),
        hrResponse: combinedNotes,
      },
    });

    await auditService.logAction({
      organizationId: orgId,
      performedBy: userId,
      action: 'INTERACTION_CREATED',
      entityType: 'Interaction',
      entityId: interaction._id,
      metadata: {
        companyId: company._id,
        companyName: company.companyName,
        interactionType: 'PHONE_CALL',
        outcome,
        nextAction,
      },
    });

    // Create FollowUp Document if nextAction === 'FOLLOW_UP'
    let followUpDoc = null;
    if (nextAction === 'FOLLOW_UP' && parsedFollowUpDate) {
      followUpDoc = await FollowUp.create({
        organizationId: orgId,
        companyId: company._id,
        assignedTo: userId,
        interactionId: interaction._id,
        dueDate: parsedFollowUpDate,
        reason: combinedNotes || 'Follow-up call scheduled',
        status: 'PENDING',
      });

      await auditService.logAction({
        organizationId: orgId,
        performedBy: userId,
        action: 'FOLLOW_UP_CREATED',
        entityType: 'FollowUp',
        entityId: followUpDoc._id,
        metadata: {
          companyId: company._id,
          companyName: company.companyName,
          dueDate: parsedFollowUpDate,
        },
      });
    }

    // Auto-create / Auto-update JobOpportunity for hiring outreach feedback
    const isHiringNow = hiringStatus === 'YES' || hiringStatus === 'HIRING_NOW' || outcome === 'HIRING_NOW';
    const isHiringPlanned = hiringStatus === 'HIRING_PLANNED' || outcome === 'HIRING_PLANNED';

    if (isHiringNow || isHiringPlanned) {
      const opHiringStatus = isHiringNow ? 'HIRING_NOW' : 'HIRING_PLANNED';
      const opportunityTitle =
        normalizedProfiles.length > 0
          ? normalizedProfiles.join(' / ')
          : 'General Hiring Opportunity';

      try {
        await JobOpportunity.findOneAndUpdate(
          { interactionId: interaction._id },
          {
            organizationId: orgId,
            companyId: company._id,
            title: opportunityTitle,
            jobRoleIds: verifiedJobRoleIds,
            opportunityType: opportunityType || 'FULL_TIME',
            candidateType: candidateType || 'BOTH',
            openings: openings !== null && openings !== undefined && openings !== '' ? String(openings) : '',
            location: (location || '').trim(),
            workMode: workMode === 'NOT_SPECIFIED' ? '' : workMode,
            salary: (salaryOrStipend || '').trim(),
            bond: bond === 'NOT_SURE' ? '' : bond,
            specialRequirement: (specificRequirement || '').trim(),
            hiringStatus: opHiringStatus,
            source: 'HR_CALL',
            interactionId: interaction._id,
            createdBy: userId,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (oppErr) {
        console.warn(`[RecordCallInteraction] Auto JobOpportunity creation warning: ${oppErr.message}`);
      }
    }

    // Populate for response payload
    const populated = await Interaction.findById(interaction._id)
      .populate('userId', 'name email')
      .populate('contactId', 'name designation email phone linkedin')
      .populate('companyId', 'companyName industry city');

    return {
      interaction: populated.toJSON(),
      followUp: followUpDoc ? followUpDoc.toJSON() : null,
      contact: contactDoc ? contactDoc.toJSON() : null,
    };
  }

  /**
   * Sync past HR call interactions with hiring outcomes into JobOpportunity collection
   *
   * @param {string} orgId - Organization ID
   */
  async syncHiringInteractionsToOpportunities(orgId) {
    if (!orgId) return;
    try {
      const hiringInteractions = await Interaction.find({
        organizationId: orgId,
        $or: [
          { outcome: { $in: ['HIRING_NOW', 'HIRING_PLANNED'] } },
          { 'callDetails.hiringStatus': { $in: ['YES', 'HIRING_NOW', 'HIRING_PLANNED'] } },
        ],
      }).lean();

      for (const inter of hiringInteractions) {
        const isHiringNow =
          inter.outcome === 'HIRING_NOW' ||
          inter.callDetails?.hiringStatus === 'YES' ||
          inter.callDetails?.hiringStatus === 'HIRING_NOW';
        const isHiringPlanned =
          inter.outcome === 'HIRING_PLANNED' || inter.callDetails?.hiringStatus === 'HIRING_PLANNED';

        const opHiringStatus = isHiringNow ? 'HIRING_NOW' : isHiringPlanned ? 'HIRING_PLANNED' : 'NOT_HIRING';
        if (opHiringStatus === 'NOT_HIRING') continue;

        const profiles =
          inter.callDetails?.jobRoleSnapshots?.map((r) => r.name) || inter.callDetails?.profiles || [];
        const title = profiles.length > 0 ? profiles.join(' / ') : 'General Hiring Opportunity';

        await JobOpportunity.findOneAndUpdate(
          { interactionId: inter._id },
          {
            organizationId: inter.organizationId,
            companyId: inter.companyId,
            title,
            jobRoleIds: inter.callDetails?.jobRoleIds || [],
            opportunityType: inter.callDetails?.opportunityType || 'FULL_TIME',
            candidateType: inter.callDetails?.candidateType || 'BOTH',
            openings: inter.callDetails?.openings ? String(inter.callDetails.openings) : '',
            location: inter.callDetails?.location || '',
            workMode: inter.callDetails?.workMode === 'NOT_SPECIFIED' ? '' : inter.callDetails?.workMode || '',
            salary: inter.callDetails?.salaryOrStipend || '',
            bond: inter.callDetails?.bond === 'NOT_SURE' ? '' : inter.callDetails?.bond || '',
            specialRequirement: inter.callDetails?.specificRequirement || '',
            hiringStatus: opHiringStatus,
            source: 'HR_CALL',
            interactionId: inter._id,
            createdBy: inter.userId,
          },
          { upsert: true, setDefaultsOnInsert: true }
        );
      }
    } catch (err) {
      console.warn(`[SyncHiringInteractions] Warning: ${err.message}`);
    }
  }

  /**
   * Retrieve real-time outreach statistics & KPI metrics for a Team Member
   */
  async getTeamMemberOutreachStats(userContext) {
    const orgId = userContext.organizationId;
    const userId = userContext.id;

    // 1. Assigned Companies Count
    const assignedCompanies = await Assignment.countDocuments({
      organizationId: orgId,
      assignedTo: userId,
      status: 'ACTIVE',
    });

    // 2. Contacted Companies Count (distinct companyId in Interaction)
    const contactedCompanyIds = await Interaction.distinct('companyId', {
      organizationId: orgId,
      userId,
    });
    const contactedCompanies = contactedCompanyIds.length;

    // 3. Total Calls & Feedback Records Submitted
    const totalCalls = await Interaction.countDocuments({
      organizationId: orgId,
      userId,
      interactionType: 'PHONE_CALL',
    });

    const feedbackSubmitted = await Interaction.countDocuments({
      organizationId: orgId,
      userId,
    });

    // 4. Follow-Up Metrics
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const followUpsDueToday = await FollowUp.countDocuments({
      organizationId: orgId,
      assignedTo: userId,
      status: 'PENDING',
      dueDate: { $gte: startOfDay, $lte: endOfDay },
    });

    const upcomingFollowUps = await FollowUp.countDocuments({
      organizationId: orgId,
      assignedTo: userId,
      status: 'PENDING',
      dueDate: { $gt: endOfDay },
    });

    const overdueFollowUps = await FollowUp.countDocuments({
      organizationId: orgId,
      assignedTo: userId,
      status: 'PENDING',
      dueDate: { $lt: startOfDay },
    });

    const coveragePercentage = assignedCompanies > 0
      ? Math.min(100, Math.round((contactedCompanies / assignedCompanies) * 100))
      : 0;

    return {
      assignedCompanies,
      contactedCompanies,
      uncontactedCompanies: Math.max(0, assignedCompanies - contactedCompanies),
      totalCalls,
      feedbackSubmitted,
      followUpsDueToday,
      upcomingFollowUps,
      overdueFollowUps,
      coveragePercentage,
    };
  }

  /**
   * Retrieve Team Member's own logged interactions across companies
   */
  async getTeamMemberInteractions(userContext, query = {}) {
    const orgId = userContext.organizationId;
    const userId = userContext.id;
    const {
      companyId,
      interactionType,
      outcome,
      hiringStatus,
      followUpStatus,
      fromDate,
      toDate,
      search = '',
      page = 1,
      limit = 20,
    } = query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filterObj = {
      organizationId: orgId,
      userId,
    };

    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      filterObj.companyId = companyId;
    }
    if (interactionType) {
      filterObj.interactionType = interactionType;
    }
    if (outcome) {
      filterObj.outcome = outcome;
    }
    if (hiringStatus) {
      filterObj['callDetails.hiringStatus'] = hiringStatus;
    }

    if (fromDate || toDate) {
      filterObj.interactionDate = {};
      if (fromDate) filterObj.interactionDate.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        filterObj.interactionDate.$lte = end;
      }
    }

    if (search && search.trim()) {
      const searchTerm = search.trim();
      const matchingCompanyIds = await Company.find({
        organizationId: orgId,
        companyName: { $regex: searchTerm, $options: 'i' },
      }).distinct('_id');

      const matchingContactIds = await Contact.find({
        organizationId: orgId,
        name: { $regex: searchTerm, $options: 'i' },
      }).distinct('_id');

      filterObj.$or = [
        { notes: { $regex: searchTerm, $options: 'i' } },
        { 'callDetails.specificRequirement': { $regex: searchTerm, $options: 'i' } },
        { 'callDetails.hrResponse': { $regex: searchTerm, $options: 'i' } },
        { companyId: { $in: matchingCompanyIds } },
        { contactId: { $in: matchingContactIds } },
      ];
    }

    const total = await Interaction.countDocuments(filterObj);
    const interactions = await Interaction.find(filterObj)
      .sort({ interactionDate: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'name email')
      .populate('contactId', 'name designation email phone linkedin')
      .populate('companyId', 'companyName industry city');

    const interactionIds = interactions.map((i) => i._id);
    const followUps = await FollowUp.find({ interactionId: { $in: interactionIds } }).lean();
    const followUpMap = new Map();
    followUps.forEach((f) => followUpMap.set(f.interactionId.toString(), f));

    const formattedData = interactions.map((i) => {
      const json = i.toJSON();
      const f = followUpMap.get(i._id.toString());
      if (f) {
        json.followUp = {
          id: f._id.toString(),
          dueDate: f.dueDate,
          reason: f.reason,
          status: f.status,
          completedAt: f.completedAt,
        };
      } else {
        json.followUp = null;
      }
      return json;
    });

    return {
      data: formattedData,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Retrieve single interaction details by ID
   */
  async getInteractionById(userContext, interactionId) {
    if (!mongoose.Types.ObjectId.isValid(interactionId)) {
      const error = new Error('Interaction log not found');
      error.statusCode = 404;
      error.code = 'INTERACTION_NOT_FOUND';
      throw error;
    }

    const filterObj = { _id: interactionId };
    if (userContext.role !== 'SUPER_ADMIN') {
      filterObj.organizationId = userContext.organizationId;
    }

    const interaction = await Interaction.findOne(filterObj)
      .populate('userId', 'name email')
      .populate('contactId', 'name designation email phone linkedin')
      .populate('companyId', 'companyName industry city website');

    if (!interaction) {
      const error = new Error('Interaction log not found');
      error.statusCode = 404;
      error.code = 'INTERACTION_NOT_FOUND';
      throw error;
    }

    // Additional check for TEAM_MEMBER: must be creator or currently assigned to company
    if (userContext.role === 'TEAM_MEMBER' && interaction.userId?.id !== userContext.id) {
      const activeAssign = await Assignment.findOne({
        organizationId: userContext.organizationId,
        companyId: interaction.companyId._id || interaction.companyId.id,
        assignedTo: userContext.id,
        status: 'ACTIVE',
      });

      if (!activeAssign) {
        const error = new Error('Interaction log not found');
        error.statusCode = 404;
        error.code = 'INTERACTION_NOT_FOUND';
        throw error;
      }
    }

    return interaction.toJSON();
  }

  /**
   * Retrieve company interactions timeline
   */
  async getCompanyInteractions(userContext, companyId, { page = 1, limit = 20 } = {}) {
    const orgId = userContext.organizationId;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    if (userContext.role === 'TEAM_MEMBER') {
      await this.verifyActiveAssignment(orgId, companyId, userContext.id);
    } else {
      const company = await Company.findOne({ _id: companyId, organizationId: orgId });
      if (!company) {
        const error = new Error('Company not found');
        error.statusCode = 404;
        error.code = 'COMPANY_NOT_FOUND';
        throw error;
      }
    }

    const filter = { organizationId: orgId, companyId };
    const total = await Interaction.countDocuments(filter);

    const interactions = await Interaction.find(filter)
      .sort({ interactionDate: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'name email')
      .populate('contactId', 'name designation email phone linkedin')
      .populate('companyId', 'companyName industry city');

    return {
      data: interactions.map((i) => i.toJSON()),
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Retrieve lightweight outreach summary card data for a company
   */
  async getCompanyOutreachSummary(userContext, companyId) {
    const orgId = userContext.organizationId;

    if (userContext.role === 'TEAM_MEMBER') {
      await this.verifyActiveAssignment(orgId, companyId, userContext.id);
    } else {
      const company = await Company.findOne({ _id: companyId, organizationId: orgId });
      if (!company) {
        const error = new Error('Company not found');
        error.statusCode = 404;
        error.code = 'COMPANY_NOT_FOUND';
        throw error;
      }
    }

    const latestInteraction = await Interaction.findOne({ organizationId: orgId, companyId })
      .sort({ interactionDate: -1 })
      .populate('userId', 'name email');

    const nextFollowUp = await FollowUp.findOne({
      organizationId: orgId,
      companyId,
      status: 'PENDING',
    }).sort({ dueDate: 1 });

    const totalInteractions = await Interaction.countDocuments({ organizationId: orgId, companyId });

    return {
      lastContactedAt: latestInteraction ? latestInteraction.interactionDate : null,
      lastOutcome: latestInteraction ? latestInteraction.outcome : null,
      lastConductedBy: latestInteraction && latestInteraction.userId ? latestInteraction.userId : null,
      totalInteractions,
      nextFollowUp: nextFollowUp ? nextFollowUp.toJSON() : null,
    };
  }

  /**
   * Retrieve organization-wide interactions for PMO / Super Admin
   */
  async getOrganizationInteractions(userContext, { companyId, userId, outcome, page = 1, limit = 20 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (userContext.role !== 'SUPER_ADMIN') {
      filter.organizationId = userContext.organizationId;
    }

    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      filter.companyId = companyId;
    }
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filter.userId = userId;
    }
    if (outcome) {
      filter.outcome = outcome;
    }

    const total = await Interaction.countDocuments(filter);
    const interactions = await Interaction.find(filter)
      .sort({ interactionDate: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'name email')
      .populate('contactId', 'name designation email phone linkedin')
      .populate('companyId', 'companyName industry city');

    return {
      data: interactions.map((i) => i.toJSON()),
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }
}

export default new InteractionService();
