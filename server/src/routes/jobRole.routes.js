import { Router } from 'express';
import jobRoleController from '../controllers/jobRole.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const pmoRouter = Router();
const userRouter = Router();

// PMO Routes: requires authentication + PMO role
pmoRouter.use(requireAuth, requireRole('PMO'));
pmoRouter.get('/', jobRoleController.getJobRoles);
pmoRouter.post('/', jobRoleController.createJobRole);
pmoRouter.patch('/:id', jobRoleController.updateJobRole);
pmoRouter.patch('/:id/status', jobRoleController.updateJobRoleStatus);

// User Selection Routes: requires authentication (PMO or TEAM_MEMBER)
userRouter.use(requireAuth);
userRouter.get('/active', jobRoleController.getActiveJobRoles);

export { pmoRouter as pmoJobRoleRoutes, userRouter as userJobRoleRoutes };
export default pmoRouter;
