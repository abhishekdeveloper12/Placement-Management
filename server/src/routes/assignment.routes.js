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

// Matching Company IDs lookup across pages
router.post('/matching-company-ids', assignmentController.getMatchingCompanyIds);

// Quick bulk assignment by quantity (preview & execute)
router.post('/preview-quantity', assignmentController.previewQuantityAssignment);
router.post('/assign-quantity', assignmentController.assignByQuantity);

// Multi-member distribution (preview & execute)
router.post('/preview-distribution', assignmentController.previewDistribution);
router.post('/execute-distribution', assignmentController.executeDistribution);

// Reassign Company
router.patch('/:companyId/reassign', assignmentController.reassignCompany);

// Unassign Company
router.patch('/:companyId/unassign', assignmentController.unassignCompany);

// History Lookup
router.get('/history/:companyId', assignmentController.getCompanyAssignmentHistory);

export default router;
