import api from './api';

export const notificationService = {
  /**
   * Fetch paginated notifications for the authenticated user
   */
  async getNotifications(params = {}) {
    const response = await api.get('/notifications', { params });
    return response;
  },

  /**
   * Fetch unread notification count
   */
  async getUnreadCount() {
    const response = await api.get('/notifications/unread-count');
    return response;
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(id) {
    const response = await api.patch(`/notifications/${id}/read`);
    return response;
  },

  /**
   * Mark all unread notifications as read
   */
  async markAllAsRead() {
    const response = await api.patch('/notifications/read-all');
    return response;
  },
};

export default notificationService;
