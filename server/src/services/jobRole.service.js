import mongoose from 'mongoose';
import JobRole from '../models/JobRole.js';
import Interaction from '../models/Interaction.js';
import auditService from './audit.service.js';

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

class JobRoleService {
  /**
   * List paginated job roles for PMO's organization with usage metrics
   *
   * @param {Object} userContext
   * @param {Object} queryOptions
   * @returns {Promise<{ data: Array, meta: Object }>}
   */
  async getJobRoles(userContext, queryOptions = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryOptions;

    const organizationId = userContext.organizationId;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = { organizationId };

    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      filter.status = status.toUpperCase();
    }

    if (search && search.trim() !== '') {
      filter.name = new RegExp(escapeRegex(search.trim()), 'i');
    }

    const sortOptions = {};
    const validSortFields = ['createdAt', 'updatedAt', 'name', 'status'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

    const [roles, total] = await Promise.all([
      JobRole.find(filter)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      JobRole.countDocuments(filter),
    ]);

    // Compute usage counts for fetched roles
    const roleIds = roles.map((r) => r._id);
    const usageAgg = await Interaction.aggregate([
      {
        $match: {
          organizationId: new mongoose.Types.ObjectId(organizationId),
          'callDetails.jobRoleIds': { $in: roleIds },
        },
      },
      { $unwind: '$callDetails.jobRoleIds' },
      { $match: { 'callDetails.jobRoleIds': { $in: roleIds } } },
      {
        $group: {
          _id: '$callDetails.jobRoleIds',
          usedCount: { $sum: 1 },
        },
      },
    ]);

    const usageMap = {};
    usageAgg.forEach((item) => {
      usageMap[item._id.toString()] = item.usedCount;
    });

    const data = roles.map((role) => {
      const json = role.toJSON();
      json.usedCount = usageMap[role._id.toString()] || 0;
      return json;
    });

    return {
      data,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Get active job roles for selection in feedback form (Organization scoped)
   *
   * @param {Object} userContext
   * @returns {Promise<Array>}
   */
  async getActiveJobRoles(userContext) {
    const organizationId = userContext.organizationId;
    if (!organizationId) {
      return [];
    }

    const roles = await JobRole.find({
      organizationId,
      status: 'ACTIVE',
    })
      .select('name description status')
      .sort({ name: 1 });

    return roles.map((r) => r.toJSON());
  }

  /**
   * Create a new job role in the organization (PMO only)
   *
   * @param {Object} userContext
   * @param {Object} roleData
   * @returns {Promise<Object>}
   */
  async createJobRole(userContext, { name, description = '', status = 'ACTIVE' }) {
    const organizationId = userContext.organizationId;
    if (!name || !name.trim()) {
      const error = new Error('Job role name is required');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    const trimmedName = name.trim();
    const normalizedName = trimmedName.toLowerCase();

    // Check duplicate within organization
    const existing = await JobRole.findOne({ organizationId, normalizedName });
    if (existing) {
      const error = new Error(`A job role named '${trimmedName}' already exists in your organization`);
      error.statusCode = 409;
      error.code = 'DUPLICATE_JOB_ROLE';
      throw error;
    }

    const normalizedStatus = status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const role = await JobRole.create({
      organizationId,
      name: trimmedName,
      normalizedName,
      description: description ? description.trim() : '',
      status: normalizedStatus,
      createdBy: userContext.id || userContext._id,
    });

    await auditService.logAction({
      organizationId,
      performedBy: userContext.id || userContext._id,
      action: 'JOB_ROLE_CREATED',
      entityType: 'JobRole',
      entityId: role._id,
      metadata: { name: role.name, status: role.status },
    });

    return role.toJSON();
  }

  /**
   * Update job role name, description, or status (PMO only)
   *
   * @param {Object} userContext
   * @param {string} roleId
   * @param {Object} updateData
   * @returns {Promise<Object>}
   */
  async updateJobRole(userContext, roleId, { name, description, status }) {
    const organizationId = userContext.organizationId;

    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      const error = new Error('Invalid job role ID format');
      error.statusCode = 400;
      error.code = 'INVALID_ROLE_ID';
      throw error;
    }

    const role = await JobRole.findOne({ _id: roleId, organizationId });
    if (!role) {
      const error = new Error('Job role not found or belongs to another organization');
      error.statusCode = 404;
      error.code = 'JOB_ROLE_NOT_FOUND';
      throw error;
    }

    const changes = {};

    if (name && name.trim()) {
      const trimmedName = name.trim();
      const normalizedName = trimmedName.toLowerCase();

      if (normalizedName !== role.normalizedName) {
        const existing = await JobRole.findOne({
          organizationId,
          normalizedName,
          _id: { $ne: role._id },
        });

        if (existing) {
          const error = new Error(`A job role named '${trimmedName}' already exists in your organization`);
          error.statusCode = 409;
          error.code = 'DUPLICATE_JOB_ROLE';
          throw error;
        }

        changes.name = { from: role.name, to: trimmedName };
        role.name = trimmedName;
        role.normalizedName = normalizedName;
      }
    }

    if (description !== undefined) {
      const trimmedDesc = description ? description.trim() : '';
      if (role.description !== trimmedDesc) {
        changes.description = { from: role.description, to: trimmedDesc };
        role.description = trimmedDesc;
      }
    }

    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      const newStatus = status.toUpperCase();
      if (role.status !== newStatus) {
        changes.status = { from: role.status, to: newStatus };
        role.status = newStatus;
      }
    }

    role.updatedBy = userContext.id || userContext._id;
    await role.save();

    await auditService.logAction({
      organizationId,
      performedBy: userContext.id || userContext._id,
      action: 'JOB_ROLE_UPDATED',
      entityType: 'JobRole',
      entityId: role._id,
      metadata: changes,
    });

    return role.toJSON();
  }

  /**
   * Toggle job role status between ACTIVE and INACTIVE (PMO only)
   *
   * @param {Object} userContext
   * @param {string} roleId
   * @param {string} status
   * @returns {Promise<Object>}
   */
  async updateJobRoleStatus(userContext, roleId, status) {
    const organizationId = userContext.organizationId;
    const normalizedStatus = status?.toUpperCase();

    if (!['ACTIVE', 'INACTIVE'].includes(normalizedStatus)) {
      const error = new Error('Status must be either ACTIVE or INACTIVE');
      error.statusCode = 400;
      error.code = 'INVALID_STATUS';
      throw error;
    }

    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      const error = new Error('Invalid job role ID format');
      error.statusCode = 400;
      error.code = 'INVALID_ROLE_ID';
      throw error;
    }

    const role = await JobRole.findOne({ _id: roleId, organizationId });
    if (!role) {
      const error = new Error('Job role not found or belongs to another organization');
      error.statusCode = 404;
      error.code = 'JOB_ROLE_NOT_FOUND';
      throw error;
    }

    if (role.status === normalizedStatus) {
      return role.toJSON();
    }

    const oldStatus = role.status;
    role.status = normalizedStatus;
    role.updatedBy = userContext.id || userContext._id;
    await role.save();

    await auditService.logAction({
      organizationId,
      performedBy: userContext.id || userContext._id,
      action: 'JOB_ROLE_STATUS_CHANGED',
      entityType: 'JobRole',
      entityId: role._id,
      metadata: { previousStatus: oldStatus, newStatus: normalizedStatus },
    });

    return role.toJSON();
  }
}

export const jobRoleService = new JobRoleService();
export default jobRoleService;
