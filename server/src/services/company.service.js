import mongoose from 'mongoose';
import Company, { normalizeCompanyName, normalizeWebsite } from '../models/Company.js';
import Contact from '../models/Contact.js';
import Organization from '../models/Organization.js';
import Assignment from '../models/Assignment.js';
import Interaction from '../models/Interaction.js';
import FollowUp from '../models/FollowUp.js';
import JobOpportunity from '../models/JobOpportunity.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import auditService from './audit.service.js';
import { escapeRegex } from '../utils/tenant.js';
import * as xlsx from 'xlsx';

class CompanyService {
  /**
   * Aggregate company statistics
   *
   * @param {Object} userContext - Authenticated user object (role, organizationId, id)
   * @returns {Promise<Object>}
   */
  async getCompanyStats(userContext) {
    if (userContext.role === 'PMO') {
      const orgId = userContext.organizationId;
      const now = new Date();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const [
        totalCompanies,
        activeCompanies,
        inactiveCompanies,
        totalAssigned,
        totalContacted,
        totalFollowUpDue,
      ] = await Promise.all([
        Company.countDocuments({ organizationId: orgId }),
        Company.countDocuments({ organizationId: orgId, status: 'ACTIVE' }),
        Company.countDocuments({ organizationId: orgId, status: 'INACTIVE' }),
        Assignment.distinct('companyId', { organizationId: orgId, status: 'ACTIVE' }).then((ids) => ids.length),
        Interaction.distinct('companyId', { organizationId: orgId }).then((ids) => ids.length),
        FollowUp.distinct('companyId', {
          organizationId: orgId,
          status: 'PENDING',
          dueDate: { $lte: endOfDay },
        }).then((ids) => ids.length),
      ]);

      return {
        totalCompanies,
        activeCompanies,
        inactiveCompanies,
        assignedCompanies: totalAssigned,
        unassignedCompanies: Math.max(0, totalCompanies - totalAssigned),
        contactedCompanies: totalContacted,
        toContactCompanies: Math.max(0, totalCompanies - totalContacted),
        followUpDueCompanies: totalFollowUpDue,
      };
    }

    if (userContext.role === 'SUPER_ADMIN') {
      const [totalCompanies, activeCompanies, inactiveCompanies, totalOrganizationsWithCompanies] =
        await Promise.all([
          Company.countDocuments(),
          Company.countDocuments({ status: 'ACTIVE' }),
          Company.countDocuments({ status: 'INACTIVE' }),
          Company.distinct('organizationId').then((orgs) => orgs.length),
        ]);
      return {
        totalCompanies,
        activeCompanies,
        inactiveCompanies,
        totalOrganizationsWithCompanies,
      };
    }

    const error = new Error('Access denied to company statistics');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  /**
   * Helper: Build standardized MongoDB filter for company queries & exports
   */
  async buildCompanyFilter(userContext, queryOptions = {}) {
    const {
      search = '',
      status = '',
      industry = '',
      city = '',
      organizationId = '',
      source = '',
      assignmentStatus = 'ALL',
      assignedTo = '',
      outreachStatus = 'ALL',
      hiringStatus = 'ALL',
    } = queryOptions;

    const filter = {};

    // Strict Tenant Isolation
    if (userContext.role === 'PMO') {
      filter.organizationId = userContext.organizationId;
    } else if (userContext.role === 'SUPER_ADMIN') {
      if (organizationId && mongoose.Types.ObjectId.isValid(organizationId)) {
        filter.organizationId = organizationId;
      }
    } else {
      filter._id = null;
      return filter;
    }

    // Source Filter (BULK_IMPORT, MANUAL_PMO, TEAM_MEMBER_SELF_ADDED, OTHER)
    if (source && source !== 'ALL') {
      filter.source = source.toUpperCase();
    }

    // Status Filter (ACTIVE, INACTIVE)
    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      filter.status = status.toUpperCase();
    }

    // Industry Filter
    if (industry && industry.trim() !== '') {
      filter.industry = new RegExp(`^${escapeRegex(industry.trim())}$`, 'i');
    }

    // City Filter
    if (city && city.trim() !== '') {
      filter.city = new RegExp(escapeRegex(city.trim()), 'i');
    }

    // Assignment Status & AssignedTo filtering
    const assignFilter = { status: 'ACTIVE' };
    if (filter.organizationId) {
      assignFilter.organizationId = filter.organizationId;
    }

    if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
      assignFilter.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }

    const activeAssignments = await Assignment.find(assignFilter);
    const activeCompanyIds = activeAssignments.map((a) => a.companyId.toString());

