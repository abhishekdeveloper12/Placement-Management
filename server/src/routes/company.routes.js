import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import * as companyController from '../controllers/company.controller.js';
import companyImportRoutes from './companyImport.routes.js';
import assignmentController from '../controllers/assignment.controller.js';
import interactionController from '../controllers/interaction.controller.js';

const router = Router();

// Protect all company endpoints with authentication and allowed roles
router.use(requireAuth);
router.use(requireRole('SUPER_ADMIN', 'PMO', 'TEAM_MEMBER'));

// Bulk Company Import Sub-router (must be mounted before /:id routes)
router.use('/import', companyImportRoutes);

// Excel Export (must be mounted before /:id routes)
router.get('/export', companyController.exportCompanies);

// Company Assignment History & Interactions Routes (must be mounted before /:id routes)
router.get('/:companyId/assignments', assignmentController.getCompanyAssignmentHistory);
router.get('/:companyId/interactions', interactionController.getCompanyInteractions);
router.get('/:companyId/outreach-summary', interactionController.getCompanyOutreachSummary);

// Company Statistics
router.get('/stats', companyController.getCompanyStats);

// Directory & List
router.get('/', companyController.getCompanies);
router.post('/', companyController.createCompany);
router.post('/bulk-delete', requireRole('SUPER_ADMIN', 'PMO'), companyController.bulkDeleteCompanies);

// Single Company Operations
router.get('/:id', companyController.getCompanyById);
router.patch('/:id', companyController.updateCompany);
router.patch('/:id/status', companyController.updateCompanyStatus);
router.delete('/:id', requireRole('SUPER_ADMIN', 'PMO'), companyController.deleteCompany);

export default router;
