import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { enforceTenantScope } from '../middleware/tenant.middleware.js';
import { buildTenantQuery } from '../utils/tenant.js';
import { successResponse } from '../utils/apiResponse.js';

const router = Router();

/**
 * Endpoint to test general authentication
 */
router.get('/protected', requireAuth, (req, res) => {
  return successResponse(res, 200, 'Protected endpoint accessed successfully', {
    user: req.user,
  });
});

/**
 * Endpoint to test SUPER_ADMIN authorization
 */
router.get('/super-admin-only', requireAuth, requireRole('SUPER_ADMIN'), (req, res) => {
  return successResponse(res, 200, 'Super admin endpoint accessed successfully', {
    user: req.user,
  });
});

/**
 * Endpoint to test PMO authorization
 */
router.get('/pmo-only', requireAuth, requireRole('PMO'), (req, res) => {
  return successResponse(res, 200, 'PMO endpoint accessed successfully', {
    user: req.user,
  });
});

/**
 * Endpoint to test PMO and SUPER_ADMIN authorization
 */
router.get('/admin-access', requireAuth, requireRole('SUPER_ADMIN', 'PMO'), (req, res) => {
  return successResponse(res, 200, 'Admin access permitted', {
    user: req.user,
  });
});

/**
 * Endpoint to test Multi-Tenant Scoping and Isolation
 * Validates that PMO/Team Member cannot inject or access another tenant's organizationId
 */
router.post('/tenant-action', requireAuth, enforceTenantScope, (req, res) => {
  const query = buildTenantQuery(req);
  return successResponse(res, 200, 'Tenant action executed successfully', {
    effectiveTenantId: req.tenantId,
    queryFilter: query,
    isGlobalScope: req.isGlobalScope,
    body: req.body,
  });
});

export default router;
