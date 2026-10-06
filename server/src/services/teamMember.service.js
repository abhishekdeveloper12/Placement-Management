import mongoose from 'mongoose';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import auditService from './audit.service.js';

class TeamMemberService {
  /**
   * Aggregate team member summary metrics for PMO dashboard
   *
   * @param {string} organizationId
   * @returns {Promise<Object>}
   */
  async getTeamMemberStats(organizationId) {
    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      const error = new Error('Invalid organization ID format');
      error.statusCode = 400;
      error.code = 'INVALID_ORGANIZATION_ID';
      throw error;
    }

    const [totalTeamMembers, activeTeamMembers, inactiveTeamMembers] = await Promise.all([
      User.countDocuments({ organizationId, role: 'TEAM_MEMBER' }),
      User.countDocuments({ organizationId, role: 'TEAM_MEMBER', status: 'ACTIVE' }),
      User.countDocuments({ organizationId, role: 'TEAM_MEMBER', status: 'INACTIVE' }),
    ]);

    return {
      totalTeamMembers,
      activeTeamMembers,
      inactiveTeamMembers,
    };
  }

  /**
   * Paginated, searchable list of team members within the PMO's organization
   *
   * @param {string} organizationId
   * @param {Object} queryOptions
   * @returns {Promise<{ data: Array, pagination: Object }>}
   */
  async getTeamMembers(
    organizationId,
    { page = 1, limit = 20, search = '', status = '', sortBy = 'createdAt', sortOrder = 'desc' } = {}
  ) {
    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      const error = new Error('Invalid organization ID format');
      error.statusCode = 400;
      error.code = 'INVALID_ORGANIZATION_ID';
      throw error;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Strict multi-tenant scope: always lock to organizationId and role TEAM_MEMBER
    const filter = {
      organizationId,
      role: 'TEAM_MEMBER',
    };

    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      filter.status = status.toUpperCase();
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    const validSortFields = ['createdAt', 'name', 'email', 'status', 'lastLoginAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 1 : -1;

    const [total, teamMembers] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limitNum)
        .populate('organizationId', 'name code'),
    ]);

    const data = teamMembers.map((member) => this._formatMember(member));
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
   * Retrieve single team member details (strictly scoped to organization)
   *
   * @param {string} organizationId
   * @param {string} memberId
   * @returns {Promise<Object>}
   */
  async getTeamMemberById(organizationId, memberId) {
    if (!mongoose.Types.ObjectId.isValid(organizationId) || !mongoose.Types.ObjectId.isValid(memberId)) {
      const error = new Error('Invalid ID format');
      error.statusCode = 400;
      error.code = 'INVALID_ID_FORMAT';
      throw error;
    }

    // Resource hiding: strictly query by organizationId and role. If user belongs to another org, return 404
    const member = await User.findOne({
      _id: memberId,
      organizationId,
      role: 'TEAM_MEMBER',
    }).populate('organizationId', 'name code');

    if (!member) {
      const error = new Error('Team member not found');
      error.statusCode = 404;
      error.code = 'TEAM_MEMBER_NOT_FOUND';
      throw error;
    }

    return this._formatMember(member);
  }

  /**
   * Create new team member in PMO's organization
   *
   * @param {string} organizationId
   * @param {Object} data
   * @param {string} performedByUserId
   * @returns {Promise<Object>}
   */
  async createTeamMember(
    organizationId,
    { name, email, phone = '', password, status = 'ACTIVE' },
    performedByUserId
  ) {
    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      const error = new Error('Invalid organization ID format');
      error.statusCode = 400;
      error.code = 'INVALID_ORGANIZATION_ID';
      throw error;
    }

    // 1. Verify organization exists and is active
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      const error = new Error('Organization not found');
      error.statusCode = 404;
      error.code = 'ORGANIZATION_NOT_FOUND';
      throw error;
    }

    if (organization.status !== 'ACTIVE') {
      const error = new Error('Cannot create team members for an inactive or suspended organization');
      error.statusCode = 400;
      error.code = 'ORGANIZATION_INACTIVE';
      throw error;
    }

    // 2. Validate input fields
    if (!name || !name.trim()) {
      const error = new Error('Team member name is required');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    if (!email || !email.trim()) {
      const error = new Error('Team member email is required');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      const error = new Error('Please provide a valid email address');
      error.statusCode = 400;
      error.code = 'INVALID_EMAIL_FORMAT';
      throw error;
    }

    // 3. Unique email check across entire platform
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      const error = new Error(`A user with email '${normalizedEmail}' already exists`);
      error.statusCode = 409;
      error.code = 'EMAIL_ALREADY_EXISTS';
      throw error;
    }

    // 4. Password validation
    if (!password || password.length < 8) {
      const error = new Error('Password must be at least 8 characters long');
      error.statusCode = 400;
      error.code = 'WEAK_PASSWORD';
      throw error;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      const error = new Error(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      );
      error.statusCode = 400;
      error.code = 'WEAK_PASSWORD';
      throw error;
    }

    // 5. Hash password and persist team member
    const passwordHash = await User.hashPassword(password);
    const normalizedStatus = status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const member = await User.create({
      organizationId,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'TEAM_MEMBER',
      phone: phone ? phone.trim() : '',
      status: normalizedStatus,
    });

    // 6. Log audit event
    await auditService.logAction({
      organizationId,
      performedBy: performedByUserId,
      action: 'TEAM_MEMBER_CREATED',
      entityType: 'User',
      entityId: member._id,
      metadata: { name: member.name, email: member.email, role: 'TEAM_MEMBER' },
    });

    return this._formatMember(member);
  }

  /**
   * Update team member details
   *
   * @param {string} organizationId
   * @param {string} memberId
   * @param {Object} updateData
   * @param {string} performedByUserId
   * @returns {Promise<Object>}
   */
  async updateTeamMember(
    organizationId,
    memberId,
    { name, email, phone, status, password },
    performedByUserId
  ) {
    if (!mongoose.Types.ObjectId.isValid(organizationId) || !mongoose.Types.ObjectId.isValid(memberId)) {
      const error = new Error('Invalid ID format');
      error.statusCode = 400;
      error.code = 'INVALID_ID_FORMAT';
      throw error;
    }

    // Resource hiding: strictly find within organization
    const member = await User.findOne({
      _id: memberId,
      organizationId,
      role: 'TEAM_MEMBER',
    }).select('+passwordHash');

    if (!member) {
      const error = new Error('Team member not found');
      error.statusCode = 404;
      error.code = 'TEAM_MEMBER_NOT_FOUND';
      throw error;
    }

    const changes = {};

    if (name && name.trim()) {
      changes.name = { from: member.name, to: name.trim() };
      member.name = name.trim();
    }

    if (email && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
        const error = new Error('Please provide a valid email address');
        error.statusCode = 400;
        error.code = 'INVALID_EMAIL_FORMAT';
        throw error;
      }

      if (normalizedEmail !== member.email) {
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
          const error = new Error(`A user with email '${normalizedEmail}' already exists`);
          error.statusCode = 409;
          error.code = 'EMAIL_ALREADY_EXISTS';
          throw error;
        }
        changes.email = { from: member.email, to: normalizedEmail };
        member.email = normalizedEmail;
      }
    }

    if (phone !== undefined) {
      changes.phone = { from: member.phone, to: phone.trim() };
      member.phone = phone.trim();
    }

    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      const newStatus = status.toUpperCase();
      if (member.status !== newStatus) {
        changes.status = { from: member.status, to: newStatus };
        member.status = newStatus;
        if (newStatus === 'INACTIVE') {
          member.tokenVersion += 1; // Instant session invalidation
        }
      }
    }

    if (password) {
      if (password.length < 8) {
        const error = new Error('Password must be at least 8 characters long');
        error.statusCode = 400;
        error.code = 'WEAK_PASSWORD';
        throw error;
      }

      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecial = /[^A-Za-z0-9]/.test(password);

      if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
        const error = new Error(
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        );
        error.statusCode = 400;
        error.code = 'WEAK_PASSWORD';
        throw error;
      }

      member.passwordHash = await User.hashPassword(password);
      member.tokenVersion += 1; // Revoke existing sessions on password change
      changes.passwordChanged = true;
    }

    await member.save();

    await auditService.logAction({
      organizationId,
      performedBy: performedByUserId,
      action: 'TEAM_MEMBER_UPDATED',
      entityType: 'User',
      entityId: member._id,
      metadata: changes,
    });

    return this._formatMember(member);
  }

  /**
   * Activate or deactivate a team member
   *
   * @param {string} organizationId
   * @param {string} memberId
   * @param {string} status
   * @param {string} performedByUserId
   * @returns {Promise<Object>}
   */
  async updateTeamMemberStatus(organizationId, memberId, status, performedByUserId) {
    if (!mongoose.Types.ObjectId.isValid(organizationId) || !mongoose.Types.ObjectId.isValid(memberId)) {
      const error = new Error('Invalid ID format');
      error.statusCode = 400;
      error.code = 'INVALID_ID_FORMAT';
      throw error;
    }

    const normalizedStatus = status?.toUpperCase();
    if (!['ACTIVE', 'INACTIVE'].includes(normalizedStatus)) {
      const error = new Error('Status must be either ACTIVE or INACTIVE');
      error.statusCode = 400;
      error.code = 'INVALID_STATUS';
      throw error;
    }

    const member = await User.findOne({
      _id: memberId,
      organizationId,
      role: 'TEAM_MEMBER',
    });

    if (!member) {
      const error = new Error('Team member not found');
      error.statusCode = 404;
      error.code = 'TEAM_MEMBER_NOT_FOUND';
      throw error;
    }

    const oldStatus = member.status;
    if (oldStatus !== normalizedStatus) {
      member.status = normalizedStatus;
      if (normalizedStatus === 'INACTIVE') {
        member.tokenVersion += 1; // Instant session invalidation
      }
      await member.save();

      const action = normalizedStatus === 'ACTIVE' ? 'TEAM_MEMBER_ACTIVATED' : 'TEAM_MEMBER_DEACTIVATED';
      await auditService.logAction({
        organizationId,
        performedBy: performedByUserId,
        action,
        entityType: 'User',
        entityId: member._id,
        metadata: { previousStatus: oldStatus, newStatus: normalizedStatus },
      });
    }

    return this._formatMember(member);
  }

  /**
   * Formats a User document into a safe team member object
   */
  _formatMember(member) {
    const json = member.toJSON();
    return {
      id: json.id,
      name: json.name,
      email: json.email,
      phone: json.phone || '',
      role: json.role,
      status: json.status,
      organizationId: json.organizationId,
      organization: json.organization || null,
      lastLoginAt: json.lastLoginAt,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
    };
  }
}

export const teamMemberService = new TeamMemberService();
export default teamMemberService;
