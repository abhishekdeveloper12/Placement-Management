import { Router } from 'express';
import { getAuditLogs, getAuditLogById } from '../controllers/auditLog.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';

const router = Router();

// All audit log endpoints require authentication and administrative authorization
router.use(requireAuth);
router.use(requireRole(['SUPER_ADMIN', 'PMO']));

/**
 * @route GET /api/audit-logs
 * @desc Get paginated, searchable, and filtered audit logs
 * @access Private (SUPER_ADMIN, PMO)
 */
router.get('/', getAuditLogs);

/**
 * @route GET /api/audit-logs/:id
 * @desc Get single audit log record details
 * @access Private (SUPER_ADMIN, PMO)
 */
router.get('/:id', getAuditLogById);

export default router;
