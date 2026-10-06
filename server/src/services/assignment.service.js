import mongoose from 'mongoose';
import Assignment from '../models/Assignment.js';
import Company from '../models/Company.js';
import Contact from '../models/Contact.js';
import User from '../models/User.js';
import Interaction from '../models/Interaction.js';
import FollowUp from '../models/FollowUp.js';
import auditService from './audit.service.js';
import notificationService from './notification.service.js';

class AssignmentService {
  /**
   * Validate that target team member belongs to org and is active
   */
  async validateTeamMember(targetOrgId, teamMemberId) {
    if (!mongoose.Types.ObjectId.isValid(teamMemberId)) {
      const error = new Error('Invalid Team Member ID format');
      error.statusCode = 400;
      error.code = 'INVALID_TEAM_MEMBER_ID';
      throw error;
    }

    const member = await User.findOne({
      _id: teamMemberId,
      organizationId: targetOrgId,
      role: 'TEAM_MEMBER',
    });

    if (!member) {
      const error = new Error('Team Member not found in your organization');
      error.statusCode = 404;
      error.code = 'TEAM_MEMBER_NOT_FOUND';
      throw error;
    }

    if (member.status !== 'ACTIVE') {
      const error = new Error('Cannot assign companies to an inactive Team Member');
      error.statusCode = 400;
      error.code = 'TEAM_MEMBER_INACTIVE';
      throw error;
    }

    return member;
  }

  /**
   * Assign or reassign a single company to a Team Member
   */
  async assignCompany(userContext, { companyId, assignedTo, reason = '' }) {
    if (userContext.role !== 'PMO') {
      const error = new Error('Only PMO can assign companies');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    const orgId = userContext.organizationId;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      const error = new Error('Invalid company ID format');
      error.statusCode = 400;
      error.code = 'INVALID_COMPANY_ID';
      throw error;
    }

    const company = await Company.findOne({ _id: companyId, organizationId: orgId });
    if (!company) {
      const error = new Error('Company not found');
      error.statusCode = 404;
      error.code = 'COMPANY_NOT_FOUND';
      throw error;
    }

    const teamMember = await this.validateTeamMember(orgId, assignedTo);

    // Check existing active assignment
    const activeAssignment = await Assignment.findOne({
      organizationId: orgId,
      companyId: company._id,
      status: 'ACTIVE',
    });

    let previousAssigneeId = null;
    let isReassignment = false;

    if (activeAssignment) {
      if (activeAssignment.assignedTo.toString() === teamMember._id.toString()) {
        // Already assigned to this user
        return {
          alreadyAssigned: true,
          message: `Company "${company.companyName}" is already assigned to ${teamMember.name}`,
          assignment: activeAssignment.toJSON(),
        };
      }

      // Reassignment: End previous assignment
      previousAssigneeId = activeAssignment.assignedTo;
      isReassignment = true;
      activeAssignment.status = 'ENDED';
      activeAssignment.unassignedAt = new Date();
      if (reason) activeAssignment.reason = reason.trim();
      await activeAssignment.save();
    }

    // Create new active assignment
    const newAssignment = await Assignment.create({
      organizationId: orgId,
      companyId: company._id,
      assignedTo: teamMember._id,
      assignedBy: userContext.id,
      assignedAt: new Date(),
      status: 'ACTIVE',
      reason: reason ? reason.trim() : '',
    });

    // Audit Logging
    await auditService.logAction({
      organizationId: orgId,
      performedBy: userContext.id,
      action: isReassignment ? 'COMPANY_REASSIGNED' : 'COMPANY_ASSIGNED',
      entityType: 'Assignment',
      entityId: newAssignment._id,
      metadata: {
        companyId: company._id,
        companyName: company.companyName,
        previousAssignee: previousAssigneeId,
        newAssignee: teamMember._id,
        newAssigneeName: teamMember.name,
        reason: reason ? reason.trim() : '',
      },
    });

    // In-App Notification Trigger
    await notificationService.createNotification({
      organizationId: orgId,
      recipientId: teamMember._id,
      type: isReassignment ? 'COMPANY_REASSIGNED' : 'COMPANY_ASSIGNED',
      title: isReassignment ? 'Company Reassigned' : 'Company Assigned',
      message: `Company "${company.companyName}" has been ${isReassignment ? 'reassigned' : 'assigned'} to you for outreach.`,
      entity: 'Company',
      entityId: company._id,
      metadata: {
        companyName: company.companyName,
        companyId: company._id,
      },
      deduplicationKey: `COMPANY_ASSIGNED_${company._id}_${teamMember._id}_${Date.now()}`,
    });

    const populated = await Assignment.findById(newAssignment._id)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .populate('companyId', 'companyName industry city');

    return populated.toJSON();
  }

