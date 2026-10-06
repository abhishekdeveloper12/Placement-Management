/**
 * Multi-Tenant Query and Scope Helpers
 *
 * Provides reusable query builders to enforce tenant isolation across all services
 */

/**
 * Builds a database query filter enforcing organization scoping
 *
 * @param {Object} req - Express request object containing verified req.user
 * @param {Object} [baseQuery={}] - Initial query conditions
 * @returns {Object} Database query with injected organizationId condition
 */
export const buildTenantQuery = (req, baseQuery = {}) => {
  if (!req.user) {
    throw new Error('Tenant query helper called without authenticated req.user context');
  }

  // SUPER_ADMIN: Can view all tenants or filter by explicitly selected organization
  if (req.user.role === 'SUPER_ADMIN') {
    if (req.tenantId) {
      return { ...baseQuery, organizationId: req.tenantId };
    }
    return { ...baseQuery };
  }

  // PMO & TEAM_MEMBER: Strictly bound to their authenticated organizationId
  return {
    ...baseQuery,
    organizationId: req.user.organizationId,
  };
};

/**
 * Enforces that an existing document belongs to the authenticated user's organization
 *
 * @param {Object} document - Retrieved database document with organizationId
 * @param {Object} req - Express request object containing verified req.user
 * @returns {boolean} True if access is permitted, throws or returns false otherwise
 */
export const assertTenantOwnership = (document, req) => {
  if (!document || !req.user) return false;

  if (req.user.role === 'SUPER_ADMIN') return true;

  if (!document.organizationId) return false;

  const docOrgId = document.organizationId._id
    ? document.organizationId._id.toString()
    : document.organizationId.toString();

  return docOrgId === req.user.organizationId.toString();
};

/**
 * Escapes special regex characters in user search inputs to prevent regex syntax errors or injection
 *
 * @param {string} str - User-supplied search or filter string
 * @returns {string} Sanitized string safe for new RegExp() or $regex queries
 */
export const escapeRegex = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

