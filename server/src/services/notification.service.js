import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import FollowUp from '../models/FollowUp.js';
import auditService from './audit.service.js';

class NotificationService {
  /**
   * Internal helper to create a system notification safely
   *
   * @param {Object} params
   * @param {string} params.organizationId
   * @param {string} params.recipientId
   * @param {string} params.type
   * @param {string} params.title
   * @param {string} params.message
   * @param {string} [params.entity]
   * @param {string} [params.entityId]
   * @param {Object} [params.metadata]
   * @param {string} [params.deduplicationKey]
   * @returns {Promise<Object|null>}
   */
  async createNotification(params) {
    try {
      const {
        organizationId,
        recipientId,
        type,
        title,
        message,
        entity = null,
        entityId = null,
        metadata = {},
        deduplicationKey = null,
      } = params;

      if (!organizationId || !recipientId || !type || !title || !message) {
        console.warn('[NotificationService] Missing required notification fields. Skipping creation.');
        return null;
      }

      // Verify recipient exists
      const recipient = await User.findById(recipientId);
      if (!recipient) {
        console.warn(`[NotificationService] Recipient user ${recipientId} not found. Skipping notification.`);
        return null;
      }

      // Sanitize text and metadata
      const cleanTitle = String(title).trim();
      const cleanMessage = String(message).trim();
      const cleanMeta = auditService.sanitizeData(metadata);

      const notifData = {
        organizationId,
        recipientId,
        type: String(type).toUpperCase().trim(),
        title: cleanTitle,
        message: cleanMessage,
        entity: entity ? String(entity).trim() : null,
        entityId: entityId || null,
        metadata: cleanMeta || {},
        createdAt: new Date(),
      };

      if (deduplicationKey) {
        notifData.deduplicationKey = String(deduplicationKey).trim();
      }

      const notificationDoc = new Notification(notifData);
      await notificationDoc.save();
      return notificationDoc;
    } catch (error) {
      // Handle MongoDB duplicate key error gracefully for deduplication keys
      if (error.code === 11000 || error.name === 'MongoServerError') {
        console.log('[NotificationService] Duplicate notification blocked by deduplication key:', params.deduplicationKey);
        return null;
      }

      // Failure must never crash the primary business operation
      console.error('[NotificationService Error] Failed to create notification:', error.message);
      return null;
    }
  }

  /**
   * Get paginated notifications for the authenticated user
   */
  async getNotificationsForUser(user, params = {}) {
    const { page = 1, limit = 20, isRead, type } = params;

    // Run dynamic follow-up reminder check before fetching
    await this.checkAndGenerateFollowUpReminders(user);

    // Enforce strict server-side recipient and tenant scoping
    const query = {
      recipientId: user.id,
      organizationId: user.organizationId,
    };

    if (typeof isRead === 'boolean' || isRead === 'true' || isRead === 'false') {
      query.isRead = isRead === 'true' || isRead === true;
    }

    if (type) {
      query.type = String(type).toUpperCase().trim();
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [items, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean({ virtuals: true }),
      Notification.countDocuments(query),
      Notification.countDocuments({
        recipientId: user.id,
        organizationId: user.organizationId,
        isRead: false,
      }),
    ]);

    const formattedItems = items.map((item) => {
      const id = item._id ? item._id.toString() : item.id;
      return {
        id,
        _id: id,
        organizationId: item.organizationId ? item.organizationId.toString() : null,
        recipientId: item.recipientId ? item.recipientId.toString() : null,
        type: item.type,
        title: item.title,
        message: item.message,
        entity: item.entity,
        entityId: item.entityId ? item.entityId.toString() : null,
        isRead: item.isRead,
        readAt: item.readAt,
        metadata: item.metadata || {},
        createdAt: item.createdAt,
      };
    });

    return {
      items: formattedItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      unreadCount,
    };
  }

  /**
   * Get unread notification count for the authenticated user
   */
  async getUnreadCount(user) {
    await this.checkAndGenerateFollowUpReminders(user);

    const count = await Notification.countDocuments({
      recipientId: user.id,
      organizationId: user.organizationId,
      isRead: false,
    });

    return { unreadCount: count };
  }

  /**
   * Mark a single notification as read with strict owner verification
   */
  async markAsRead(user, notificationId) {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      const error = new Error('Invalid notification ID format');
      error.statusCode = 400;
      error.code = 'INVALID_ID';
      throw error;
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      recipientId: user.id,
      organizationId: user.organizationId,
    });

    if (!notification) {
      const error = new Error('Notification not found or access denied');
      error.statusCode = 404;
      error.code = 'NOTIFICATION_NOT_FOUND';
      throw error;
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return notification.toJSON();
  }

  /**
   * Mark all unread notifications as read for the authenticated user
   */
  async markAllAsRead(user) {
    const result = await Notification.updateMany(
      {
        recipientId: user.id,
        organizationId: user.organizationId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    return {
      modifiedCount: result.modifiedCount || 0,
      message: 'All notifications marked as read',
    };
  }

  /**
   * Check pending follow-up tasks and generate DUE / OVERDUE reminders deterministically
   */
  async checkAndGenerateFollowUpReminders(user) {
    try {
      if (!user || !user.organizationId) return;

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const dateKeyStr = now.toISOString().slice(0, 10);

      // Find pending follow-up tasks relevant to user role
      const query = {
        organizationId: user.organizationId,
        status: 'PENDING',
      };

      if (user.role === 'TEAM_MEMBER') {
        query.assignedTo = user.id;
      }

      const pendingFollowUps = await FollowUp.find(query).populate('companyId', 'companyName name');

      for (const followUp of pendingFollowUps) {
        if (!followUp.dueDate || !followUp.assignedTo) continue;

        const dueDate = new Date(followUp.dueDate);
        const companyName = followUp.companyId
          ? followUp.companyId.companyName || followUp.companyId.name || 'Company'
          : 'Company';

        const followUpId = followUp._id.toString();
        const recipientId = followUp.assignedTo.toString();

        if (dueDate >= startOfToday && dueDate <= endOfToday) {
          // Due Today Notification
          const dedupKey = `FOLLOW_UP_DUE_${followUpId}_${dateKeyStr}`;
          await this.createNotification({
            organizationId: followUp.organizationId,
            recipientId,
            type: 'FOLLOW_UP_DUE',
            title: 'Follow-Up Due Today',
            message: `Follow-up call with ${companyName} is scheduled for today.`,
            entity: 'FollowUp',
            entityId: followUp._id,
            metadata: {
              companyName,
              dueDate: followUp.dueDate,
              priority: followUp.priority,
            },
            deduplicationKey: dedupKey,
          });
        } else if (dueDate < startOfToday) {
          // Overdue Notification
          const dedupKey = `FOLLOW_UP_OVERDUE_${followUpId}_${dateKeyStr}`;
          await this.createNotification({
            organizationId: followUp.organizationId,
            recipientId,
            type: 'FOLLOW_UP_OVERDUE',
            title: 'Follow-Up Overdue',
            message: `Scheduled follow-up with ${companyName} is past due. Please update notes or complete task.`,
            entity: 'FollowUp',
            entityId: followUp._id,
            metadata: {
              companyName,
              dueDate: followUp.dueDate,
              priority: followUp.priority,
            },
            deduplicationKey: dedupKey,
          });
        }
      }
    } catch (error) {
      console.error('[NotificationService Error] Follow-up reminder check failed:', error.message);
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