  /**
   * Bulk assign multiple companies to a target Team Member
   */
  async assignBulkCompanies(userContext, { companyIds = [], assignedTo, reason = '' }) {
    if (userContext.role !== 'PMO') {
      const error = new Error('Only PMO can perform bulk company assignments');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    const orgId = userContext.organizationId;

    if (!Array.isArray(companyIds) || companyIds.length === 0) {
      const error = new Error('Please select at least one company for assignment');
      error.statusCode = 400;
      error.code = 'NO_COMPANIES_SELECTED';
      throw error;
    }

    const teamMember = await this.validateTeamMember(orgId, assignedTo);

    let assignedCount = 0;
    let reassignedCount = 0;
    let alreadyAssignedCount = 0;
    let failedCount = 0;
    const failures = [];

    for (const idStr of companyIds) {
      if (!mongoose.Types.ObjectId.isValid(idStr)) {
        failedCount++;
        failures.push({ companyId: idStr, companyName: 'Invalid ID', reason: 'Invalid company ID format' });
        continue;
      }

      const company = await Company.findOne({ _id: idStr, organizationId: orgId });
      if (!company) {
        failedCount++;
        failures.push({ companyId: idStr, companyName: 'N/A', reason: 'Company not found or invalid tenant' });
        continue;
      }

      try {
        const activeAssignment = await Assignment.findOne({
          organizationId: orgId,
          companyId: company._id,
          status: 'ACTIVE',
        });

        if (activeAssignment) {
          if (activeAssignment.assignedTo.toString() === teamMember._id.toString()) {
            alreadyAssignedCount++;
            continue;
          }

          // Close existing active assignment
          activeAssignment.status = 'ENDED';
          activeAssignment.unassignedAt = new Date();
          if (reason) activeAssignment.reason = reason.trim();
          await activeAssignment.save();
          reassignedCount++;
        } else {
          assignedCount++;
        }

        // Create new active assignment
        await Assignment.create({
          organizationId: orgId,
          companyId: company._id,
          assignedTo: teamMember._id,
          assignedBy: userContext.id,
          assignedAt: new Date(),
          status: 'ACTIVE',
          reason: reason ? reason.trim() : '',
        });
      } catch (err) {
        failedCount++;
        failures.push({ companyId: idStr, companyName: company.companyName, reason: err.message || 'Database error' });
      }
    }

    // Audit Logging for Bulk Assignment
    await auditService.logAction({
      organizationId: orgId,
      performedBy: userContext.id,
      action: 'COMPANY_BULK_ASSIGNED',
      entityType: 'Assignment',
      metadata: {
        totalSelected: companyIds.length,
        assignedCount,
        reassignedCount,
        alreadyAssignedCount,
        failedCount,
        targetTeamMemberId: teamMember._id,
        targetTeamMemberName: teamMember.name,
      },
    });

    return {
      totalSelected: companyIds.length,
      assigned: assignedCount,
      reassigned: reassignedCount,
      alreadyAssigned: alreadyAssignedCount,
      failed: failedCount,
      failures,
    };
  }

  /**
   * Unassign a company (ends active assignment without creating a new one)
   */
  async unassignCompany(userContext, companyId, { reason = '' } = {}) {
    if (userContext.role !== 'PMO') {
      const error = new Error('Only PMO can unassign companies');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    const orgId = userContext.organizationId;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      const error = new Error('Invalid company ID format');
      error.statusCode = 400;
      error.code = 'INVALID_COMPANY_ID';
      throw error;
    }

    const company = await Company.findOne({ _id: companyId, organizationId: orgId });
    if (!company) {
      const error = new Error('Company not found');
      error.statusCode = 404;
      error.code = 'COMPANY_NOT_FOUND';
      throw error;
    }

    const activeAssignment = await Assignment.findOne({
      organizationId: orgId,
      companyId: company._id,
      status: 'ACTIVE',
    }).populate('assignedTo', 'name email');

    if (!activeAssignment) {
      const error = new Error('Company is not currently assigned to any team member');
      error.statusCode = 400;
      error.code = 'COMPANY_NOT_ASSIGNED';
      throw error;
    }

    const previousAssignee = activeAssignment.assignedTo;

    activeAssignment.status = 'ENDED';
    activeAssignment.unassignedAt = new Date();
    if (reason) activeAssignment.reason = reason.trim();
    await activeAssignment.save();

    // Audit Logging
    await auditService.logAction({
      organizationId: orgId,
      performedBy: userContext.id,
      action: 'COMPANY_UNASSIGNED',
      entityType: 'Assignment',
      entityId: activeAssignment._id,
      metadata: {
        companyId: company._id,
        companyName: company.companyName,
        previousAssigneeId: previousAssignee ? previousAssignee._id : null,
        previousAssigneeName: previousAssignee ? previousAssignee.name : '',
        reason: reason ? reason.trim() : '',
      },
    });

    return activeAssignment.toJSON();
  }

  /**
   * Retrieve chronological assignment history for a company
   */
  async getCompanyAssignmentHistory(userContext, companyId) {
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      const error = new Error('Invalid company ID format');
      error.statusCode = 400;
      error.code = 'INVALID_COMPANY_ID';
      throw error;
    }

    // Verify company exists and check tenant access
    const companyFilter = { _id: companyId };
    if (userContext.role === 'PMO') {
      companyFilter.organizationId = userContext.organizationId;
    } else if (userContext.role === 'TEAM_MEMBER') {
      companyFilter.organizationId = userContext.organizationId;
      // Team Member can only view history if currently assigned to this company
      const activeAssign = await Assignment.findOne({
        organizationId: userContext.organizationId,
        companyId,
        assignedTo: userContext.id,
        status: 'ACTIVE',
      });
      if (!activeAssign) {
        const error = new Error('Company not found');
        error.statusCode = 404;
        error.code = 'COMPANY_NOT_FOUND';
        throw error;
      }
    } else if (userContext.role !== 'SUPER_ADMIN') {
      const error = new Error('Company not found');
      error.statusCode = 404;
      error.code = 'COMPANY_NOT_FOUND';
      throw error;
    }

    const company = await Company.findOne(companyFilter);
    if (!company) {
      const error = new Error('Company not found');
      error.statusCode = 404;
      error.code = 'COMPANY_NOT_FOUND';
      throw error;
    }

    const assignments = await Assignment.find({ companyId: company._id })
      .populate('assignedTo', 'name email phone status')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });

    return assignments.map((a) => a.toJSON());
  }

  /**
   * TEAM_MEMBER API: Retrieve only companies currently assigned to the authenticated Team Member,
   * supporting outreachStatus tabs (TO_CONTACT, CONTACTED, FOLLOW_UP_DUE, ALL) and live counts.
   */
  async getTeamMemberAssignedCompanies(
    userContext,
    {
      page = 1,
      limit = 20,
      search = '',
      industry = '',
      city = '',
      outreachStatus = 'TO_CONTACT',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = {}
  ) {
    if (userContext.role !== 'TEAM_MEMBER') {
      const error = new Error('Only operational Team Members can access assigned company workplace');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    const orgId = userContext.organizationId;
    const userId = userContext.id || userContext._id;

    // 1. Strict query: find active assignments for THIS user only
    const activeAssignments = await Assignment.find({
      organizationId: orgId,
      assignedTo: userId,
      status: 'ACTIVE',
    }).lean();

    const allAssignedCompanyIds = activeAssignments.map((a) => a.companyId);

    if (allAssignedCompanyIds.length === 0) {
      return {
        data: [],
        meta: {
          page: 1,
          limit: parseInt(limit, 10) || 20,
          total: 0,
          totalPages: 0,
          counts: { all: 0, toContact: 0, contacted: 0, followUpDue: 0 },
        },
      };
    }

    // 2. Determine Contacted & Follow-Up Due Company IDs
    const contactedCompanyIdsRaw = await Interaction.distinct('companyId', {
      organizationId: orgId,
      userId,
      companyId: { $in: allAssignedCompanyIds },
    });

    const contactedCompanyIdSet = new Set(contactedCompanyIdsRaw.map((id) => id.toString()));

    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const followUpDueCompanyIdsRaw = await FollowUp.distinct('companyId', {
      organizationId: orgId,
      assignedTo: userId,
      status: 'PENDING',
      dueDate: { $lte: endOfDay },
      companyId: { $in: allAssignedCompanyIds },
    });

    const followUpDueCompanyIdSet = new Set(followUpDueCompanyIdsRaw.map((id) => id.toString()));

    // 3. Live Tab Counts Calculation
    const totalAll = allAssignedCompanyIds.length;
    const totalContacted = allAssignedCompanyIds.filter((id) => contactedCompanyIdSet.has(id.toString())).length;
    const totalFollowUpDue = allAssignedCompanyIds.filter((id) => followUpDueCompanyIdSet.has(id.toString())).length;
    const totalToContact = Math.max(0, totalAll - totalContacted);

    // 4. Apply Outreach Status Filter to target company IDs
    let targetCompanyIds = allAssignedCompanyIds;
    const cleanOutreachStatus = (outreachStatus || 'TO_CONTACT').toUpperCase();

    if (cleanOutreachStatus === 'TO_CONTACT') {
      targetCompanyIds = allAssignedCompanyIds.filter((id) => !contactedCompanyIdSet.has(id.toString()));
    } else if (cleanOutreachStatus === 'CONTACTED') {
      targetCompanyIds = allAssignedCompanyIds.filter((id) => contactedCompanyIdSet.has(id.toString()));
    } else if (cleanOutreachStatus === 'FOLLOW_UP_DUE') {
      targetCompanyIds = allAssignedCompanyIds.filter((id) => followUpDueCompanyIdSet.has(id.toString()));
    }

    if (targetCompanyIds.length === 0) {
      return {
        data: [],
        meta: {
          page: 1,
          limit: parseInt(limit, 10) || 20,
          total: 0,
          totalPages: 0,
          counts: {
            all: totalAll,
            toContact: totalToContact,
            contacted: totalContacted,
            followUpDue: totalFollowUpDue,
          },
        },
      };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {
      _id: { $in: targetCompanyIds },
      organizationId: orgId,
      status: 'ACTIVE',
    };

    if (industry && industry.trim() !== '') {
      filter.industry = new RegExp(`^${industry.trim()}$`, 'i');
    }

    if (city && city.trim() !== '') {
      filter.city = new RegExp(city.trim(), 'i');
    }

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { companyName: searchRegex },
        { industry: searchRegex },
        { city: searchRegex },
        { location: searchRegex },
      ];
    }

    const sortOptions = {};
    const validSortFields = ['createdAt', 'companyName', 'industry', 'city'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

    const [companies, total] = await Promise.all([
      Company.find(filter)
        .populate('organizationId', 'name code')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Company.countDocuments(filter),
    ]);

    // Attach primary contact, latest interaction metadata, and outreach status
    const fetchedCompanyIds = companies.map((c) => c._id);
    const primaryContacts = await Contact.find({
      companyId: { $in: fetchedCompanyIds },
      isPrimary: true,
    });

    const contactMap = {};
    primaryContacts.forEach((contact) => {
      contactMap[contact.companyId.toString()] = contact.toJSON();
    });

    // Fetch latest interaction for each fetched company
    const latestInteractions = await Interaction.aggregate([
      {
        $match: {
          organizationId: new mongoose.Types.ObjectId(orgId),
          userId: new mongoose.Types.ObjectId(userId),
          companyId: { $in: fetchedCompanyIds },
        },
      },
      { $sort: { interactionDate: -1 } },
      {
        $group: {
          _id: '$companyId',
          lastContactedAt: { $first: '$interactionDate' },
          lastOutcome: { $first: '$outcome' },
          totalInteractions: { $sum: 1 },
          lastCallDetails: { $first: '$callDetails' },
        },
      },
    ]);

    const interactionSummaryMap = {};
    latestInteractions.forEach((item) => {
      interactionSummaryMap[item._id.toString()] = item;
    });

    // Fetch next pending follow-up for fetched companies
    const pendingFollowUps = await FollowUp.find({
      organizationId: orgId,
      assignedTo: userId,
      companyId: { $in: fetchedCompanyIds },
      status: 'PENDING',
    }).sort({ dueDate: 1 });

    const followUpMap = {};
    pendingFollowUps.forEach((fu) => {
      if (!followUpMap[fu.companyId.toString()]) {
        followUpMap[fu.companyId.toString()] = fu.toJSON();
      }
    });

    const data = companies.map((comp) => {
      const json = comp.toJSON();
      const compIdStr = comp._id.toString();

      let companyOutreachStatus = 'TO_CONTACT';
      if (followUpDueCompanyIdSet.has(compIdStr)) {
        companyOutreachStatus = 'FOLLOW_UP_DUE';
      } else if (contactedCompanyIdSet.has(compIdStr)) {
        companyOutreachStatus = 'CONTACTED';
      }

      const summary = interactionSummaryMap[compIdStr] || null;

      json.primaryContact = contactMap[compIdStr] || null;
      json.outreachStatus = companyOutreachStatus;
      json.lastContactedAt = summary ? summary.lastContactedAt : null;
      json.lastOutcome = summary ? summary.lastCallDetails?.hiringStatus || summary.lastOutcome : null;
      json.totalInteractions = summary ? summary.totalInteractions : 0;
      json.nextFollowUp = followUpMap[compIdStr] || null;

      json.currentAssignment = {
        assignedTo: {
          id: userContext.id || userContext._id,
          name: userContext.name || userContext.fullName || '',
          email: userContext.email || '',
        },
      };
      return json;
    });

    return {
      data,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
        counts: {
          all: totalAll,
          toContact: totalToContact,
          contacted: totalContacted,
          followUpDue: totalFollowUpDue,
        },
      },
    };
  }

  /**
   * Validate that target team member belongs to org and is active
   */
  async validateTeamMember(targetOrgId, teamMemberId) {
    if (!mongoose.Types.ObjectId.isValid(teamMemberId)) {
      const error = new Error('Invalid Team Member ID format');
      error.statusCode = 400;
      error.code = 'INVALID_TEAM_MEMBER_ID';
      throw error;
    }

    const member = await User.findOne({
      _id: teamMemberId,
      organizationId: targetOrgId,
      role: 'TEAM_MEMBER',
    });

    if (!member) {
      const error = new Error('Team Member not found in your organization');
      error.statusCode = 404;
      error.code = 'TEAM_MEMBER_NOT_FOUND';
      throw error;
    }

    if (member.status !== 'ACTIVE') {
      const error = new Error('Cannot assign companies to an inactive Team Member');
      error.statusCode = 400;
      error.code = 'TEAM_MEMBER_INACTIVE';
      throw error;
    }

    return member;
  }

  /**
   * Assign or reassign a single company to a Team Member
   */
  async assignCompany(userContext, { companyId, assignedTo, reason = '' }) {
    if (userContext.role !== 'PMO') {
      const error = new Error('Only PMO can assign companies');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    const orgId = userContext.organizationId;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      const error = new Error('Invalid company ID format');
      error.statusCode = 400;
      error.code = 'INVALID_COMPANY_ID';
      throw error;
    }

    const company = await Company.findOne({ _id: companyId, organizationId: orgId });
    if (!company) {
      const error = new Error('Company not found');
      error.statusCode = 404;
      error.code = 'COMPANY_NOT_FOUND';
      throw error;
    }

    const teamMember = await this.validateTeamMember(orgId, assignedTo);

    // Check existing active assignment
    const activeAssignment = await Assignment.findOne({
      organizationId: orgId,
      companyId: company._id,
      status: 'ACTIVE',
    });

    let previousAssigneeId = null;
    let isReassignment = false;

    if (activeAssignment) {
      if (activeAssignment.assignedTo.toString() === teamMember._id.toString()) {
        // Already assigned to this user
        return {
          alreadyAssigned: true,
          message: `Company "${company.companyName}" is already assigned to ${teamMember.name}`,
          assignment: activeAssignment.toJSON(),
        };
      }

      // Reassignment: End previous assignment
      previousAssigneeId = activeAssignment.assignedTo;
      isReassignment = true;
      activeAssignment.status = 'ENDED';
      activeAssignment.unassignedAt = new Date();
      if (reason) activeAssignment.reason = reason.trim();
      await activeAssignment.save();
    }

    // Create new active assignment
    const newAssignment = await Assignment.create({
      organizationId: orgId,
      companyId: company._id,
      assignedTo: teamMember._id,
      assignedBy: userContext.id,
      assignedAt: new Date(),
      status: 'ACTIVE',
      reason: reason ? reason.trim() : '',
    });

    // Audit Logging
    await auditService.logAction({
      organizationId: orgId,
      performedBy: userContext.id,
      action: isReassignment ? 'COMPANY_REASSIGNED' : 'COMPANY_ASSIGNED',
      entityType: 'Assignment',
      entityId: newAssignment._id,
      metadata: {
        companyId: company._id,
        companyName: company.companyName,
        previousAssignee: previousAssigneeId,
        newAssignee: teamMember._id,
        newAssigneeName: teamMember.name,
        reason: reason ? reason.trim() : '',
      },
    });

    // In-App Notification Trigger
    await notificationService.createNotification({
      organizationId: orgId,
      recipientId: teamMember._id,
      type: isReassignment ? 'COMPANY_REASSIGNED' : 'COMPANY_ASSIGNED',
      title: isReassignment ? 'Company Reassigned' : 'Company Assigned',
      message: `Company "${company.companyName}" has been ${isReassignment ? 'reassigned' : 'assigned'} to you for outreach.`,
      entity: 'Company',
      entityId: company._id,
      metadata: {
        companyName: company.companyName,
        companyId: company._id,
      },
      deduplicationKey: `COMPANY_ASSIGNED_${company._id}_${teamMember._id}_${Date.now()}`,
    });

    const populated = await Assignment.findById(newAssignment._id)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .populate('companyId', 'companyName industry city');

    return populated.toJSON();
  }

  /**
   * Bulk assign multiple companies to a target Team Member
   */
  async assignBulkCompanies(userContext, { companyIds = [], assignedTo, reason = '' }) {
    if (userContext.role !== 'PMO') {
      const error = new Error('Only PMO can perform bulk company assignments');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    const orgId = userContext.organizationId;

    if (!Array.isArray(companyIds) || companyIds.length === 0) {
      const error = new Error('Please select at least one company for assignment');
      error.statusCode = 400;
      error.code = 'NO_COMPANIES_SELECTED';
      throw error;
    }

    const teamMember = await this.validateTeamMember(orgId, assignedTo);

    let assignedCount = 0;
    let reassignedCount = 0;
    let alreadyAssignedCount = 0;
    let failedCount = 0;
    const failures = [];

    for (const idStr of companyIds) {
      if (!mongoose.Types.ObjectId.isValid(idStr)) {
        failedCount++;
        failures.push({ companyId: idStr, companyName: 'Invalid ID', reason: 'Invalid company ID format' });
        continue;
      }

      const company = await Company.findOne({ _id: idStr, organizationId: orgId });
      if (!company) {
        failedCount++;
        failures.push({ companyId: idStr, companyName: 'N/A', reason: 'Company not found or invalid tenant' });
        continue;
      }

      try {
        const activeAssignment = await Assignment.findOne({
          organizationId: orgId,
          companyId: company._id,
          status: 'ACTIVE',
        });

        if (activeAssignment) {
          if (activeAssignment.assignedTo.toString() === teamMember._id.toString()) {
            alreadyAssignedCount++;
            continue;
          }

          // Close existing active assignment
          activeAssignment.status = 'ENDED';
          activeAssignment.unassignedAt = new Date();
          if (reason) activeAssignment.reason = reason.trim();
          await activeAssignment.save();
          reassignedCount++;
        } else {
          assignedCount++;
        }

        // Create new active assignment
        await Assignment.create({
          organizationId: orgId,
          companyId: company._id,
          assignedTo: teamMember._id,
          assignedBy: userContext.id,
          assignedAt: new Date(),
          status: 'ACTIVE',
          reason: reason ? reason.trim() : '',
        });
      } catch (err) {
        failedCount++;
        failures.push({ companyId: idStr, companyName: company.companyName, reason: err.message || 'Database error' });
      }
    }

    // Audit Logging for Bulk Assignment
    await auditService.logAction({
      organizationId: orgId,
      performedBy: userContext.id,
      action: 'COMPANY_BULK_ASSIGNED',
      entityType: 'Assignment',
      metadata: {
        totalSelected: companyIds.length,
        assignedCount,
        reassignedCount,
        alreadyAssignedCount,
        failedCount,
        targetTeamMemberId: teamMember._id,
        targetTeamMemberName: teamMember.name,
      },
    });

    return {
      totalSelected: companyIds.length,
      assigned: assignedCount,
      reassigned: reassignedCount,
      alreadyAssigned: alreadyAssignedCount,
      failed: failedCount,
      failures,
    };
  }

  /**
   * Unassign a company (ends active assignment without creating a new one)
   */
  async unassignCompany(userContext, companyId, { reason = '' } = {}) {
    if (userContext.role !== 'PMO') {
      const error = new Error('Only PMO can unassign companies');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    const orgId = userContext.organizationId;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      const error = new Error('Invalid company ID format');
      error.statusCode = 400;
      error.code = 'INVALID_COMPANY_ID';
      throw error;
    }

    const company = await Company.findOne({ _id: companyId, organizationId: orgId });
    if (!company) {
      const error = new Error('Company not found');
      error.statusCode = 404;
      error.code = 'COMPANY_NOT_FOUND';
      throw error;
    }

    const activeAssignment = await Assignment.findOne({
      organizationId: orgId,
      companyId: company._id,
      status: 'ACTIVE',
    }).populate('assignedTo', 'name email');

    if (!activeAssignment) {
      const error = new Error('Company is not currently assigned to any team member');
      error.statusCode = 400;
      error.code = 'COMPANY_NOT_ASSIGNED';
      throw error;
    }

    const previousAssignee = activeAssignment.assignedTo;

    activeAssignment.status = 'ENDED';
    activeAssignment.unassignedAt = new Date();
    if (reason) activeAssignment.reason = reason.trim();
    await activeAssignment.save();

    // Audit Logging
    await auditService.logAction({
      organizationId: orgId,
      performedBy: userContext.id,
      action: 'COMPANY_UNASSIGNED',
      entityType: 'Assignment',
      entityId: activeAssignment._id,
      metadata: {
        companyId: company._id,
        companyName: company.companyName,
        previousAssigneeId: previousAssignee ? previousAssignee._id : null,
        previousAssigneeName: previousAssignee ? previousAssignee.name : '',
        reason: reason ? reason.trim() : '',
      },
    });

    return activeAssignment.toJSON();
  }

  /**
   * Retrieve chronological assignment history for a company
   */
  async getCompanyAssignmentHistory(userContext, companyId) {
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      const error = new Error('Invalid company ID format');
      error.statusCode = 400;
      error.code = 'INVALID_COMPANY_ID';
      throw error;
    }

    // Verify company exists and check tenant access
    const companyFilter = { _id: companyId };
    if (userContext.role === 'PMO') {
      companyFilter.organizationId = userContext.organizationId;
    } else if (userContext.role === 'TEAM_MEMBER') {
      companyFilter.organizationId = userContext.organizationId;
      // Team Member can only view history if currently assigned to this company
      const activeAssign = await Assignment.findOne({
        organizationId: userContext.organizationId,
        companyId,
        assignedTo: userContext.id,
        status: 'ACTIVE',
      });
      if (!activeAssign) {
        const error = new Error('Company not found');
        error.statusCode = 404;
        error.code = 'COMPANY_NOT_FOUND';
        throw error;
      }
    } else if (userContext.role !== 'SUPER_ADMIN') {
      const error = new Error('Company not found');
      error.statusCode = 404;
      error.code = 'COMPANY_NOT_FOUND';
      throw error;
    }

    const company = await Company.findOne(companyFilter);
    if (!company) {
      const error = new Error('Company not found');
      error.statusCode = 404;
      error.code = 'COMPANY_NOT_FOUND';
      throw error;
    }

    const assignments = await Assignment.find({ companyId: company._id })
      .populate('assignedTo', 'name email phone status')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });

    return assignments.map((a) => a.toJSON());
  }

  /**
   * TEAM_MEMBER API: Retrieve single assigned company details by ID
   */
  async getTeamMemberAssignedCompanyById(userContext, companyId) {
    if (userContext.role !== 'TEAM_MEMBER') {
      const error = new Error('Only operational Team Members can access assigned company details');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      const error = new Error('Invalid company ID format');
      error.statusCode = 400;
      error.code = 'INVALID_COMPANY_ID';
      throw error;
    }

    // Security check: must have active assignment for THIS user
    const activeAssignment = await Assignment.findOne({
      organizationId: userContext.organizationId,
      companyId,
      assignedTo: userContext.id,
      status: 'ACTIVE',
    });

    if (!activeAssignment) {
      // Resource Hiding: return 404 to prevent resource scanning
      const error = new Error('Company not found');
      error.statusCode = 404;
      error.code = 'COMPANY_NOT_FOUND';
      throw error;
    }

    const company = await Company.findOne({
      _id: companyId,
      organizationId: userContext.organizationId,
    }).populate('organizationId', 'name code email phone address');

    if (!company) {
      const error = new Error('Company not found');
      error.statusCode = 404;
      error.code = 'COMPANY_NOT_FOUND';
      throw error;
    }

    const contacts = await Contact.find({ companyId: company._id });

    const result = company.toJSON();
    result.contacts = contacts.map((c) => c.toJSON());
    result.primaryContact = contacts.find((c) => c.isPrimary)?.toJSON() || null;
    result.currentAssignment = activeAssignment.toJSON();

    return result;
  }
}

export const assignmentService = new AssignmentService();
export default assignmentService;
