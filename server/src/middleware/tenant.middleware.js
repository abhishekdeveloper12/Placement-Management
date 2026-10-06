import { errorResponse } from '../utils/apiResponse.js';

/**
 * Multi-Tenant Scoping Middleware
 *
 * Enforces strict tenant boundaries:
 * 1. For PMO and TEAM_MEMBER:
 *    - organizationId is locked to req.user.organizationId.
 *    - If the client attempts to pass a differing organizationId in body, query, or params,
 *      the request is immediately rejected with a 403 Cross-Tenant Forbidden error.
 * 2. For SUPER_ADMIN:
 *    - Permitted to view cross-tenant data or scope down to a specific organization via query/body.
 */
export const enforceTenantScope = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 401, 'Authentication required before tenant scoping', 'UNAUTHENTICATED');
  }

  const userRole = req.user.role;
  const userOrgId = req.user.organizationId;

  // SUPER_ADMIN has global platform scope
  if (userRole === 'SUPER_ADMIN') {
    req.tenantId = req.query.organizationId || req.body.organizationId || req.params.organizationId || null;
    req.isGlobalScope = true;
    return next();
  }

  // Tenant-scoped roles: PMO and TEAM_MEMBER
  if (!userOrgId) {
    return errorResponse(res, 403, 'User account is not bound to a valid organization', 'TENANT_NOT_ASSIGNED');
  }

  // Check if client tried to manipulate or inject a different organizationId
  const candidateOrgId = req.body?.organizationId || req.query?.organizationId || req.params?.organizationId;

  if (candidateOrgId && candidateOrgId.toString() !== userOrgId.toString()) {
    console.warn(`[Security Alert] Cross-tenant access attempt by user ${req.user.id} (Org: ${userOrgId}) targeting Org: ${candidateOrgId}`);
    return errorResponse(
      res,
      403,
      'Access denied: You are not authorized to view or mutate records belonging to another organization',
      'CROSS_TENANT_ACCESS_DENIED'
    );
  }

  // Lock tenant ID strictly to server-derived user context
  req.tenantId = userOrgId;
  req.isGlobalScope = false;

  // Ensure body payloads cannot poison tenant ownership
  if (req.body && typeof req.body === 'object') {
    req.body.organizationId = userOrgId;
  }

  next();
};
