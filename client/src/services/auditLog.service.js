import api from './api';

export const auditLogService = {
  /**
   * Fetch paginated and filtered audit logs
   */
  async getAuditLogs(params = {}) {
    const response = await api.get('/audit-logs', { params });
    return response;
  },

  /**
   * Fetch single audit log record details
   */
  async getAuditLogById(id) {
    const response = await api.get(`/audit-logs/${id}`);
    return response;
  },
};

export default auditLogService;
