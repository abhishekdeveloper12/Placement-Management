import mongoose from 'mongoose';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import auditService from './audit.service.js';

class PmoService {
  /**
   * Retrieve the primary PMO for an organization
   *
   * @param {string} organizationId
   * @returns {Promise<Object|null>}
   */
  async getOrganizationPmo(organizationId) {
    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      const error = new Error('Invalid organization ID format');
      error.statusCode = 400;
      error.code = 'INVALID_ORGANIZATION_ID';
      throw error;
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      const error = new Error('Organization not found');
      error.statusCode = 404;
      error.code = 'ORGANIZATION_NOT_FOUND';
      throw error;
    }

    const pmo = await User.findOne({ organizationId, role: 'PMO' }).select(
      'name email phone status lastLoginAt createdAt updatedAt'
    );

    if (!pmo) {
      return null;
    }

    return {
      id: pmo._id.toString(),
      name: pmo.name,
      email: pmo.email,
      phone: pmo.phone || '',
      status: pmo.status,
      role: 'PMO',
      organizationId: organizationId.toString(),
      lastLoginAt: pmo.lastLoginAt,
      createdAt: pmo.createdAt,
      updatedAt: pmo.updatedAt,
    };
  }

  /**
   * Onboard the initial primary PMO for an organization
   *
   * @param {string} organizationId
   * @param {Object} pmoData
   * @param {string} performedByUserId
   * @returns {Promise<Object>}
   */
  async createOrganizationPmo(
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
      const error = new Error('Cannot create a PMO for an inactive or suspended organization');
      error.statusCode = 400;
      error.code = 'ORGANIZATION_INACTIVE';
      throw error;
    }

    // 2. Enforce one primary PMO per organization
    const existingPmo = await User.findOne({ organizationId, role: 'PMO' });
    if (existingPmo) {
      const error = new Error(
        'This organization already has a primary PMO assigned. For Phase 1, only one primary PMO per organization is permitted.'
      );
      error.statusCode = 409;
      error.code = 'DUPLICATE_PRIMARY_PMO';
      throw error;
    }

    // 3. Validate inputs
    if (!name || !name.trim()) {
      const error = new Error('PMO full name is required');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    if (!email || !email.trim()) {
      const error = new Error('PMO email is required');
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

    // 4. Validate unique email globally
    const existingEmailUser = await User.findOne({ email: normalizedEmail });
    if (existingEmailUser) {
      const error = new Error(`A user with email '${normalizedEmail}' already exists`);
      error.statusCode = 409;
      error.code = 'EMAIL_ALREADY_EXISTS';
      throw error;
    }

    // 5. Validate password policy
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

    // 6. Securely hash password using existing User method
    const passwordHash = await User.hashPassword(password);
    const normalizedStatus = status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

    // 7. Persist PMO
    const user = await User.create({
      organizationId,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'PMO',
      phone: phone ? phone.trim() : '',
      status: normalizedStatus,
    });

    // 8. Log audit
    await auditService.logAction({
      organizationId,
      performedBy: performedByUserId,
      action: 'PMO_CREATED',
      entityType: 'User',
      entityId: user._id,
      metadata: { name: user.name, email: user.email, role: 'PMO', organizationId: organizationId.toString() },
    });

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      status: user.status,
      organizationId: organizationId.toString(),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Update PMO basic information or credentials
   *
   * @param {string} organizationId
   * @param {Object} updateData
   * @param {string} performedByUserId
   * @returns {Promise<Object>}
   */
  async updateOrganizationPmo(organizationId, { name, phone, password, status }, performedByUserId) {
    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      const error = new Error('Invalid organization ID format');
      error.statusCode = 400;
      error.code = 'INVALID_ORGANIZATION_ID';
      throw error;
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      const error = new Error('Organization not found');
      error.statusCode = 404;
      error.code = 'ORGANIZATION_NOT_FOUND';
      throw error;
    }

    const pmo = await User.findOne({ organizationId, role: 'PMO' }).select('+passwordHash');
    if (!pmo) {
      const error = new Error('No PMO assigned to this organization');
      error.statusCode = 404;
      error.code = 'PMO_NOT_FOUND';
      throw error;
    }

    const changes = {};

    if (name && name.trim()) {
      changes.name = { from: pmo.name, to: name.trim() };
      pmo.name = name.trim();
    }

    if (phone !== undefined) {
      changes.phone = { from: pmo.phone, to: phone.trim() };
      pmo.phone = phone.trim();
    }

    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      const newStatus = status.toUpperCase();
      if (pmo.status !== newStatus) {
        changes.status = { from: pmo.status, to: newStatus };
        pmo.status = newStatus;
        if (newStatus === 'INACTIVE') {
          pmo.tokenVersion += 1; // Invalidate active sessions
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

      pmo.passwordHash = await User.hashPassword(password);
      pmo.tokenVersion += 1; // Revoke previous sessions on password change
      changes.passwordChanged = true;
    }

    await pmo.save();

    await auditService.logAction({
      organizationId,
      performedBy: performedByUserId,
      action: 'PMO_UPDATED',
      entityType: 'User',
      entityId: pmo._id,
      metadata: changes,
    });

    return {
      id: pmo._id.toString(),
      name: pmo.name,
      email: pmo.email,
      role: pmo.role,
      phone: pmo.phone || '',
      status: pmo.status,
      organizationId: organizationId.toString(),
      lastLoginAt: pmo.lastLoginAt,
      createdAt: pmo.createdAt,
      updatedAt: pmo.updatedAt,
    };
  }

  /**
   * Activate or deactivate an organization's PMO
   *
   * @param {string} organizationId
   * @param {string} status
   * @param {string} performedByUserId
   * @returns {Promise<Object>}
   */
  async updateOrganizationPmoStatus(organizationId, status, performedByUserId) {
    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
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

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      const error = new Error('Organization not found');
      error.statusCode = 404;
      error.code = 'ORGANIZATION_NOT_FOUND';
      throw error;
    }

    const pmo = await User.findOne({ organizationId, role: 'PMO' });
    if (!pmo) {
      const error = new Error('No PMO assigned to this organization');
      error.statusCode = 404;
      error.code = 'PMO_NOT_FOUND';
      throw error;
    }

    const oldStatus = pmo.status;
    if (oldStatus === normalizedStatus) {
      return {
        id: pmo._id.toString(),
        name: pmo.name,
        email: pmo.email,
        role: pmo.role,
        phone: pmo.phone || '',
        status: pmo.status,
        organizationId: organizationId.toString(),
      };
    }

    pmo.status = normalizedStatus;
    if (normalizedStatus === 'INACTIVE') {
      pmo.tokenVersion += 1; // Instant session invalidation
    }

    await pmo.save();

    const action = normalizedStatus === 'ACTIVE' ? 'PMO_ACTIVATED' : 'PMO_DEACTIVATED';

    await auditService.logAction({
      organizationId,
      performedBy: performedByUserId,
      action,
      entityType: 'User',
      entityId: pmo._id,
      metadata: { previousStatus: oldStatus, newStatus: normalizedStatus },
    });

    return {
      id: pmo._id.toString(),
      name: pmo.name,
      email: pmo.email,
      role: pmo.role,
      phone: pmo.phone || '',
      status: pmo.status,
      organizationId: organizationId.toString(),
      createdAt: pmo.createdAt,
      updatedAt: pmo.updatedAt,
    };
  }
}

export const pmoService = new PmoService();
export default pmoService;
