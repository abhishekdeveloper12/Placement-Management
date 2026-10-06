import mongoose from 'mongoose';
import JobOpportunity from '../models/JobOpportunity.js';
import Company from '../models/Company.js';
import Assignment from '../models/Assignment.js';
import Document from '../models/Document.js';
import User from '../models/User.js';
import auditService from './audit.service.js';
import notificationService from './notification.service.js';
import storageService from './storage.service.js';
import interactionService from './interaction.service.js';
import { escapeRegex } from '../utils/tenant.js';

class OpportunityService {
  /**
   * Create a new job opportunity
   */
  async createOpportunity(user, payload) {
    const {
      companyId,
      title,
      opportunityType,
      candidateType,
      openings,
      location,
      workMode,
      salary,
      stipend,
      bond,
      specialRequirement,
      hiringStatus,
      source,
      interactionId,
    } = payload;

    const organizationId = user.organizationId;

    // 1. Verify Company exists within tenant
    const company = await Company.findOne({ _id: companyId, organizationId });
    if (!company) {
      const error = new Error('Company not found or does not belong to your organization');
      error.statusCode = 404;
      error.code = 'COMPANY_NOT_FOUND';
      throw error;
    }

    // 2. TEAM_MEMBER security: verify active assignment
    if (user.role === 'TEAM_MEMBER') {
      const activeAssignment = await Assignment.findOne({
        organizationId,
        companyId,
        assignedTo: user.id,
        status: 'ACTIVE',
      });

      if (!activeAssignment) {
        const error = new Error('Company not found or not assigned to you');
        error.statusCode = 404;
        error.code = 'COMPANY_NOT_FOUND';
        throw error;
      }
    }

    // 3. Instantiate and save JobOpportunity
    const opportunity = new JobOpportunity({
      organizationId,
      companyId,
      title,
      opportunityType,
      candidateType,
      openings: openings || '',
      location: location || '',
      workMode: workMode || '',
      salary: salary || '',
      stipend: stipend || '',
      bond: bond || '',
      specialRequirement: specialRequirement || '',
      hiringStatus: hiringStatus || 'HIRING_NOW',
      source: source || 'MANUAL',
      interactionId: interactionId || null,
      createdBy: user.id,
    });

    await opportunity.save();

    // 4. Audit Log
    await auditService.logAction({
      organizationId,
      performedBy: user.id,
      action: 'OPPORTUNITY_CREATED',
      entityType: 'JobOpportunity',
      entityId: opportunity._id,
      newValue: opportunity,
      metadata: {
        title: opportunity.title,
        companyId: company._id,
        companyName: company.name,
        opportunityType: opportunity.opportunityType,
        hiringStatus: opportunity.hiringStatus,
      },
    });

    return this.getOpportunityById(user, opportunity._id);
  }

