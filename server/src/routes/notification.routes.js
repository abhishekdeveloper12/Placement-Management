import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// All notification endpoints require an authenticated user session
router.use(requireAuth);

/**
 * @route GET /api/notifications
 * @desc Get paginated notifications for authenticated user
 * @access Private
 */
router.get('/', getNotifications);

/**
 * @route GET /api/notifications/unread-count
 * @desc Get unread notification count
 * @access Private
 */
router.get('/unread-count', getUnreadCount);

/**
 * @route PATCH /api/notifications/read-all
 * @desc Mark all unread notifications as read
 * @access Private
 */
router.patch('/read-all', markAllAsRead);

/**
 * @route PATCH /api/notifications/:id/read
 * @desc Mark a single notification as read
 * @access Private
 */
router.patch('/:id/read', markAsRead);

export default router;
