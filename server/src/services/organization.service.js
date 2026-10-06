import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import auditService from './audit.service.js';

class OrganizationService {
  /**
   * Aggregate statistics for Super Admin dashboard
   *
   * @returns {Promise<Object>}
   */
  async getDashboardStats() {
    const [totalOrganizations, activeOrganizations, inactiveOrganizations, totalPmos, activePmos] =
      await Promise.all([
        Organization.countDocuments({}),
        Organization.countDocuments({ status: 'ACTIVE' }),
        Organization.countDocuments({ status: 'INACTIVE' }),
        User.countDocuments({ role: 'PMO' }),
        User.countDocuments({ role: 'PMO', status: 'ACTIVE' }),
      ]);

    return {
      totalOrganizations,
      activeOrganizations,
      inactiveOrganizations,
      totalPmos,
      activePmos,
    };
  }

  /**
   * Paginated, searchable, and filterable organization directory
   *
   * @param {Object} queryOptions
   * @returns {Promise<{ data: Array, pagination: Object }>}
   */
  async getOrganizations({
    page = 1,
    limit = 20,
    search = '',
    status = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      filter.status = status.toUpperCase();
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { name: searchRegex },
        { code: searchRegex },
        { email: searchRegex },
      ];
    }

    const validSortFields = ['createdAt', 'name', 'code', 'status'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 1 : -1;

    const [total, organizations] = await Promise.all([
      Organization.countDocuments(filter),
      Organization.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limitNum),
    ]);

    // Attach PMO info in batch to avoid N+1 queries
    const orgIds = organizations.map((org) => org._id);
    const pmos = await User.find({
      organizationId: { $in: orgIds },
      role: 'PMO',
    }).select('name email phone status organizationId');

    const pmoMap = {};
    for (const pmo of pmos) {
      if (pmo.organizationId) {
        pmoMap[pmo.organizationId.toString()] = {
          id: pmo._id.toString(),
          name: pmo.name,
          email: pmo.email,
          phone: pmo.phone || '',
          status: pmo.status,
        };
      }
    }

