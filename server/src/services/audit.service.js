import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import { escapeRegex } from '../utils/tenant.js';

// List of sensitive property patterns that must never be stored in audit logs
const SENSITIVE_KEY_REGEX = /password|passwordhash|accesstoken|refreshtoken|jwt|cookie|secret|apikey|clientsecret|privatekey|token|authorization/i;

class AuditService {
  /**
   * Recursively sanitizes data objects, stripping or redacting sensitive fields
   */
  sanitizeData(data) {
    if (data === null || data === undefined) return data;

    // Convert Mongoose document or custom object to plain object
    let val = data;
    if (typeof val === 'object' && val.toObject && typeof val.toObject === 'function') {
      val = val.toObject();
    }

    if (Array.isArray(val)) {
      return val.map((item) => this.sanitizeData(item));
    }

    if (typeof val === 'object' && val.constructor === Object) {
      const sanitized = {};
      for (const [key, value] of Object.entries(val)) {
        if (SENSITIVE_KEY_REGEX.test(key)) {
          sanitized[key] = '[REDACTED]';
        } else if (value !== null && typeof value === 'object') {
          sanitized[key] = this.sanitizeData(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }

    return val;
  }

  /**
   * Generates a minimal diff containing only changed properties between old and new states
   */
  createDiff(oldVal, newVal) {
    if (!oldVal && !newVal) return { oldValue: null, newValue: null };
    if (!oldVal) return { oldValue: null, newValue: this.sanitizeData(newVal) };
    if (!newVal) return { oldValue: this.sanitizeData(oldVal), newValue: null };

    const cleanOld = this.sanitizeData(oldVal);
    const cleanNew = this.sanitizeData(newVal);

    if (typeof cleanOld !== 'object' || typeof cleanNew !== 'object') {
      return { oldValue: cleanOld, newValue: cleanNew };
    }

    const diffOld = {};
    const diffNew = {};
    const allKeys = new Set([...Object.keys(cleanOld || {}), ...Object.keys(cleanNew || {})]);

    for (const key of allKeys) {
      // Ignore Mongo internal fields or timestamp fields if irrelevant
      if (key === '__v' || key === 'updatedAt') continue;

      const strOld = JSON.stringify(cleanOld[key]);
      const strNew = JSON.stringify(cleanNew[key]);

      if (strOld !== strNew) {
        if (cleanOld[key] !== undefined) diffOld[key] = cleanOld[key];
        if (cleanNew[key] !== undefined) diffNew[key] = cleanNew[key];
      }
    }

    return {
      oldValue: Object.keys(diffOld).length > 0 ? diffOld : null,
      newValue: Object.keys(diffNew).length > 0 ? diffNew : null,
    };
  }

  /**
   * Log an audit event securely
   *
   * @param {Object} params
   * @param {string|null} [params.organizationId] - Associated organization ID
   * @param {string} [params.performedBy] - User ID of actor
   * @param {string} [params.userId] - Alias for performedBy
   * @param {string} params.action - Action identifier (e.g. COMPANY_CREATED)
   * @param {string} [params.entityType] - Target entity type (e.g. Company)
   * @param {string} [params.entity] - Alias for entityType
   * @param {string|null} [params.entityId] - Target entity ID
   * @param {Object|null} [params.oldValue] - Pre-mutation state
   * @param {Object|null} [params.newValue] - Post-mutation state
   * @param {Object} [params.metadata] - Supplemental details
   * @param {Object} [options] - Optional settings (e.g. session)
   * @returns {Promise<Object|null>}
   */
  async logAction(params, options = {}) {
    try {
      const {
        organizationId = null,
        performedBy,
        userId,
        action,
        entityType,
        entity,
        entityId = null,
        oldValue = null,
        newValue = null,
        metadata = {},
      } = params;

      const actorId = performedBy || userId;
      const typeName = entityType || entity;

      if (!actorId || !action || !typeName) {
        console.warn('[AuditService] Missing required fields (actorId, action, entityType). Skipping audit record.');
        return null;
      }

      // Sanitize all payload sections
      const sanitizedOld = this.sanitizeData(oldValue);
      const sanitizedNew = this.sanitizeData(newValue);
      const sanitizedMeta = this.sanitizeData(metadata);

      const auditData = {
        organizationId: organizationId || null,
        performedBy: actorId,
        action: String(action).toUpperCase().trim(),
        entityType: String(typeName).trim(),
        entityId: entityId || null,
        oldValue: sanitizedOld,
        newValue: sanitizedNew,
        metadata: sanitizedMeta || {},
        timestamp: new Date(),
      };

      let log;
      if (options.session) {
        const createdArray = await AuditLog.create([auditData], { session: options.session });
        log = createdArray[0];
      } else {
        log = await AuditLog.create(auditData);
      }

      return log;
    } catch (error) {
      // Option B: Log error diagnostics cleanly without crashing primary business transaction
      console.error('[AuditService Error] Failed to persist audit record:', error.message);
      return null;
    }
  }

  /**
   * Retrieve paginated, searchable, and filtered audit logs
   */
  async getAuditLogs(params = {}) {
    const {
      organizationId,
      performedBy,
      userId,
      action,
      entityType,
      entity,
      entityId,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 25,
      sortBy = 'timestamp',
      sortOrder = 'desc',
    } = params;

    const query = {};

    // 1. Organization scoping (explicit or derived)
    if (organizationId !== undefined) {
      query.organizationId = organizationId;
    }

    // 2. Actor filter
    const actorFilter = performedBy || userId;
    if (actorFilter) {
      query.performedBy = actorFilter;
    }

    // 3. Action filter
    if (action) {
      query.action = String(action).toUpperCase().trim();
    }

    // 4. Entity Type filter
    const targetEntity = entityType || entity;
    if (targetEntity) {
      query.entityType = String(targetEntity).trim();
    }

    // 5. Entity ID filter
    if (entityId) {
      query.entityId = entityId;
    }

    // 6. Date Range filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.timestamp.$lte = end;
      }
    }

    // 7. Search filter (Action, EntityType, EntityID, or User/Org match)
    if (search && String(search).trim() !== '') {
      const searchStr = String(search).trim();

      // Check if search is a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(searchStr)) {
        query.$or = [
          { _id: searchStr },
          { entityId: searchStr },
          { performedBy: searchStr },
          { organizationId: searchStr },
        ];
      } else {
        const searchRegex = new RegExp(escapeRegex(searchStr), 'i');

        // Look up matching users
        const matchingUsers = await User.find({
          $or: [{ name: searchRegex }, { email: searchRegex }],
        }).select('_id');

        // Look up matching organizations
        const matchingOrgs = await Organization.find({
          $or: [{ name: searchRegex }, { code: searchRegex }],
        }).select('_id');

        const userIds = matchingUsers.map((u) => u._id);
        const orgIds = matchingOrgs.map((o) => o._id);

        const searchConditions = [
          { action: searchRegex },
          { entityType: searchRegex },
        ];

        if (userIds.length > 0) {
          searchConditions.push({ performedBy: { $in: userIds } });
        }
        if (orgIds.length > 0) {
          searchConditions.push({ organizationId: { $in: orgIds } });
        }

        query.$or = searchConditions;
      }
    }

    // 8. Pagination calculation
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    // Valid sort fields
    const validSortFields = ['timestamp', 'action', 'entityType', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'timestamp';
    const sortDirection = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;

    // Execute query with population
    const [items, total] = await Promise.all([
      AuditLog.find(query)
        .populate('performedBy', 'name email role')
        .populate('organizationId', 'name code')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limitNum)
        .lean({ virtuals: true }),
      AuditLog.countDocuments(query),
    ]);

    // Format output items safely
    const formattedItems = items.map((item) => {
      const id = item._id ? item._id.toString() : item.id;
      return {
        id,
        _id: id,
        organizationId: item.organizationId
          ? {
              id: item.organizationId._id ? item.organizationId._id.toString() : item.organizationId.id,
              name: item.organizationId.name,
              code: item.organizationId.code,
            }
          : null,
        performedBy: item.performedBy
          ? {
              id: item.performedBy._id ? item.performedBy._id.toString() : item.performedBy.id,
              name: item.performedBy.name,
              email: item.performedBy.email,
              role: item.performedBy.role,
            }
          : null,
        userId: item.performedBy
          ? {
              id: item.performedBy._id ? item.performedBy._id.toString() : item.performedBy.id,
              name: item.performedBy.name,
              email: item.performedBy.email,
              role: item.performedBy.role,
            }
          : null,
        action: item.action,
        entityType: item.entityType,
        entity: item.entityType,
        entityId: item.entityId ? item.entityId.toString() : null,
        oldValue: item.oldValue || null,
        newValue: item.newValue || null,
        metadata: item.metadata || {},
        timestamp: item.timestamp,
      };
    });

    return {
      items: formattedItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Retrieve single audit log details by ID with authorization checks
   */
  async getAuditLogById(id, { user }) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('Invalid audit log ID format');
      error.statusCode = 400;
      error.code = 'INVALID_ID';
      throw error;
    }

    const log = await AuditLog.findById(id)
      .populate('performedBy', 'name email role')
      .populate('organizationId', 'name code')
      .lean({ virtuals: true });

    if (!log) {
      const error = new Error('Audit log record not found');
      error.statusCode = 404;
      error.code = 'AUDIT_LOG_NOT_FOUND';
      throw error;
    }

    // PMO Tenant Scoping Enforcement
    if (user.role === 'PMO') {
      const userOrgId = user.organizationId ? user.organizationId.toString() : null;
      const logOrgId = log.organizationId ? log.organizationId._id ? log.organizationId._id.toString() : log.organizationId.toString() : null;

      if (!logOrgId || logOrgId !== userOrgId) {
        // Resource hiding for multi-tenant isolation
        const error = new Error('Audit log record not found');
        error.statusCode = 404;
        error.code = 'AUDIT_LOG_NOT_FOUND';
        throw error;
      }
    }

    const logId = log._id ? log._id.toString() : log.id;

    return {
      id: logId,
      _id: logId,
      organizationId: log.organizationId
        ? {
            id: log.organizationId._id ? log.organizationId._id.toString() : log.organizationId.id,
            name: log.organizationId.name,
            code: log.organizationId.code,
          }
        : null,
      performedBy: log.performedBy
        ? {
            id: log.performedBy._id ? log.performedBy._id.toString() : log.performedBy.id,
            name: log.performedBy.name,
            email: log.performedBy.email,
            role: log.performedBy.role,
          }
        : null,
      userId: log.performedBy
        ? {
            id: log.performedBy._id ? log.performedBy._id.toString() : log.performedBy.id,
            name: log.performedBy.name,
            email: log.performedBy.email,
            role: log.performedBy.role,
          }
        : null,
      action: log.action,
      entityType: log.entityType,
      entity: log.entityType,
      entityId: log.entityId ? log.entityId.toString() : null,
      oldValue: log.oldValue || null,
      newValue: log.newValue || null,
      metadata: log.metadata || {},
      timestamp: log.timestamp,
    };
  }
}

export const auditService = new AuditService();
export default auditService;