  /**
   * Get list of opportunities with filtering and pagination
   */
  async getOpportunities(user, params = {}) {
    const {
      companyId,
      hiringStatus,
      opportunityType,
      candidateType,
      location,
      workMode,
      createdBy,
      jobRoleId,
      organizationId: filterOrgId,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    // Sync any hiring call interactions to ensure real-time pipeline accuracy
    if (user.role !== 'SUPER_ADMIN' && user.organizationId) {
      await interactionService.syncHiringInteractionsToOpportunities(user.organizationId);
    } else if (filterOrgId) {
      await interactionService.syncHiringInteractionsToOpportunities(filterOrgId);
    }

    const query = {};

    // Tenant Scope Enforcement
    if (user.role === 'SUPER_ADMIN') {
      if (filterOrgId) {
        query.organizationId = filterOrgId;
      }
    } else {
      query.organizationId = user.organizationId;
    }

    // Role-specific scoping
    if (user.role === 'TEAM_MEMBER') {
      const activeAssignments = await Assignment.find({
        organizationId: user.organizationId,
        assignedTo: user.id,
        status: 'ACTIVE',
      }).select('companyId');

      const assignedCompanyIds = activeAssignments.map((a) => a.companyId);
      query.companyId = { $in: assignedCompanyIds };
    }

    // Filter parameters
    if (companyId) {
      if (user.role === 'TEAM_MEMBER') {
        // Ensure companyId is among assigned companies
        query.companyId = companyId;
      } else {
        query.companyId = companyId;
      }
    }

    if (hiringStatus) {
      query.hiringStatus = hiringStatus;
    }

    if (opportunityType) {
      query.opportunityType = opportunityType;
    }

    if (candidateType) {
      query.candidateType = candidateType;
    }

    if (workMode) {
      query.workMode = workMode;
    }

    if (createdBy) {
      query.createdBy = createdBy;
    }

    if (jobRoleId && jobRoleId !== 'ALL') {
      if (mongoose.Types.ObjectId.isValid(jobRoleId)) {
        query.jobRoleIds = new mongoose.Types.ObjectId(jobRoleId);
      } else {
        query.title = { $regex: escapeRegex(jobRoleId.trim()), $options: 'i' };
      }
    }

    if (location && location.trim() !== '') {
      query.location = { $regex: escapeRegex(location.trim()), $options: 'i' };
    }

    if (params.shortlisted !== undefined && params.shortlisted !== '') {
      query.isShortlisted = params.shortlisted === 'true' || params.shortlisted === true;
    }

    if (search && search.trim() !== '') {
      const escapedSearch = escapeRegex(search.trim());
      const matchingCompanies = await Company.find({
        companyName: { $regex: escapedSearch, $options: 'i' },
        ...(user.role !== 'SUPER_ADMIN' ? { organizationId: user.organizationId } : {}),
      }).select('_id');

      const matchingCompanyIds = matchingCompanies.map((c) => c._id);

      query.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { location: { $regex: escapedSearch, $options: 'i' } },
        { salary: { $regex: escapedSearch, $options: 'i' } },
        { companyId: { $in: matchingCompanyIds } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const validSortFields = ['createdAt', 'title', 'hiringStatus', 'opportunityType', 'isShortlisted', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      JobOpportunity.find(query)
        .populate('companyId', 'name companyName website industry city')
        .populate('createdBy', 'name email')
        .populate('shortlistedBy', 'name email')
        .populate('jdDocumentId', 'originalFileName mimeType fileSize createdAt')
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      JobOpportunity.countDocuments(query),
    ]);

    return {
      data: items.map((item) => item.toJSON()),
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Get single opportunity by ID with security checks
   */
  async getOpportunityById(user, opportunityId) {
    if (!mongoose.Types.ObjectId.isValid(opportunityId)) {
      const error = new Error('Job opportunity not found');
      error.statusCode = 404;
      error.code = 'OPPORTUNITY_NOT_FOUND';
      throw error;
    }

    const query = { _id: opportunityId };
    if (user.role !== 'SUPER_ADMIN') {
      query.organizationId = user.organizationId;
    }

    const opportunity = await JobOpportunity.findOne(query)
      .populate('companyId', 'name companyName website industry city address phone')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('shortlistedBy', 'name email')
      .populate('jdDocumentId', 'originalFileName mimeType fileSize createdAt storageKey');

    if (!opportunity) {
      const error = new Error('Job opportunity not found');
      error.statusCode = 404;
      error.code = 'OPPORTUNITY_NOT_FOUND';
      throw error;
    }

    // TEAM_MEMBER resource hiding
    if (user.role === 'TEAM_MEMBER') {
      const companyId = opportunity.companyId?._id || opportunity.companyId;
      const activeAssignment = await Assignment.findOne({
        organizationId: user.organizationId,
        companyId,
        assignedTo: user.id,
        status: 'ACTIVE',
      });

      if (!activeAssignment) {
        const error = new Error('Job opportunity not found');
        error.statusCode = 404;
        error.code = 'OPPORTUNITY_NOT_FOUND';
        throw error;
      }
    }

    return opportunity.toJSON();
  }

  /**
   * Shortlist or unshortlist an opportunity (PMO & Super Admin only)
   */
  async shortlistOpportunity(user, opportunityId, payload = {}) {
    // 1. Role enforcement
    if (user.role === 'TEAM_MEMBER') {
      const error = new Error('Only PMO and authorized administrators can shortlist opportunities');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    // 2. Load & verify tenant isolation
    const query = { _id: opportunityId };
    if (user.role !== 'SUPER_ADMIN') {
      query.organizationId = user.organizationId;
    }

    const opportunity = await JobOpportunity.findOne(query);
    if (!opportunity) {
      const error = new Error('Job opportunity not found');
      error.statusCode = 404;
      error.code = 'OPPORTUNITY_NOT_FOUND';
      throw error;
    }

    const { isShortlisted, pmoReviewNote } = payload;
    const targetState = isShortlisted !== undefined ? Boolean(isShortlisted) : opportunity.isShortlisted;
    const stateChanged = opportunity.isShortlisted !== targetState;
    const noteChanged = pmoReviewNote !== undefined && opportunity.pmoReviewNote !== pmoReviewNote;

    // Idempotency: If state and note are unchanged, return current document safely
    if (!stateChanged && !noteChanged) {
      return this.getOpportunityById(user, opportunityId);
    }

    // Updates
    if (stateChanged) {
      opportunity.isShortlisted = targetState;
      opportunity.shortlistedAt = targetState ? new Date() : null;
      opportunity.shortlistedBy = targetState ? user.id : null;
    }

    if (pmoReviewNote !== undefined) {
      opportunity.pmoReviewNote = pmoReviewNote;
    }

    opportunity.updatedBy = user.id;
    await opportunity.save();

    // Audit Logging
    if (stateChanged) {
      await auditService.logAction({
        organizationId: opportunity.organizationId,
        performedBy: user.id,
        action: targetState ? 'OPPORTUNITY_SHORTLISTED' : 'OPPORTUNITY_UNSHORTLISTED',
        entityType: 'JobOpportunity',
        entityId: opportunity._id,
        oldValue: { isShortlisted: !targetState },
        newValue: { isShortlisted: targetState },
        metadata: {
          title: opportunity.title,
          isShortlisted: targetState,
          pmoReviewNote: opportunity.pmoReviewNote,
        },
      });
    } else if (noteChanged) {
      await auditService.logAction({
        organizationId: opportunity.organizationId,
        performedBy: user.id,
        action: 'PMO_REVIEW_NOTE_UPDATED',
        entityType: 'JobOpportunity',
        entityId: opportunity._id,
        oldValue: { pmoReviewNote: previousNote },
        newValue: { pmoReviewNote: opportunity.pmoReviewNote },
        metadata: {
          title: opportunity.title,
          pmoReviewNote: opportunity.pmoReviewNote,
        },
      });
    }

    return this.getOpportunityById(user, opportunityId);
  }

  /**
   * Update opportunity details
   */
  async updateOpportunity(user, opportunityId, payload) {
    // 1. Verify access
    const existing = await this.getOpportunityById(user, opportunityId);

    const allowedUpdates = [
      'title',
      'opportunityType',
      'candidateType',
      'openings',
      'location',
      'workMode',
      'salary',
      'stipend',
      'bond',
      'specialRequirement',
      'hiringStatus',
      'source',
    ];

    const updates = {};
    for (const key of allowedUpdates) {
      if (payload[key] !== undefined) {
        updates[key] = payload[key];
      }
    }

    updates.updatedBy = user.id;

    const updated = await JobOpportunity.findByIdAndUpdate(opportunityId, { $set: updates }, { new: true })
      .populate('companyId', 'name companyName website industry city')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('jdDocumentId', 'originalFileName mimeType fileSize createdAt');

    // Audit log
    const isStatusChanged = existing.hiringStatus !== updated.hiringStatus;
    await auditService.logAction({
      organizationId: updated.organizationId,
      performedBy: user.id,
      action: isStatusChanged ? 'OPPORTUNITY_STATUS_CHANGED' : 'OPPORTUNITY_UPDATED',
      entityType: 'JobOpportunity',
      entityId: updated._id,
      oldValue: { hiringStatus: existing.hiringStatus },
      newValue: { hiringStatus: updated.hiringStatus },
      metadata: {
        previousStatus: existing.hiringStatus,
        newStatus: updated.hiringStatus,
        title: updated.title,
        updatedFields: Object.keys(updates),
      },
    });

    return updated.toJSON();
  }

  /**
   * Upload or replace JD document for an opportunity
   */
  async uploadOrReplaceJD(user, opportunityId, file) {
    if (!file) {
      const error = new Error('No file provided for upload');
      error.statusCode = 400;
      error.code = 'FILE_REQUIRED';
      throw error;
    }

    // 1. Verify access to opportunity
    const opportunity = await JobOpportunity.findById(opportunityId);
    if (!opportunity) {
      const error = new Error('Job opportunity not found');
      error.statusCode = 404;
      error.code = 'OPPORTUNITY_NOT_FOUND';
      throw error;
    }

    // Security check
    if (user.role !== 'SUPER_ADMIN' && opportunity.organizationId.toString() !== user.organizationId.toString()) {
      const error = new Error('Job opportunity not found');
      error.statusCode = 404;
      error.code = 'OPPORTUNITY_NOT_FOUND';
      throw error;
    }

    if (user.role === 'TEAM_MEMBER') {
      const activeAssignment = await Assignment.findOne({
        organizationId: user.organizationId,
        companyId: opportunity.companyId,
        assignedTo: user.id,
        status: 'ACTIVE',
      });
      if (!activeAssignment) {
        const error = new Error('Job opportunity not found');
        error.statusCode = 404;
        error.code = 'OPPORTUNITY_NOT_FOUND';
        throw error;
      }
    }

    // 2. Save file via StorageService
    const storageResult = await storageService.saveFile({
      buffer: file.buffer,
      originalname: file.originalname,
      organizationId: opportunity.organizationId,
    });

    // 3. Create Document record
    const isReplacement = Boolean(opportunity.jdDocumentId);
    const doc = new Document({
      organizationId: opportunity.organizationId,
      companyId: opportunity.companyId,
      opportunityId: opportunity._id,
      uploadedBy: user.id,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      storageKey: storageResult.storageKey,
      storageProvider: storageResult.storageProvider,
      documentType: 'JOB_DESCRIPTION',
    });

    await doc.save();

    // 4. Update JobOpportunity reference
    opportunity.jdDocumentId = doc._id;
    opportunity.updatedBy = user.id;
    await opportunity.save();

    // 5. Audit Log
    await auditService.logAction({
      organizationId: opportunity.organizationId,
      performedBy: user.id,
      action: isReplacement ? 'JD_REPLACED' : 'JD_UPLOADED',
      entityType: 'Document',
      entityId: doc._id,
      newValue: { originalFileName: doc.originalFileName, fileSize: doc.fileSize },
      metadata: {
        opportunityId: opportunity._id,
        opportunityTitle: opportunity.title,
        originalFileName: doc.originalFileName,
        fileSize: doc.fileSize,
      },
    });

    // 6. In-App Notification Trigger (Notify PMO)
    const pmoUser = await User.findOne({
      organizationId: opportunity.organizationId,
      role: 'PMO',
      status: 'ACTIVE',
    });

    if (pmoUser && pmoUser._id.toString() !== user.id.toString()) {
      await notificationService.createNotification({
        organizationId: opportunity.organizationId,
        recipientId: pmoUser._id,
        type: 'JD_RECEIVED',
        title: 'JD Document Uploaded',
        message: `New JD document "${doc.originalFileName}" was uploaded for "${opportunity.title}".`,
        entity: 'Document',
        entityId: doc._id,
        metadata: {
          opportunityTitle: opportunity.title,
          originalFileName: doc.originalFileName,
        },
        deduplicationKey: `JD_RECEIVED_${doc._id}_${pmoUser._id}`,
      });
    }

    return this.getOpportunityById(user, opportunity._id);
  }

  /**
   * Delete / remove JD document from an opportunity
   */
  async deleteJD(user, opportunityId) {
    const opportunity = await JobOpportunity.findById(opportunityId);
    if (!opportunity) {
      const error = new Error('Job opportunity not found');
      error.statusCode = 404;
      error.code = 'OPPORTUNITY_NOT_FOUND';
      throw error;
    }

    if (user.role !== 'SUPER_ADMIN' && opportunity.organizationId.toString() !== user.organizationId.toString()) {
      const error = new Error('Job opportunity not found');
      error.statusCode = 404;
      error.code = 'OPPORTUNITY_NOT_FOUND';
      throw error;
    }

    if (!opportunity.jdDocumentId) {
      const error = new Error('No JD document attached to this opportunity');
      error.statusCode = 404;
      error.code = 'JD_NOT_FOUND';
      throw error;
    }

    const docId = opportunity.jdDocumentId;
    opportunity.jdDocumentId = null;
    opportunity.updatedBy = user.id;
    await opportunity.save();

    await auditService.logAction({
      organizationId: opportunity.organizationId,
      performedBy: user.id,
      action: 'JD_DELETED',
      entityType: 'Document',
      entityId: docId,
      oldValue: { jdDocumentId: docId },
      metadata: {
        opportunityId: opportunity._id,
        opportunityTitle: opportunity.title,
      },
    });

    return this.getOpportunityById(user, opportunity._id);
  }

  /**
   * Get secure JD file metadata and path for download/viewing
   */
  async getJDFileForDownload(user, opportunityId) {
    const opp = await this.getOpportunityById(user, opportunityId);
    if (!opp.jdDocumentId) {
      const error = new Error('No JD document found for this opportunity');
      error.statusCode = 404;
      error.code = 'JD_NOT_FOUND';
      throw error;
    }

    const docId = opp.jdDocumentId.id || opp.jdDocumentId;
    const document = await Document.findById(docId);
    if (!document) {
      const error = new Error('JD document record not found');
      error.statusCode = 404;
      error.code = 'JD_NOT_FOUND';
      throw error;
    }

    const filePath = storageService.getFilePath(document.storageKey);

    return {
      document,
      filePath,
    };
  }

  /**
   * Delete or close job opportunity
   */
  async deleteOpportunity(user, opportunityId) {
    const opportunity = await JobOpportunity.findById(opportunityId);
    if (!opportunity) {
      const error = new Error('Job opportunity not found');
      error.statusCode = 404;
      error.code = 'OPPORTUNITY_NOT_FOUND';
      throw error;
    }

    if (user.role !== 'SUPER_ADMIN' && opportunity.organizationId.toString() !== user.organizationId.toString()) {
      const error = new Error('Job opportunity not found');
      error.statusCode = 404;
      error.code = 'OPPORTUNITY_NOT_FOUND';
      throw error;
    }

    opportunity.hiringStatus = 'CLOSED';
    opportunity.updatedBy = user.id;
    await opportunity.save();

    await auditService.logAction({
      organizationId: opportunity.organizationId,
      performedBy: user.id,
      action: 'OPPORTUNITY_CLOSED',
      entityType: 'JobOpportunity',
      entityId: opportunity._id,
      oldValue: { hiringStatus: 'OPEN' },
      newValue: { hiringStatus: 'CLOSED' },
      metadata: {
        title: opportunity.title,
      },
    });

    return opportunity.toJSON();
  }

  /**
   * Shortlist, unshortlist, or update PMO review note for an opportunity (PMO & SUPER_ADMIN only)
   */
  async shortlistOpportunity(user, opportunityId, { isShortlisted, pmoReviewNote }) {
    if (user.role === 'TEAM_MEMBER') {
      const error = new Error('Team Members are not authorized to shortlist opportunities');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    const opportunity = await JobOpportunity.findById(opportunityId);
    if (!opportunity) {
      const error = new Error('Job opportunity not found');
      error.statusCode = 404;
      error.code = 'OPPORTUNITY_NOT_FOUND';
      throw error;
    }

    if (user.role !== 'SUPER_ADMIN' && opportunity.organizationId.toString() !== user.organizationId.toString()) {
      const error = new Error('Job opportunity not found');
      error.statusCode = 404;
      error.code = 'OPPORTUNITY_NOT_FOUND';
      throw error;
    }

    const previousShortlisted = opportunity.isShortlisted;
    const previousNote = opportunity.pmoReviewNote;

    let stateChanged = false;
    let noteChanged = false;

    if (typeof isShortlisted === 'boolean' && isShortlisted !== previousShortlisted) {
      opportunity.isShortlisted = isShortlisted;
      stateChanged = true;
      if (isShortlisted) {
        opportunity.shortlistedAt = new Date();
        opportunity.shortlistedBy = user.id;
      } else {
        opportunity.shortlistedAt = null;
        opportunity.shortlistedBy = null;
      }
    }

    if (typeof pmoReviewNote !== 'undefined' && pmoReviewNote !== previousNote) {
      opportunity.pmoReviewNote = pmoReviewNote;
      noteChanged = true;
    }

    if (!stateChanged && !noteChanged) {
      return this.getOpportunityById(user, opportunity._id);
    }

    opportunity.updatedBy = user.id;
    await opportunity.save();

    if (stateChanged) {
      await auditService.logAction({
        organizationId: opportunity.organizationId,
        performedBy: user.id,
        action: opportunity.isShortlisted ? 'OPPORTUNITY_SHORTLISTED' : 'OPPORTUNITY_UNSHORTLISTED',
        entityType: 'JobOpportunity',
        entityId: opportunity._id,
        oldValue: { isShortlisted: previousShortlisted },
        newValue: { isShortlisted: opportunity.isShortlisted },
        metadata: {
          title: opportunity.title,
          isShortlisted: opportunity.isShortlisted,
          pmoReviewNote: opportunity.pmoReviewNote,
        },
      });

      // Notification Trigger for Opportunity Creator
      if (opportunity.isShortlisted && opportunity.createdBy) {
        const creatorId = opportunity.createdBy.toString();
        if (creatorId !== user.id.toString()) {
          await notificationService.createNotification({
            organizationId: opportunity.organizationId,
            recipientId: opportunity.createdBy,
            type: 'OPPORTUNITY_SHORTLISTED',
            title: 'Opportunity Shortlisted',
            message: `Your captured job opportunity "${opportunity.title}" has been shortlisted by PMO.`,
            entity: 'JobOpportunity',
            entityId: opportunity._id,
            metadata: {
              title: opportunity.title,
              shortlistedAt: opportunity.shortlistedAt,
            },
            deduplicationKey: `OPPORTUNITY_SHORTLISTED_${opportunity._id}_${creatorId}`,
          });
        }
      }
    } else if (noteChanged) {
      await auditService.logAction({
        organizationId: opportunity.organizationId,
        performedBy: user.id,
        action: 'PMO_REVIEW_NOTE_UPDATED',
        entityType: 'JobOpportunity',
        entityId: opportunity._id,
        oldValue: { pmoReviewNote: previousNote },
        newValue: { pmoReviewNote: opportunity.pmoReviewNote },
        metadata: {
          title: opportunity.title,
          pmoReviewNote: opportunity.pmoReviewNote,
        },
      });
    }

    return this.getOpportunityById(user, opportunity._id);
  }
}

export const opportunityService = new OpportunityService();
export default opportunityService;