    const data = organizations.map((org) => {
      const json = org.toJSON();
      json.pmo = pmoMap[org._id.toString()] || null;
      return json;
    });

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    };
  }

  /**
   * Retrieve organization details with PMO details and counts
   *
   * @param {string} id - Organization ID
   * @returns {Promise<Object>}
   */
  async getOrganizationById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('Invalid organization ID format');
      error.statusCode = 400;
      error.code = 'INVALID_ORGANIZATION_ID';
      throw error;
    }

    const organization = await Organization.findById(id);
    if (!organization) {
      const error = new Error('Organization not found');
      error.statusCode = 404;
      error.code = 'ORGANIZATION_NOT_FOUND';
      throw error;
    }

    const [pmo, userCount] = await Promise.all([
      User.findOne({ organizationId: id, role: 'PMO' }).select('name email phone status lastLoginAt createdAt'),
      User.countDocuments({ organizationId: id }),
    ]);

    const orgJson = organization.toJSON();

    return {
      ...orgJson,
      pmo: pmo
        ? {
            id: pmo._id.toString(),
            name: pmo.name,
            email: pmo.email,
            phone: pmo.phone || '',
            status: pmo.status,
            lastLoginAt: pmo.lastLoginAt,
            createdAt: pmo.createdAt,
          }
        : null,
      userCount,
      companyCount: 0, // Placeholder until Company module is implemented
    };
  }

  /**
   * Register a new organization
   *
   * @param {Object} data
   * @param {string} performedByUserId
   * @returns {Promise<Object>}
   */
  async createOrganization(
    { name, code, email, phone = '', address = '', status = 'ACTIVE' },
    performedByUserId
  ) {
    if (!name || !name.trim()) {
      const error = new Error('Organization name is required');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    if (!code || !code.trim()) {
      const error = new Error('Organization code is required');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    const normalizedCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{2,20}$/.test(normalizedCode)) {
      const error = new Error('Organization code must be 2-20 uppercase alphanumeric characters, hyphens or underscores');
      error.statusCode = 400;
      error.code = 'INVALID_ORGANIZATION_CODE';
      throw error;
    }

    if (!email || !email.trim()) {
      const error = new Error('Contact email is required');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      const error = new Error('Please provide a valid contact email address');
      error.statusCode = 400;
      error.code = 'INVALID_EMAIL_FORMAT';
      throw error;
    }

    // Check for duplicate organization code
    const existingOrg = await Organization.findOne({ code: normalizedCode });
    if (existingOrg) {
      const error = new Error(`An organization with code '${normalizedCode}' already exists`);
      error.statusCode = 409;
      error.code = 'DUPLICATE_ORGANIZATION_CODE';
      throw error;
    }

    const normalizedStatus = status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const organization = await Organization.create({
      name: name.trim(),
      code: normalizedCode,
      email: normalizedEmail,
      phone: phone ? phone.trim() : '',
      address: address || '',
      status: normalizedStatus,
    });

    await auditService.logAction({
      organizationId: organization._id,
      performedBy: performedByUserId,
      action: 'ORGANIZATION_CREATED',
      entityType: 'Organization',
      entityId: organization._id,
      metadata: { name: organization.name, code: organization.code, status: organization.status },
    });

    return organization.toJSON();
  }

  /**
   * Update organization details
   *
   * @param {string} id - Organization ID
   * @param {Object} updateData
   * @param {string} performedByUserId
   * @returns {Promise<Object>}
   */
  async updateOrganization(id, { name, email, phone, address }, performedByUserId) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('Invalid organization ID format');
      error.statusCode = 400;
      error.code = 'INVALID_ORGANIZATION_ID';
      throw error;
    }

    const organization = await Organization.findById(id);
    if (!organization) {
      const error = new Error('Organization not found');
      error.statusCode = 404;
      error.code = 'ORGANIZATION_NOT_FOUND';
      throw error;
    }

    const changes = {};

    if (name && name.trim()) {
      changes.name = { from: organization.name, to: name.trim() };
      organization.name = name.trim();
    }

    if (email && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
        const error = new Error('Please provide a valid contact email address');
        error.statusCode = 400;
        error.code = 'INVALID_EMAIL_FORMAT';
        throw error;
      }
      changes.email = { from: organization.email, to: normalizedEmail };
      organization.email = normalizedEmail;
    }

    if (phone !== undefined) {
      changes.phone = { from: organization.phone, to: phone.trim() };
      organization.phone = phone.trim();
    }

    if (address !== undefined) {
      changes.address = { from: organization.address, to: address };
      organization.address = address;
    }

    await organization.save();

    await auditService.logAction({
      organizationId: organization._id,
      performedBy: performedByUserId,
      action: 'ORGANIZATION_UPDATED',
      entityType: 'Organization',
      entityId: organization._id,
      metadata: changes,
    });

    return organization.toJSON();
  }

  /**
   * Change organization status (ACTIVE / INACTIVE)
   *
   * @param {string} id - Organization ID
   * @param {string} status - New status
   * @param {string} performedByUserId
   * @returns {Promise<Object>}
   */
  async updateOrganizationStatus(id, status, performedByUserId) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('Invalid organization ID format');
      error.statusCode = 400;
      error.code = 'INVALID_ORGANIZATION_ID';
      throw error;
    }

    const normalizedStatus = status?.toUpperCase();
    if (!['ACTIVE', 'INACTIVE'].includes(normalizedStatus)) {
      const error = new Error('Status must be either ACTIVE or INACTIVE');
      error.statusCode = 400;
      error.code = 'INVALID_STATUS';
      throw error;
    }

    const organization = await Organization.findById(id);
    if (!organization) {
      const error = new Error('Organization not found');
      error.statusCode = 404;
      error.code = 'ORGANIZATION_NOT_FOUND';
      throw error;
    }

    const oldStatus = organization.status;
    if (oldStatus === normalizedStatus) {
      return organization.toJSON();
    }

    organization.status = normalizedStatus;
    await organization.save();

    const action = normalizedStatus === 'ACTIVE' ? 'ORGANIZATION_ACTIVATED' : 'ORGANIZATION_DEACTIVATED';

    await auditService.logAction({
      organizationId: organization._id,
      performedBy: performedByUserId,
      action,
      entityType: 'Organization',
      entityId: organization._id,
      metadata: { previousStatus: oldStatus, newStatus: normalizedStatus },
    });

    return organization.toJSON();
  }
}

export const organizationService = new OrganizationService();
export default organizationService;
