import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import securityTestRoutes from './security-test.routes.js';
import superAdminRoutes from './superAdmin.routes.js';
import dataManagementRoutes from './dataManagement.routes.js';
import pmoRoutes from './pmo.routes.js';
import companyRoutes from './company.routes.js';
import assignmentRoutes from './assignment.routes.js';
import teamMemberWorkRoutes from './teamMemberWork.routes.js';
import opportunityRoutes from './opportunity.routes.js';
import auditLogRoutes from './auditLog.routes.js';
import notificationRoutes from './notification.routes.js';
import { pmoJobRoleRoutes, userJobRoleRoutes } from './jobRole.routes.js';

const router = Router();

// Health Check Route
router.use('/health', healthRoutes);

// Authentication & Identity Routes
router.use('/auth', authRoutes);

// Super Admin Platform & Organization Management Routes
router.use('/super-admin/data-management', dataManagementRoutes);
router.use('/super-admin', superAdminRoutes);

// PMO Organization & Team Management Routes
router.use('/pmo/job-roles', pmoJobRoleRoutes);
router.use('/pmo', pmoRoutes);
router.use('/pmo/assignments', assignmentRoutes);

// Active Job Roles Selection Route (PMO & Team Member)
router.use('/job-roles', userJobRoleRoutes);

// Team Member Assigned Work Routes
router.use('/team-member', teamMemberWorkRoutes);

// Master Company Directory Routes
router.use('/companies', companyRoutes);

// Job Opportunities & JD Management Routes
router.use('/opportunities', opportunityRoutes);

// Centralized Audit Log Routes
router.use('/audit-logs', auditLogRoutes);

// In-App Notification Center Routes
router.use('/notifications', notificationRoutes);

// Security, RBAC & Multi-Tenant Verification Routes
router.use('/security-test', securityTestRoutes);

/**
 * Future Module Routes (Planned — Not Implemented Yet)
 *
 * router.use('/organizations', organizationRoutes);
 * router.use('/users', userRoutes);
 * router.use('/companies', companyRoutes);
 * router.use('/assignments', assignmentRoutes);
 * router.use('/interactions', interactionRoutes);
 * router.use('/follow-ups', followUpRoutes);
 * router.use('/opportunities', opportunityRoutes);
 * router.use('/documents', documentRoutes);
 * router.use('/analytics', analyticsRoutes);
 */

export default router;
