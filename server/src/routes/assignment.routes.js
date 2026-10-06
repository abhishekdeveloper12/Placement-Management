import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import assignmentController from '../controllers/assignment.controller.js';

const router = Router();

// Protect PMO assignment endpoints with auth and PMO role guard
router.use(requireAuth, requireRole('PMO'));

// Single Assign / Reassign
router.post('/', assignmentController.assignCompany);

// Bulk Company Assignment
router.post('/bulk', assignmentController.assignBulkCompanies);

// Reassign Company
router.patch('/:companyId/reassign', assignmentController.reassignCompany);

// Unassign Company
router.patch('/:companyId/unassign', assignmentController.unassignCompany);

// History Lookup
router.get('/history/:companyId', assignmentController.getCompanyAssignmentHistory);

export default router;
