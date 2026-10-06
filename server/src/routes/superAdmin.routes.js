import { Router } from 'express';
import superAdminController from '../controllers/superAdmin.controller.js';
import superAdminAnalyticsController from '../controllers/superAdminAnalytics.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

// Protect ALL super-admin endpoints: requires valid JWT and SUPER_ADMIN role
router.use(requireAuth, requireRole('SUPER_ADMIN'));

// Platform Global Dashboard & Analytics Endpoints
router.get('/dashboard', superAdminAnalyticsController.getGlobalDashboardAnalytics);
router.get('/dashboard/stats', superAdminController.getDashboardStats);

// Organization management endpoints
router.get('/organizations', superAdminController.listOrganizations);
router.post('/organizations', superAdminController.createOrganization);
router.get('/organizations/:id', superAdminController.getOrganization);
router.get('/organizations/:organizationId/analytics', superAdminAnalyticsController.getOrganizationAnalytics);
router.patch('/organizations/:id', superAdminController.updateOrganization);
router.patch('/organizations/:id/status', superAdminController.updateOrganizationStatus);
router.delete('/organizations/:id', superAdminController.deleteOrganization);

// Organization PMO management endpoints
router.get('/organizations/:organizationId/pmo', superAdminController.getOrganizationPmo);
router.post('/organizations/:organizationId/pmo', superAdminController.createOrganizationPmo);
router.patch('/organizations/:organizationId/pmo', superAdminController.updateOrganizationPmo);
router.patch('/organizations/:organizationId/pmo/status', superAdminController.updateOrganizationPmoStatus);

export default router;
