import auditService from '../services/audit.service.js';

/**
 * GET /api/audit-logs
 * Retrieve paginated, searchable, and filtered audit logs
 * Restricted to SUPER_ADMIN and PMO roles
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      search,
      action,
      entityType,
      entity,
      entityId,
      performedBy,
      userId,
      startDate,
      endDate,
      organizationId: clientOrgId,
      sortBy,
      sortOrder,
    } = req.query;

    let targetOrganizationId;

    if (req.user.role === 'PMO') {
      // Server-side identity enforcement: PMO is strictly locked to their organization
      targetOrganizationId = req.user.organizationId ? req.user.organizationId.toString() : null;
    } else if (req.user.role === 'SUPER_ADMIN') {
      // Super Admin can filter by specific organization or view platform-wide logs
      if (clientOrgId === 'global' || clientOrgId === 'null') {
        targetOrganizationId = null;
      } else if (clientOrgId) {
        targetOrganizationId = clientOrgId;
      } else {
        targetOrganizationId = undefined; // Returns logs across all organizations
      }
    }

    const result = await auditService.getAuditLogs({
      organizationId: targetOrganizationId,
      performedBy: performedBy || userId,
      action,
      entityType: entityType || entity,
      entityId,
      search,
      startDate,
      endDate,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    return res.status(200).json({
      success: true,
      message: 'Audit logs retrieved successfully',
      data: result.items,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/audit-logs/:id
 * Retrieve details for a single audit log record
 * Restricted to SUPER_ADMIN and PMO roles
 */
export const getAuditLogById = async (req, res, next) => {
  try {
    const log = await auditService.getAuditLogById(req.params.id, { user: req.user });

    return res.status(200).json({
      success: true,
      message: 'Audit log record retrieved successfully',
      data: log,
    });
  } catch (error) {
    next(error);
  }
};
