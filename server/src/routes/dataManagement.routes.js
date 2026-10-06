import express from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
  getDataSummary,
  getTestData,
  deleteTestData,
} from '../controllers/dataManagement.controller.js';

const router = express.Router();

// Strict Super Admin RBAC Protection
router.use(requireAuth);
router.use(requireRole('SUPER_ADMIN'));

// Super Admin Data Management Endpoints
router.get('/summary', getDataSummary);
router.get('/test-data', getTestData);
router.post('/delete-test-data', deleteTestData);

export default router;
