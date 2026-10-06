import { errorResponse } from '../utils/apiResponse.js';

/**
 * Role-Based Access Control (RBAC) Middleware
 * Ensures the authenticated user possesses one of the permitted roles
 *
 * @param {...string} allowedRoles - List of allowed roles (e.g., 'SUPER_ADMIN', 'PMO', 'TEAM_MEMBER')
 */
export const requireRole = (...allowedRoles) => {
  const roles = allowedRoles.flat();
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return errorResponse(res, 401, 'Authentication required before role verification', 'UNAUTHENTICATED');
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(
        res,
        403,
        `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
        'FORBIDDEN_ROLE'
      );
    }

    next();
  };
};
