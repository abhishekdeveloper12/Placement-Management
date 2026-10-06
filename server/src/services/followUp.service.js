import mongoose from 'mongoose';
import FollowUp from '../models/FollowUp.js';
import Company from '../models/Company.js';
import Assignment from '../models/Assignment.js';
import auditService from './audit.service.js';

class FollowUpService {
  /**
   * Create a manual follow-up task for an assigned company (Team Member)
   */
  async createFollowUp(userContext, payload) {
    if (userContext.role !== 'TEAM_MEMBER') {
      const error = new Error('Only operational Team Members can create follow-up tasks');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    const orgId = userContext.organizationId;
    const userId = userContext.id;
    const { companyId, dueDate, reason = '', notes = '' } = payload;

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

    // Verify active assignment
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

    if (!dueDate) {
      const error = new Error('Due date is required for follow-up task');
      error.statusCode = 400;
      error.code = 'DUE_DATE_REQUIRED';
      throw error;
    }

    const parsedDueDate = new Date(dueDate);
    if (isNaN(parsedDueDate.getTime())) {
      const error = new Error('Invalid due date format');
      error.statusCode = 400;
      error.code = 'INVALID_DUE_DATE';
      throw error;
    }

    const followUp = await FollowUp.create({
      organizationId: orgId,
      companyId: company._id,
      assignedTo: userId,
      dueDate: parsedDueDate,
      reason: reason.trim() || 'Manual follow-up task',
      notes: notes.trim(),
      status: 'PENDING',
    });

    await auditService.logAction({
      organizationId: orgId,
      performedBy: userId,
      action: 'FOLLOW_UP_CREATED',
      entityType: 'FollowUp',
      entityId: followUp._id,
      metadata: {
        companyId: company._id,
        companyName: company.companyName,
        dueDate: parsedDueDate,
        reason: reason.trim(),
      },
    });

    const populated = await FollowUp.findById(followUp._id)
      .populate('companyId', 'companyName industry city')
      .populate('assignedTo', 'name email');

    return populated.toJSON();
  }

  /**
   * Get team member assigned follow-ups with filters & pagination
   */
  async getTeamMemberFollowUps(userContext, query = {}) {
    const orgId = userContext.organizationId;
    const userId = userContext.id;
    const { filter = 'PENDING', companyId, search = '', page = 1, limit = 20 } = query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filterObj = {
      organizationId: orgId,
      assignedTo: userId,
    };

    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      filterObj.companyId = companyId;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Apply status/due-date filter tabs
    switch (filter.toUpperCase()) {
      case 'PENDING':
        filterObj.status = 'PENDING';
        break;
      case 'OVERDUE':
        filterObj.status = 'PENDING';
        filterObj.dueDate = { $lt: now };
        break;
      case 'TODAY':
        filterObj.status = 'PENDING';
        filterObj.dueDate = { $gte: startOfToday, $lte: endOfToday };
        break;
      case 'UPCOMING':
        filterObj.status = 'PENDING';
        filterObj.dueDate = { $gt: endOfToday };
        break;
      case 'COMPLETED':
        filterObj.status = 'COMPLETED';
        break;
      case 'CANCELLED':
        filterObj.status = 'CANCELLED';
        break;
      case 'ALL':
        // No status filter
        break;
      default:
        filterObj.status = 'PENDING';
        break;
    }

    // Optional text search
    if (search.trim()) {
      filterObj.$or = [
        { reason: { $regex: search.trim(), $options: 'i' } },
        { notes: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const total = await FollowUp.countDocuments(filterObj);

    // Sort order: pending/overdue ascending by dueDate, completed/cancelled descending by updatedAt
    const sort = filter === 'COMPLETED' || filter === 'CANCELLED' || filter === 'ALL'
      ? { updatedAt: -1 }
      : { dueDate: 1 };

    const followUps = await FollowUp.find(filterObj)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('companyId', 'companyName industry city')
      .populate('assignedTo', 'name email')
      .populate('interactionId', 'interactionDate outcome interactionType notes');

    return {
      data: followUps.map((f) => f.toJSON()),
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Get single follow-up detail by ID
   */
  async getFollowUpById(userContext, followUpId) {
    if (!mongoose.Types.ObjectId.isValid(followUpId)) {
      const error = new Error('Follow-up task not found');
      error.statusCode = 404;
      error.code = 'FOLLOW_UP_NOT_FOUND';
      throw error;
    }

    const filterObj = {
      _id: followUpId,
    };

    if (userContext.role !== 'SUPER_ADMIN') {
      filterObj.organizationId = userContext.organizationId;
    }

    if (userContext.role === 'TEAM_MEMBER') {
      filterObj.assignedTo = userContext.id;
    }

    const followUp = await FollowUp.findOne(filterObj)
      .populate('companyId', 'companyName industry city website primaryContact')
      .populate('assignedTo', 'name email')
      .populate('interactionId', 'interactionDate outcome interactionType notes callDetails');

    if (!followUp) {
      const error = new Error('Follow-up task not found');
      error.statusCode = 404;
      error.code = 'FOLLOW_UP_NOT_FOUND';
      throw error;
    }

    return followUp.toJSON();
  }

  /**
   * Complete a follow-up task
   */
  async completeFollowUp(userContext, followUpId, { notes = '' } = {}) {
    if (userContext.role !== 'TEAM_MEMBER') {
      const error = new Error('Only responsible Team Members can complete follow-up tasks');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    const followUp = await FollowUp.findOne({
      _id: followUpId,
      organizationId: userContext.organizationId,
      assignedTo: userContext.id,
    }).populate('companyId', 'companyName');

    if (!followUp) {
      const error = new Error('Follow-up task not found');
      error.statusCode = 404;
      error.code = 'FOLLOW_UP_NOT_FOUND';
      throw error;
    }

    if (followUp.status === 'COMPLETED') {
      const error = new Error('Follow-up task is already completed');
      error.statusCode = 400;
      error.code = 'ALREADY_COMPLETED';
      throw error;
    }

    followUp.status = 'COMPLETED';
    followUp.completedAt = new Date();
    if (notes && notes.trim()) {
      followUp.notes = notes.trim();
    }
    await followUp.save();

    await auditService.logAction({
      organizationId: userContext.organizationId,
      performedBy: userContext.id,
      action: 'FOLLOW_UP_COMPLETED',
      entityType: 'FollowUp',
      entityId: followUp._id,
      metadata: {
        companyId: followUp.companyId ? followUp.companyId._id : null,
        companyName: followUp.companyId ? followUp.companyId.companyName : '',
        completedAt: followUp.completedAt,
        notes: followUp.notes,
      },
    });

    const populated = await FollowUp.findById(followUp._id)
      .populate('companyId', 'companyName industry city')
      .populate('assignedTo', 'name email');

    return populated.toJSON();
  }

  /**
   * Cancel a follow-up task
   */
  async cancelFollowUp(userContext, followUpId, { notes = '' } = {}) {
    if (userContext.role !== 'TEAM_MEMBER') {
      const error = new Error('Only responsible Team Members can cancel follow-up tasks');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    const followUp = await FollowUp.findOne({
      _id: followUpId,
      organizationId: userContext.organizationId,
      assignedTo: userContext.id,
    }).populate('companyId', 'companyName');

    if (!followUp) {
      const error = new Error('Follow-up task not found');
      error.statusCode = 404;
      error.code = 'FOLLOW_UP_NOT_FOUND';
      throw error;
    }

    if (followUp.status === 'CANCELLED') {
      const error = new Error('Follow-up task is already cancelled');
      error.statusCode = 400;
      error.code = 'ALREADY_CANCELLED';
      throw error;
    }

    followUp.status = 'CANCELLED';
    if (notes && notes.trim()) {
      followUp.notes = notes.trim();
    }
    await followUp.save();

    await auditService.logAction({
      organizationId: userContext.organizationId,
      performedBy: userContext.id,
      action: 'FOLLOW_UP_CANCELLED',
      entityType: 'FollowUp',
      entityId: followUp._id,
      metadata: {
        companyId: followUp.companyId ? followUp.companyId._id : null,
        companyName: followUp.companyId ? followUp.companyId.companyName : '',
        notes: followUp.notes,
      },
    });

    const populated = await FollowUp.findById(followUp._id)
      .populate('companyId', 'companyName industry city')
      .populate('assignedTo', 'name email');

    return populated.toJSON();
  }

  /**
   * Get organization-wide follow-ups for PMO & Super Admin
   */
  async getPMOFollowUps(userContext, query = {}) {
    const { assignedTo, companyId, status, search = '', page = 1, limit = 20 } = query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filterObj = {};
    if (userContext.role !== 'SUPER_ADMIN') {
      filterObj.organizationId = userContext.organizationId;
    }

    if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
      filterObj.assignedTo = assignedTo;
    }

    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      filterObj.companyId = companyId;
    }

    const now = new Date();
    if (status) {
      if (status.toUpperCase() === 'OVERDUE') {
        filterObj.status = 'PENDING';
        filterObj.dueDate = { $lt: now };
      } else {
        filterObj.status = status.toUpperCase();
      }
    }

    if (search.trim()) {
      filterObj.$or = [
        { reason: { $regex: search.trim(), $options: 'i' } },
        { notes: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const total = await FollowUp.countDocuments(filterObj);
    const followUps = await FollowUp.find(filterObj)
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(limitNum)
      .populate('companyId', 'companyName industry city')
      .populate('assignedTo', 'name email')
      .populate('interactionId', 'interactionDate outcome interactionType notes');

    return {
      data: followUps.map((f) => f.toJSON()),
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Get lightweight follow-up operational counts for dashboard
   */
  async getFollowUpStats(userContext) {
    const filterObj = {};
    if (userContext.role !== 'SUPER_ADMIN') {
      filterObj.organizationId = userContext.organizationId;
    }
    if (userContext.role === 'TEAM_MEMBER') {
      filterObj.assignedTo = userContext.id;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [pending, overdue, today, upcoming, completed, cancelled, total] = await Promise.all([
      FollowUp.countDocuments({ ...filterObj, status: 'PENDING' }),
      FollowUp.countDocuments({ ...filterObj, status: 'PENDING', dueDate: { $lt: now } }),
      FollowUp.countDocuments({ ...filterObj, status: 'PENDING', dueDate: { $gte: startOfToday, $lte: endOfToday } }),
      FollowUp.countDocuments({ ...filterObj, status: 'PENDING', dueDate: { $gt: endOfToday } }),
      FollowUp.countDocuments({ ...filterObj, status: 'COMPLETED' }),
      FollowUp.countDocuments({ ...filterObj, status: 'CANCELLED' }),
      FollowUp.countDocuments(filterObj),
    ]);

    return {
      pending,
      overdue,
      today,
      upcoming,
      completed,
      cancelled,
      total,
    };
  }
}

export default new FollowUpService();
