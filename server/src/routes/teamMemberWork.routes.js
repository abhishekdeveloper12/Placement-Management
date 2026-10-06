import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import assignmentController from '../controllers/assignment.controller.js';
import * as companyController from '../controllers/company.controller.js';
import interactionController from '../controllers/interaction.controller.js';
import followUpController from '../controllers/followUp.controller.js';

const router = Router();

// Protect all Team Member work routes with auth and TEAM_MEMBER role guard
router.use(requireAuth, requireRole('TEAM_MEMBER'));

// Team Member Assigned Companies Roster, Search & Self-Addition
router.get('/companies', assignmentController.getTeamMemberAssignedCompanies);
router.post('/companies', companyController.createCompany);
router.get('/companies/:id', assignmentController.getTeamMemberAssignedCompanyDetail);

// Team Member Follow-Up Task Management
router.get('/follow-ups/stats', followUpController.getFollowUpStats);
router.get('/follow-ups', followUpController.getTeamMemberFollowUps);
router.get('/follow-ups/:id', followUpController.getFollowUpById);
router.post('/follow-ups', followUpController.createFollowUp);
router.patch('/follow-ups/:id/complete', followUpController.completeFollowUp);
router.patch('/follow-ups/:id/cancel', followUpController.cancelFollowUp);

// Team Member Interactions & Outreach History
router.get('/outreach/stats', interactionController.getTeamMemberOutreachStats.bind(interactionController));
router.get('/outreach', interactionController.getTeamMemberInteractions.bind(interactionController));
router.get('/outreach/:id', interactionController.getInteractionById.bind(interactionController));
router.get('/interactions', interactionController.getTeamMemberInteractions.bind(interactionController));
router.get('/interactions/:id', interactionController.getInteractionById.bind(interactionController));
router.post('/companies/:companyId/interactions', interactionController.recordCallInteraction.bind(interactionController));
router.get('/companies/:companyId/interactions', interactionController.getTeamMemberCompanyInteractions.bind(interactionController));
router.get('/companies/:companyId/outreach-summary', interactionController.getCompanyOutreachSummary.bind(interactionController));

export default router;
