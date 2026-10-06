import { Router } from 'express';
import teamMemberController from '../controllers/teamMember.controller.js';
import interactionController from '../controllers/interaction.controller.js';
import followUpController from '../controllers/followUp.controller.js';
import pmoAnalyticsController from '../controllers/pmoAnalytics.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

// Protect ALL PMO endpoints: requires authenticated user with PMO role
router.use(requireAuth, requireRole('PMO'));

// PMO Dashboard Analytics & Statistics
router.get('/dashboard', pmoAnalyticsController.getDashboardAnalytics);
router.get('/dashboard/stats', teamMemberController.getDashboardStats);

// Team member management endpoints
router.get('/team-members', teamMemberController.listTeamMembers);
router.post('/team-members', teamMemberController.createTeamMember);
router.get('/team-members/:id', teamMemberController.getTeamMember);
router.patch('/team-members/:id', teamMemberController.updateTeamMember);
router.patch('/team-members/:id/status', teamMemberController.updateTeamMemberStatus);

// Organization-wide interactions visibility
router.get('/interactions', interactionController.getPMOInteractions);
router.get('/interactions/:id', interactionController.getInteractionById);

// Organization-wide follow-ups visibility & monitoring
router.get('/follow-ups/stats', followUpController.getFollowUpStats);
router.get('/follow-ups', followUpController.getPMOFollowUps);
router.get('/follow-ups/:id', followUpController.getPMOFollowUpById);

export default router;