    if (assignmentStatus && assignmentStatus.toUpperCase() === 'ASSIGNED') {
      filter._id = { $in: activeCompanyIds.map((id) => new mongoose.Types.ObjectId(id)) };
    } else if (assignmentStatus && assignmentStatus.toUpperCase() === 'UNASSIGNED') {
      const allActiveAssigns = await Assignment.find({
        ...(filter.organizationId ? { organizationId: filter.organizationId } : {}),
        status: 'ACTIVE',
      });
      const allActiveIds = allActiveAssigns.map((a) => a.companyId.toString());
      filter._id = { $nin: allActiveIds.map((id) => new mongoose.Types.ObjectId(id)) };
    } else if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
      filter._id = { $in: activeCompanyIds.map((id) => new mongoose.Types.ObjectId(id)) };
    }

    // Outreach Status filtering (TO_CONTACT, CONTACTED, FOLLOW_UP_DUE)
    const cleanOutreach = (outreachStatus || 'ALL').toUpperCase();
    if (cleanOutreach !== 'ALL') {
      const orgIdMatch = filter.organizationId ? { organizationId: filter.organizationId } : {};

      if (cleanOutreach === 'CONTACTED') {
        const contactedCompanyIds = await Interaction.distinct('companyId', orgIdMatch);
        const contactedObjectIds = contactedCompanyIds.map((id) => new mongoose.Types.ObjectId(id));
        if (filter._id && filter._id.$in) {
          const existingStr = filter._id.$in.map((id) => id.toString());
          const intersected = contactedCompanyIds.map((id) => id.toString()).filter((id) => existingStr.includes(id));
          filter._id = { $in: intersected.map((id) => new mongoose.Types.ObjectId(id)) };
        } else {
          filter._id = { $in: contactedObjectIds };
        }
      } else if (cleanOutreach === 'TO_CONTACT') {
        const contactedCompanyIds = await Interaction.distinct('companyId', orgIdMatch);
        if (filter._id && filter._id.$in) {
          const existingStr = filter._id.$in.map((id) => id.toString());
          const contactedStr = contactedCompanyIds.map((id) => id.toString());
          const toContactStr = existingStr.filter((id) => !contactedStr.includes(id));
          filter._id = { $in: toContactStr.map((id) => new mongoose.Types.ObjectId(id)) };
        } else {
          const contactedObjectIds = contactedCompanyIds.map((id) => new mongoose.Types.ObjectId(id));
          filter._id = { $nin: contactedObjectIds };
        }
      } else if (cleanOutreach === 'FOLLOW_UP_DUE') {
        const now = new Date();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const followUpDueCompanyIds = await FollowUp.distinct('companyId', {
          ...orgIdMatch,
          status: 'PENDING',
          dueDate: { $lte: endOfDay },
        });
        const followUpDueObjectIds = followUpDueCompanyIds.map((id) => new mongoose.Types.ObjectId(id));
        if (filter._id && filter._id.$in) {
          const existingStr = filter._id.$in.map((id) => id.toString());
          const intersected = followUpDueCompanyIds.map((id) => id.toString()).filter((id) => existingStr.includes(id));
          filter._id = { $in: intersected.map((id) => new mongoose.Types.ObjectId(id)) };
        } else {
          filter._id = { $in: followUpDueObjectIds };
        }
      }
    }

    // Hiring Status filter (feedback-driven based on LATEST interaction per company)
    const cleanHiring = (hiringStatus || 'ALL').toUpperCase();
    if (cleanHiring !== 'ALL') {
      const orgIdMatch = filter.organizationId ? { organizationId: filter.organizationId } : {};

      // Find latest interaction per company
      const latestInteractionsPerCompany = await Interaction.aggregate([
        { $match: orgIdMatch },
        { $sort: { interactionDate: -1, createdAt: -1 } },
        {
          $group: {
            _id: '$companyId',
            latestOutcome: { $first: '$outcome' },
            latestHiringStatus: { $first: '$callDetails.hiringStatus' },
          },
        },
      ]);

      const matchingCompanyIds = latestInteractionsPerCompany
        .filter((item) => {
          if (cleanHiring === 'HIRING_NOW' || cleanHiring === 'YES') {
            return item.latestHiringStatus === 'YES' || item.latestOutcome === 'HIRING_NOW';
          }
          if (cleanHiring === 'HIRING_PLANNED') {
            return item.latestHiringStatus === 'HIRING_PLANNED' || item.latestOutcome === 'HIRING_PLANNED';
          }
          if (cleanHiring === 'NOT_HIRING' || cleanHiring === 'NO') {
            return item.latestHiringStatus === 'NO' || item.latestOutcome === 'NOT_HIRING';
          }
          return item.latestHiringStatus === cleanHiring || item.latestOutcome === cleanHiring;
        })
        .map((item) => item._id.toString());

      const hiringObjectIds = matchingCompanyIds.map((id) => new mongoose.Types.ObjectId(id));

      if (filter._id && filter._id.$in) {
        const existingStr = filter._id.$in.map((id) => id.toString());
        const intersected = matchingCompanyIds.filter((id) => existingStr.includes(id));
        filter._id = { $in: intersected.map((id) => new mongoose.Types.ObjectId(id)) };
      } else {
        filter._id = { $in: hiringObjectIds };
      }
    }

    // Job Role filter (matches interactions with specific job roles)
    const cleanJobRole = queryOptions.jobRoleId || queryOptions.jobRole;
    if (cleanJobRole && cleanJobRole !== 'ALL') {
      const orgIdMatch = filter.organizationId ? { organizationId: filter.organizationId } : {};

      let matchingCompanyIds = [];
      if (mongoose.Types.ObjectId.isValid(cleanJobRole)) {
        matchingCompanyIds = await Interaction.distinct('companyId', {
          ...orgIdMatch,
          $or: [
            { 'callDetails.jobRoleIds': new mongoose.Types.ObjectId(cleanJobRole) },
            { 'callDetails.jobRoleSnapshots.roleId': new mongoose.Types.ObjectId(cleanJobRole) },
          ],
        });
      } else {
        const roleRegex = new RegExp(escapeRegex(cleanJobRole.trim()), 'i');
        matchingCompanyIds = await Interaction.distinct('companyId', {
          ...orgIdMatch,
          $or: [
            { 'callDetails.profiles': roleRegex },
            { 'callDetails.jobRoleSnapshots.name': roleRegex },
          ],
        });
      }

      const jobRoleObjectIds = matchingCompanyIds.map((id) => new mongoose.Types.ObjectId(id));

      if (filter._id && filter._id.$in) {
        const existingStr = filter._id.$in.map((id) => id.toString());
        const intersected = matchingCompanyIds.map((id) => id.toString()).filter((id) => existingStr.includes(id));
        filter._id = { $in: intersected.map((id) => new mongoose.Types.ObjectId(id)) };
      } else {
        filter._id = { $in: jobRoleObjectIds };
      }
    }

    // Search substring filter across companyName, industry, city, location, remarks, and primary contact name/email
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      const matchingContactCompanyIds = await Contact.distinct('companyId', {
        $or: [{ name: searchRegex }, { email: searchRegex }],
      });

      const searchConditions = [
        { companyName: searchRegex },
        { industry: searchRegex },
        { city: searchRegex },
        { location: searchRegex },
        { remarks: searchRegex },
      ];

      if (matchingContactCompanyIds.length > 0) {
        searchConditions.push({
          _id: { $in: matchingContactCompanyIds.map((id) => new mongoose.Types.ObjectId(id)) },
        });
      }

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    return filter;
  }

  /**
   * List companies with pagination, search, filters, tenant scoping, and active assignment data
   *
   * @param {Object} userContext - Authenticated user object
   * @param {Object} queryOptions - Query parameters
   * @returns {Promise<{ data: Array, meta: Object }>}
   */
  async getCompanies(userContext, queryOptions = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryOptions;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = await this.buildCompanyFilter(userContext, queryOptions);

    const isFeedbackSort =
      (queryOptions.hiringStatus && queryOptions.hiringStatus.toUpperCase() !== 'ALL') ||
      sortBy === 'latestFeedbackDate' ||
      sortBy === 'lastContactedAt';

    const sortOptions = {};
    const validSortFields = ['createdAt', 'updatedAt', 'companyName', 'industry', 'city', 'status'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

    let companyQuery = Company.find(filter)
      .populate('organizationId', 'name code status')
      .populate('createdBy', 'name email');

    if (!isFeedbackSort) {
      companyQuery = companyQuery.sort(sortOptions).skip(skip).limit(limitNum);
    } else {
      companyQuery = companyQuery.sort({ createdAt: -1 });
    }

    const [companies, total] = await Promise.all([
      companyQuery,
      Company.countDocuments(filter),
    ]);

    const companyIds = companies.map((c) => c._id);
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [primaryContacts, companyAssignments, latestInteractionsAgg, pendingFollowUpsRaw] = await Promise.all([
      Contact.find({ companyId: { $in: companyIds }, isPrimary: true }),
      Assignment.find({ companyId: { $in: companyIds }, status: 'ACTIVE' })
        .populate('assignedTo', 'name email status')
        .populate('assignedBy', 'name email'),
      Interaction.aggregate([
        { $match: { companyId: { $in: companyIds } } },
        { $sort: { interactionDate: -1, createdAt: -1 } },
        {
          $group: {
            _id: '$companyId',
            latestInteractionId: { $first: '$_id' },
            lastContactedAt: { $first: '$interactionDate' },
            userId: { $first: '$userId' },
            outcome: { $first: '$outcome' },
            callDetails: { $first: '$callDetails' },
            notes: { $first: '$notes' },
            totalInteractions: { $sum: 1 },
          },
        },
      ]),
      FollowUp.find({
        companyId: { $in: companyIds },
        status: 'PENDING',
      }).sort({ dueDate: 1 }),
    ]);

    // Populate user object for latestInteractions
    const interactionUserIds = Array.from(
      new Set(latestInteractionsAgg.filter((item) => item.userId).map((item) => item.userId.toString()))
    );
    const interactionUsers = await User.find({ _id: { $in: interactionUserIds } }).select('name email');
    const userMap = {};
    interactionUsers.forEach((u) => {
      userMap[u._id.toString()] = { id: u._id.toString(), name: u.name, email: u.email };
    });

    const contactMap = {};
    primaryContacts.forEach((contact) => {
      contactMap[contact.companyId.toString()] = contact.toJSON();
    });

    const assignmentMap = {};
    companyAssignments.forEach((assign) => {
      assignmentMap[assign.companyId.toString()] = assign.toJSON();
    });

    const interactionMap = {};
    latestInteractionsAgg.forEach((item) => {
      const compIdStr = item._id.toString();
      item.user = userMap[item.userId?.toString()] || null;
      interactionMap[compIdStr] = item;
    });

    const followUpMap = {};
    pendingFollowUpsRaw.forEach((fu) => {
      const compIdStr = fu.companyId.toString();
      if (!followUpMap[compIdStr]) {
        followUpMap[compIdStr] = fu.toJSON();
      }
    });

    let data = companies.map((comp) => {
      const json = comp.toJSON();
      const compIdStr = comp._id.toString();

      json.primaryContact = contactMap[compIdStr] || null;
      json.currentAssignment = assignmentMap[compIdStr] || null;

      const inter = interactionMap[compIdStr] || null;
      const fu = followUpMap[compIdStr] || null;

      let derivedOutreachStatus = 'TO_CONTACT';
      if (fu && new Date(fu.dueDate) <= endOfDay) {
        derivedOutreachStatus = 'FOLLOW_UP_DUE';
      } else if (inter) {
        derivedOutreachStatus = 'CONTACTED';
      }

      json.outreachStatus = derivedOutreachStatus;
      json.lastContactedAt = inter ? inter.lastContactedAt : null;
      json.lastContactedBy = inter ? inter.user : null;
      json.lastOutcome = inter ? inter.callDetails?.hiringStatus || inter.outcome : null;
      json.totalInteractions = inter ? inter.totalInteractions : 0;
      json.latestInteraction = inter;
      json.nextFollowUp = fu;

      return json;
    });

    if (isFeedbackSort) {
      data.sort((a, b) => {
        const timeA = a.lastContactedAt ? new Date(a.lastContactedAt).getTime() : 0;
        const timeB = b.lastContactedAt ? new Date(b.lastContactedAt).getTime() : 0;
        return timeB - timeA; // Newest feedback date first
      });
      data = data.slice(skip, skip + limitNum);
    }

    // Compute organization-wide counts for PMO
    let counts = null;
    const targetOrgId = userContext.role === 'PMO' ? userContext.organizationId : filter.organizationId;
    if (targetOrgId) {
      const [totalOrgCompanies, totalOrgAssigned, contactedCompIds, followUpDueCompIds] = await Promise.all([
        Company.countDocuments({ organizationId: targetOrgId }),
        Assignment.distinct('companyId', { organizationId: targetOrgId, status: 'ACTIVE' }).then((ids) => ids.length),
        Interaction.distinct('companyId', { organizationId: targetOrgId }).then((ids) => ids.length),
        FollowUp.distinct('companyId', {
          organizationId: targetOrgId,
          status: 'PENDING',
          dueDate: { $lte: endOfDay },
        }).then((ids) => ids.length),
      ]);

      counts = {
        totalCompanies: totalOrgCompanies,
        assigned: totalOrgAssigned,
        unassigned: Math.max(0, totalOrgCompanies - totalOrgAssigned),
        contacted: contactedCompIds,
        toContact: Math.max(0, totalOrgCompanies - contactedCompIds),
        followUpDue: followUpDueCompIds,
      };
    }

    return {
      data,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
        counts,
      },
    };
  }

  /**
   * Export companies database to Excel (.xlsx) with Sheet 1 (Companies) and optional Sheet 2 (Outreach History)
   *
   * @param {Object} userContext
   * @param {Object} queryOptions
   * @returns {Promise<{ buffer: Buffer, filename: string }>}
   */
  async exportCompanies(userContext, queryOptions = {}) {
    const exportScope = (queryOptions.exportScope || 'FILTERED').toUpperCase();
    const includeHistory = queryOptions.includeHistory === 'true' || queryOptions.includeHistory === true;

    let filter = {};
    if (exportScope === 'ALL') {
      if (userContext.role === 'PMO') {
        filter.organizationId = userContext.organizationId;
      } else if (userContext.role === 'SUPER_ADMIN' && queryOptions.organizationId) {
        filter.organizationId = queryOptions.organizationId;
      }
    } else {
      filter = await this.buildCompanyFilter(userContext, queryOptions);
    }

    const sortOptions = {};
    const sortBy = queryOptions.sortBy || 'createdAt';
    const sortOrder = queryOptions.sortOrder === 'asc' ? 1 : -1;
    sortOptions[sortBy] = sortOrder;

    const companies = await Company.find(filter)
      .populate('organizationId', 'name code status')
      .populate('createdBy', 'name email')
      .sort(sortOptions)
      .lean();

    const companyIds = companies.map((c) => c._id);
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [primaryContacts, companyAssignments, latestInteractionsAgg, pendingFollowUpsRaw] = await Promise.all([
      Contact.find({ companyId: { $in: companyIds }, isPrimary: true }).lean(),
      Assignment.find({ companyId: { $in: companyIds }, status: 'ACTIVE' })
        .populate('assignedTo', 'name email')
        .populate('assignedBy', 'name email')
        .lean(),
      Interaction.aggregate([
        { $match: { companyId: { $in: companyIds } } },
        { $sort: { interactionDate: -1, createdAt: -1 } },
        {
          $group: {
            _id: '$companyId',
            latestInteractionId: { $first: '$_id' },
            lastContactedAt: { $first: '$interactionDate' },
            userId: { $first: '$userId' },
            outcome: { $first: '$outcome' },
            callDetails: { $first: '$callDetails' },
            notes: { $first: '$notes' },
            totalInteractions: { $sum: 1 },
          },
        },
      ]),
      FollowUp.find({ companyId: { $in: companyIds }, status: 'PENDING' }).sort({ dueDate: 1 }).lean(),
    ]);

    // Populate user object for latestInteractions
    const interactionUserIds = Array.from(
      new Set(latestInteractionsAgg.filter((item) => item.userId).map((item) => item.userId.toString()))
    );
    const interactionUsers = await User.find({ _id: { $in: interactionUserIds } }).select('name email').lean();
    const userMap = {};
    interactionUsers.forEach((u) => {
      userMap[u._id.toString()] = { id: u._id.toString(), name: u.name, email: u.email };
    });

    const contactMap = {};
    primaryContacts.forEach((c) => (contactMap[c.companyId.toString()] = c));

    const assignmentMap = {};
    companyAssignments.forEach((a) => (assignmentMap[a.companyId.toString()] = a));

    const interactionMap = {};
    latestInteractionsAgg.forEach((item) => {
      item.user = userMap[item.userId?.toString()] || null;
      interactionMap[item._id.toString()] = item;
    });

    const followUpMap = {};
    pendingFollowUpsRaw.forEach((fu) => {
      const compIdStr = fu.companyId.toString();
      if (!followUpMap[compIdStr]) {
        followUpMap[compIdStr] = fu;
      }
    });

    const companyRows = companies.map((comp) => {
      const compIdStr = comp._id.toString();
      const contact = contactMap[compIdStr] || null;
      const assign = assignmentMap[compIdStr] || null;
      const inter = interactionMap[compIdStr] || null;
      const fu = followUpMap[compIdStr] || null;

      let derivedOutreachStatus = 'TO_CONTACT';
      if (fu && new Date(fu.dueDate) <= endOfDay) {
        derivedOutreachStatus = 'FOLLOW_UP_DUE';
      } else if (inter) {
        derivedOutreachStatus = 'CONTACTED';
      }

      const sourceLabel =
        comp.source === 'BULK_IMPORT'
          ? 'Bulk Import'
          : comp.source === 'TEAM_MEMBER_SELF_ADDED'
          ? 'Team Member Self-Added'
          : comp.source === 'MANUAL_PMO'
          ? 'PMO Created'
          : 'Other';

      return {
        'Company Name': comp.companyName || '',
        'Industry': comp.industry || '—',
        'Website': comp.website || '—',
        'LinkedIn': comp.linkedin || '—',
        'Country': comp.country || 'India',
        'State': comp.state || '—',
        'City': comp.city || '—',
        'Location': comp.location || '—',
        'Remarks': comp.remarks || '—',
        'Company Status': comp.status || 'ACTIVE',
        'Source': sourceLabel,
        'Registered By': comp.createdBy?.name || 'PMO / System',
        'Registered By Email': comp.createdBy?.email || '—',
        'Registered Date': comp.createdAt ? new Date(comp.createdAt).toLocaleDateString('en-US') : '—',
        'Primary HR Name': contact?.name || '—',
        'Primary HR Designation': contact?.designation || '—',
        'Primary HR Email': contact?.email || '—',
        'Primary HR Phone': contact?.phone || '—',
        'Primary HR LinkedIn': contact?.linkedin || '—',
        'Current Assigned Team Member': assign?.assignedTo?.name || 'Unassigned',
        'Assigned By': assign?.assignedBy?.name || '—',
        'Assigned Date': assign?.createdAt ? new Date(assign.createdAt).toLocaleDateString('en-US') : '—',
        'Assignment Status': assign ? assign.status : 'UNASSIGNED',
        'Outreach Status': derivedOutreachStatus,
        'Last Contacted Date': inter?.lastContactedAt ? new Date(inter.lastContactedAt).toLocaleDateString('en-US') : 'Never',
        'Last Contacted By': inter?.user?.name || '—',
        'Total Interactions': inter?.totalInteractions || 0,
        'Latest Hiring Status': inter?.callDetails?.hiringStatus || inter?.outcome || '—',
        'Target Profiles / Job Roles':
          inter?.callDetails?.jobRoleSnapshots?.length > 0
            ? inter.callDetails.jobRoleSnapshots.map((r) => r.name).join(', ')
            : inter?.callDetails?.profiles?.length > 0
            ? inter.callDetails.profiles.join(', ')
            : '—',
        'Candidate Type': inter?.callDetails?.candidateType || '—',
        'Approx Openings': inter?.callDetails?.openings ?? '—',
        'Opportunity Type': inter?.callDetails?.opportunityType || '—',
        'Work Mode': inter?.callDetails?.workMode || '—',
        'Salary / Stipend': inter?.callDetails?.salaryOrStipend || '—',
        'Bond / Agreement': inter?.callDetails?.bond || '—',
        'Specific Requirement': inter?.callDetails?.specificRequirement || '—',
        'Latest Discussion Notes': inter?.notes || inter?.callDetails?.hrResponse || '—',
        'Follow-up Status': fu?.status || '—',
        'Follow-up Due Date': fu?.dueDate ? new Date(fu.dueDate).toLocaleDateString('en-US') : '—',
        'Follow-up Reason / Next Action': fu?.reason || '—',
      };
    });

    const workbook = xlsx.utils.book_new();
    const wsCompanies = xlsx.utils.json_to_sheet(companyRows);
    xlsx.utils.book_append_sheet(workbook, wsCompanies, 'Companies');

    if (includeHistory) {
      const allInteractions = await Interaction.find({ companyId: { $in: companyIds } })
        .populate('companyId', 'companyName')
        .populate('userId', 'name email')
        .populate('contactId', 'name designation email')
        .sort({ interactionDate: -1, createdAt: -1 })
        .lean();

      const historyRows = allInteractions.map((item) => ({
        'Company Name': item.companyId?.companyName || '—',
        'Team Member Name': item.userId?.name || '—',
        'Team Member Email': item.userId?.email || '—',
        'Interaction Date': item.interactionDate ? new Date(item.interactionDate).toLocaleString('en-US') : '—',
        'Interaction Type': item.interactionType || 'PHONE_CALL',
        'HR Contact Name': item.contactId?.name || '—',
        'HR Contact Designation': item.contactId?.designation || '—',
        'HR Contact Email': item.contactId?.email || '—',
        'Hiring Status': item.callDetails?.hiringStatus || item.outcome || '—',
        'Approx Openings': item.callDetails?.openings ?? '—',
        'Target Profiles / Job Roles':
          item.callDetails?.jobRoleSnapshots?.length > 0
            ? item.callDetails.jobRoleSnapshots.map((r) => r.name).join(', ')
            : item.callDetails?.profiles?.length > 0
            ? item.callDetails.profiles.join(', ')
            : '—',
        'Candidate Type': item.callDetails?.candidateType || '—',
        'Work Mode': item.callDetails?.workMode || '—',
        'Salary / Stipend': item.callDetails?.salaryOrStipend || '—',
        'Conversation Notes': item.notes || item.callDetails?.hrResponse || '—',
        'Follow-up Date': item.followUpDate ? new Date(item.followUpDate).toLocaleDateString('en-US') : '—',
        'Follow-up Reason': item.followUpReason || item.nextAction || '—',
      }));

      const wsHistory = xlsx.utils.json_to_sheet(historyRows);
      xlsx.utils.book_append_sheet(workbook, wsHistory, 'Outreach History');
    }

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Log Audit Event
    await auditService.logAction({
      organizationId: userContext.role === 'PMO' ? userContext.organizationId : null,
      performedBy: userContext.id || userContext._id,
      action: 'COMPANY_DATA_EXPORTED',
      entityType: 'Company',
      metadata: {
        exportScope,
        includeHistory,
        recordCount: companyRows.length,
        filterSummary: {
          search: queryOptions.search || null,
          status: queryOptions.status || null,
          industry: queryOptions.industry || null,
          city: queryOptions.city || null,
          source: queryOptions.source || null,
          assignmentStatus: queryOptions.assignmentStatus || null,
          assignedTo: queryOptions.assignedTo || null,
          outreachStatus: queryOptions.outreachStatus || null,
          hiringStatus: queryOptions.hiringStatus || null,
        },
      },
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const filename =
      exportScope === 'ALL'
        ? `placement-company-database-${dateStr}.xlsx`
        : `placement-companies-filtered-${dateStr}.xlsx`;

    return { buffer, filename };
  }

  /**
   * Retrieve single company details by ID with tenant security check
   *
   * @param {Object} userContext
   * @param {string} companyId
   * @returns {Promise<Object>}
   */
  async getCompanyById(userContext, companyId) {
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      const error = new Error('Invalid company ID format');
      error.statusCode = 400;
      error.code = 'INVALID_COMPANY_ID';
      throw error;
    }

    const filter = { _id: companyId };

    if (userContext.role === 'PMO') {
      filter.organizationId = userContext.organizationId;
    } else if (userContext.role === 'TEAM_MEMBER') {
      filter.organizationId = userContext.organizationId;
      const hasActiveAssignment = await Assignment.exists({
        organizationId: userContext.organizationId,
        companyId: companyId,
        assignedTo: userContext.id,
        status: 'ACTIVE',
      });
      if (!hasActiveAssignment) {
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

    const company = await Company.findOne(filter)
      .populate('organizationId', 'name code status email phone address')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!company) {
      // Resource hiding for cross-tenant or missing requests
      const error = new Error('Company not found');
      error.statusCode = 404;
      error.code = 'COMPANY_NOT_FOUND';
      throw error;
    }

    const [contacts, assignments, interactions, followUps, opportunities] = await Promise.all([
      Contact.find({ companyId: company._id }),
      Assignment.find({ companyId: company._id })
        .populate('assignedTo', 'name email phone status')
        .populate('assignedBy', 'name email')
        .sort({ createdAt: -1 }),
      Interaction.find({ companyId: company._id })
        .populate('userId', 'name email role')
        .populate('contactId', 'name designation email phone linkedin')
        .sort({ interactionDate: -1, createdAt: -1 }),
      FollowUp.find({ companyId: company._id })
        .populate('assignedTo', 'name email')
        .sort({ dueDate: 1 }),
      JobOpportunity.find({ companyId: company._id })
        .sort({ createdAt: -1 }),
    ]);

    const result = company.toJSON();
    result.contacts = contacts.map((c) => c.toJSON());
    result.primaryContact = contacts.find((c) => c.isPrimary)?.toJSON() || null;
    result.assignmentHistory = assignments.map((a) => a.toJSON());
    result.currentAssignment = assignments.find((a) => a.status === 'ACTIVE')?.toJSON() || null;
    result.interactions = interactions.map((i) => i.toJSON());
    result.latestInteraction = interactions.length > 0 ? interactions[0].toJSON() : null;
    result.followUps = followUps.map((f) => f.toJSON());
    result.opportunities = opportunities.map((o) => o.toJSON());

    return result;
  }

  /**
   * Create a new company record in the master directory
   *
   * @param {Object} userContext
   * @param {Object} companyData
   * @returns {Promise<Object>}
   */
  async createCompany(userContext, companyData) {
    let targetOrgId = null;

    if (userContext.role === 'PMO' || userContext.role === 'TEAM_MEMBER') {
      targetOrgId = userContext.organizationId;
    } else if (userContext.role === 'SUPER_ADMIN') {
      if (!companyData.organizationId || !mongoose.Types.ObjectId.isValid(companyData.organizationId)) {
        const error = new Error('Target organization ID is required for Super Admin creation');
        error.statusCode = 400;
        error.code = 'ORGANIZATION_REQUIRED';
        throw error;
      }
      targetOrgId = companyData.organizationId;

      const org = await Organization.findById(targetOrgId);
      if (!org) {
        const error = new Error('Target organization does not exist');
        error.statusCode = 404;
        error.code = 'ORGANIZATION_NOT_FOUND';
        throw error;
      }
      if (org.status !== 'ACTIVE') {
        const error = new Error('Cannot create company for an inactive organization');
        error.statusCode = 400;
        error.code = 'ORGANIZATION_INACTIVE';
        throw error;
      }
    } else {
      const error = new Error('Unauthorized to create companies');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    if (!companyData.companyName || companyData.companyName.trim() === '') {
      const error = new Error('Company name is required');
      error.statusCode = 400;
      error.code = 'COMPANY_NAME_REQUIRED';
      throw error;
    }

    const normName = normalizeCompanyName(companyData.companyName);

    const existingName = await Company.findOne({
      organizationId: targetOrgId,
      normalizedName: normName,
    });

    if (existingName) {
      const error = new Error(
        `Company Already Registered: "${existingName.companyName}" is already registered in the Placement Management System. You cannot create another company with the same name. Please search for the existing company or contact the PMO if you believe this is a duplicate/error.`
      );
      error.statusCode = 409;
      error.code = 'DUPLICATE_COMPANY';
      throw error;
    }

    if (companyData.website && companyData.website.trim() !== '') {
      const normWeb = normalizeWebsite(companyData.website);
      if (normWeb) {
        const orgCompanies = await Company.find({ organizationId: targetOrgId });
        const existingWebsite = orgCompanies.find(
          (c) => c.website && normalizeWebsite(c.website) === normWeb
        );

        if (existingWebsite) {
          const error = new Error(
            `Company Already Registered: A company with website "${existingWebsite.website}" is already registered in this organization.`
          );
          error.statusCode = 409;
          error.code = 'DUPLICATE_COMPANY_WEBSITE';
          throw error;
        }
      }
    }

    const companySource = userContext.role === 'TEAM_MEMBER' ? 'TEAM_MEMBER_SELF_ADDED' : (companyData.source || 'MANUAL_PMO');

    const company = await Company.create({
      organizationId: targetOrgId,
      companyName: companyData.companyName.trim(),
      normalizedName: normName,
      industry: companyData.industry?.trim() || '',
      website: companyData.website?.trim().toLowerCase() || '',
      linkedin: companyData.linkedin?.trim() || '',
      country: companyData.country?.trim() || 'India',
      state: companyData.state?.trim() || '',
      city: companyData.city?.trim() || '',
      location: companyData.location?.trim() || '',
      remarks: companyData.remarks?.trim() || '',
      status: companyData.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      createdBy: userContext.id,
      source: companySource,
    });

    if (companyData.primaryContact && companyData.primaryContact.name?.trim()) {
      await Contact.create({
        organizationId: targetOrgId,
        companyId: company._id,
        name: companyData.primaryContact.name.trim(),
        designation: companyData.primaryContact.designation?.trim() || '',
        email: companyData.primaryContact.email?.trim().toLowerCase() || '',
        phone: companyData.primaryContact.phone?.trim() || '',
        linkedin: companyData.primaryContact.linkedin?.trim() || '',
        isPrimary: true,
      });
    }

    if (userContext.role === 'TEAM_MEMBER') {
      await Assignment.create({
        organizationId: targetOrgId,
        companyId: company._id,
        assignedTo: userContext.id,
        assignedBy: userContext.id,
        status: 'ACTIVE',
        source: 'TEAM_MEMBER_SELF_ADDED',
        reason: 'Self-added company by Team Member',
      });

      await auditService.logAction({
        organizationId: targetOrgId,
        performedBy: userContext.id,
        action: 'COMPANY_SELF_ADDED',
        entityType: 'Company',
        entityId: company._id,
        metadata: {
          companyName: company.companyName,
          source: 'TEAM_MEMBER_SELF_ADDED',
          assignedTo: userContext.id,
        },
      });

      try {
        const pmoUsers = await User.find({ organizationId: targetOrgId, role: 'PMO', status: 'ACTIVE' });
        for (const pmo of pmoUsers) {
          await Notification.create({
            organizationId: targetOrgId,
            recipientId: pmo._id,
            type: 'COMPANY_ASSIGNED',
            title: 'New Self-Discovered Company Added',
            message: `${userContext.name || 'Team Member'} added new company "${company.companyName}" and was assigned for outreach.`,
            entity: 'Company',
            entityId: company._id,
          });
        }
      } catch (notifErr) {
        console.warn(`[CreateCompany] Notification warning: ${notifErr.message}`);
      }
    } else {
      await auditService.logAction({
        organizationId: targetOrgId,
        performedBy: userContext.id,
        action: 'COMPANY_CREATED',
        entityType: 'Company',
        entityId: company._id,
        metadata: {
          companyName: company.companyName,
          industry: company.industry,
          city: company.city,
        },
      });
    }

    return this.getCompanyById(userContext, company._id);
  }

  /**
   * Update existing company details
   *
   * @param {Object} userContext
   * @param {string} companyId
   * @param {Object} updateData
   * @returns {Promise<Object>}
   */
  async updateCompany(userContext, companyId, updateData) {
    const companyDetail = await this.getCompanyById(userContext, companyId);
    const company = await Company.findById(companyId);

    const orgId = company.organizationId;
    const previousSnapshot = company.toObject();

    if (updateData.companyName && updateData.companyName.trim() !== company.companyName) {
      const normName = normalizeCompanyName(updateData.companyName);
      const existingName = await Company.findOne({
        organizationId: orgId,
        normalizedName: normName,
        _id: { $ne: companyId },
      });

      if (existingName) {
        const error = new Error(
          `A company with a similar name "${existingName.companyName}" already exists in this organization.`
        );
        error.statusCode = 409;
        error.code = 'DUPLICATE_COMPANY';
        throw error;
      }

      company.companyName = updateData.companyName.trim();
      company.normalizedName = normName;
    }

    if (updateData.website !== undefined && updateData.website.trim() !== '') {
      const normWeb = normalizeWebsite(updateData.website);
      if (normWeb) {
        const orgCompanies = await Company.find({ organizationId: orgId, _id: { $ne: companyId } });
        const existingWebsite = orgCompanies.find(
          (c) => c.website && normalizeWebsite(c.website) === normWeb
        );

        if (existingWebsite) {
          const error = new Error(
            `A company with website "${existingWebsite.website}" already exists in this organization.`
          );
          error.statusCode = 409;
          error.code = 'DUPLICATE_COMPANY_WEBSITE';
          throw error;
        }
      }
      company.website = updateData.website.trim().toLowerCase();
    } else if (updateData.website === '') {
      company.website = '';
    }

    if (updateData.industry !== undefined) company.industry = updateData.industry.trim();
    if (updateData.linkedin !== undefined) company.linkedin = updateData.linkedin.trim();
    if (updateData.country !== undefined) company.country = updateData.country.trim();
    if (updateData.state !== undefined) company.state = updateData.state.trim();
    if (updateData.city !== undefined) company.city = updateData.city.trim();
    if (updateData.location !== undefined) company.location = updateData.location.trim();
    if (updateData.remarks !== undefined) company.remarks = updateData.remarks.trim();
    if (updateData.status && ['ACTIVE', 'INACTIVE'].includes(updateData.status)) {
      company.status = updateData.status;
    }

    company.updatedBy = userContext.id;
    await company.save();

    if (updateData.primaryContact && typeof updateData.primaryContact === 'object') {
      const existingPrimary = await Contact.findOne({ companyId: company._id, isPrimary: true });
      if (existingPrimary) {
        if (updateData.primaryContact.name !== undefined)
          existingPrimary.name = updateData.primaryContact.name.trim();
        if (updateData.primaryContact.designation !== undefined)
          existingPrimary.designation = updateData.primaryContact.designation.trim();
        if (updateData.primaryContact.email !== undefined)
          existingPrimary.email = updateData.primaryContact.email.trim().toLowerCase();
        if (updateData.primaryContact.phone !== undefined)
          existingPrimary.phone = updateData.primaryContact.phone.trim();
        if (updateData.primaryContact.linkedin !== undefined)
          existingPrimary.linkedin = updateData.primaryContact.linkedin.trim();
        await existingPrimary.save();
      } else if (updateData.primaryContact.name?.trim()) {
        await Contact.create({
          organizationId: orgId,
          companyId: company._id,
          name: updateData.primaryContact.name.trim(),
          designation: updateData.primaryContact.designation?.trim() || '',
          email: updateData.primaryContact.email?.trim().toLowerCase() || '',
          phone: updateData.primaryContact.phone?.trim() || '',
          linkedin: updateData.primaryContact.linkedin?.trim() || '',
          isPrimary: true,
        });
      }
    }

    const diff = auditService.createDiff(previousSnapshot, company.toObject());
    await auditService.logAction({
      organizationId: orgId,
      performedBy: userContext.id,
      action: 'COMPANY_UPDATED',
      entityType: 'Company',
      entityId: company._id,
      oldValue: diff.oldValue,
      newValue: diff.newValue,
      metadata: {
        companyName: company.companyName,
        updatedFields: Object.keys(updateData),
      },
    });

    return this.getCompanyById(userContext, company._id);
  }

  /**
   * Activate or deactivate a company record
   *
   * @param {Object} userContext
   * @param {string} companyId
   * @param {string} status
   * @returns {Promise<Object>}
   */
  async updateCompanyStatus(userContext, companyId, status) {
    if (!['ACTIVE', 'INACTIVE'].includes(status?.toUpperCase())) {
      const error = new Error('Invalid status value. Must be ACTIVE or INACTIVE');
      error.statusCode = 400;
      error.code = 'INVALID_STATUS';
      throw error;
    }

    await this.getCompanyById(userContext, companyId);
    const company = await Company.findById(companyId);

    const previousStatus = company.status;
    const newStatus = status.toUpperCase();
    company.status = newStatus;
    company.updatedBy = userContext.id;
    await company.save();

    await auditService.logAction({
      organizationId: company.organizationId,
      performedBy: userContext.id,
      action: newStatus === 'ACTIVE' ? 'COMPANY_ACTIVATED' : 'COMPANY_DEACTIVATED',
      entityType: 'Company',
      entityId: company._id,
      oldValue: { status: previousStatus },
      newValue: { status: newStatus },
      metadata: {
        companyName: company.companyName,
        previousStatus,
        newStatus,
      },
    });

    return this.getCompanyById(userContext, company._id);
  }

  /**
   * Delete single company record and associated operational data within tenant boundary
   *
   * @param {Object} userContext
   * @param {string} companyId
   * @returns {Promise<{ success: boolean, deletedCompanyId: string, companyName: string }>}
   */
  async deleteCompany(userContext, companyId) {
    if (userContext.role !== 'PMO') {
      const error = new Error('Access denied. Only PMO can delete individual company records from their organization.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    const companyDetail = await this.getCompanyById(userContext, companyId);
    const company = await Company.findById(companyId);
    if (!company) {
      const error = new Error('Company not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    const orgId = company.organizationId;

    // Delete associated tenant records safely
    await Promise.all([
      Contact.deleteMany({ companyId: company._id, organizationId: orgId }),
      Assignment.deleteMany({ companyId: company._id, organizationId: orgId }),
      Interaction.deleteMany({ companyId: company._id, organizationId: orgId }),
      FollowUp.deleteMany({ companyId: company._id, organizationId: orgId }),
      JobOpportunity.deleteMany({ companyId: company._id, organizationId: orgId }),
      Company.deleteOne({ _id: company._id, organizationId: orgId }),
    ]);

    await auditService.logAction({
      organizationId: orgId,
      performedBy: userContext.id,
      action: 'COMPANY_DELETED',
      entityType: 'Company',
      entityId: company._id,
      oldValue: { companyName: company.companyName, industry: company.industry },
      metadata: { companyName: company.companyName },
    });

    return {
      success: true,
      deletedCompanyId: company._id.toString(),
      companyName: company.companyName,
    };
  }

  /**
   * Bulk delete selected companies within tenant boundary
   *
   * @param {Object} userContext
   * @param {Array<string>} companyIds
   * @returns {Promise<{ success: boolean, deletedCount: number, deletedCompanyIds: Array<string> }>}
   */
  async bulkDeleteCompanies(userContext, companyIds = []) {
    if (userContext.role !== 'PMO') {
      const error = new Error('Access denied. Only PMO can bulk delete company records from their organization.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    if (!Array.isArray(companyIds) || companyIds.length === 0) {
      const error = new Error('No company IDs provided for deletion');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    const uniqueIds = Array.from(
      new Set(companyIds.map((id) => String(id).trim()).filter((id) => mongoose.Types.ObjectId.isValid(id)))
    );

    if (uniqueIds.length === 0) {
      const error = new Error('Invalid company IDs provided');
      error.statusCode = 400;
      error.code = 'INVALID_ID';
      throw error;
    }

    const filter = { _id: { $in: uniqueIds } };
    if (userContext.role === 'PMO') {
      filter.organizationId = userContext.organizationId;
    }

    const companies = await Company.find(filter).lean();
    if (companies.length === 0) {
      const error = new Error('No matching companies found within your organization boundary');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    const validCompanyIds = companies.map((c) => c._id);
    const targetOrgId = userContext.role === 'PMO' ? userContext.organizationId : companies[0].organizationId;

    await Promise.all([
      Contact.deleteMany({ companyId: { $in: validCompanyIds } }),
      Assignment.deleteMany({ companyId: { $in: validCompanyIds } }),
      Interaction.deleteMany({ companyId: { $in: validCompanyIds } }),
      FollowUp.deleteMany({ companyId: { $in: validCompanyIds } }),
      JobOpportunity.deleteMany({ companyId: { $in: validCompanyIds } }),
      Company.deleteMany({ _id: { $in: validCompanyIds } }),
    ]);

    await auditService.logAction({
      organizationId: targetOrgId,
      performedBy: userContext.id,
      action: 'COMPANY_BULK_DELETED',
      entityType: 'Company',
      metadata: {
        deletedCount: validCompanyIds.length,
        companyNames: companies.map((c) => c.companyName),
      },
    });

    return {
      success: true,
      deletedCount: validCompanyIds.length,
      deletedCompanyIds: validCompanyIds.map((id) => id.toString()),
    };
  }
}

export const companyService = new CompanyService();
export default companyService;
