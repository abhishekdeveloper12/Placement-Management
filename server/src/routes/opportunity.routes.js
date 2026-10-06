import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import uploadJd from '../middleware/uploadJd.middleware.js';
import opportunityController from '../controllers/opportunity.controller.js';

const router = Router();

// All opportunity routes require authentication
router.use(requireAuth);

// Job Opportunity CRUD
router.get('/', opportunityController.getOpportunities);
router.get('/:id', opportunityController.getOpportunityById);
router.post('/', opportunityController.createOpportunity);
router.patch('/:id', opportunityController.updateOpportunity);
router.delete('/:id', opportunityController.deleteOpportunity);

// Job Description (JD) Document Attachment Routes
router.post('/:id/jd', uploadJd.single('jd'), opportunityController.uploadOrReplaceJD);
router.delete('/:id/jd', opportunityController.deleteJD);
router.get('/:id/jd', opportunityController.downloadJD);

// Job Opportunity Shortlisting (PMO / Super Admin)
router.patch('/:id/shortlist', opportunityController.shortlistOpportunity);

export default router;
