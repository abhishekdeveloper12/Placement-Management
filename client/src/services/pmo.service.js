import api from './api';

export const pmoService = {
  /**
   * Fetch team member summary statistics for PMO dashboard
   */
  async getDashboardStats() {
    const response = await api.get('/pmo/dashboard/stats');
    return response;
  },

  /**
   * Fetch consolidated PMO analytics (companies, hiring, follow-ups, team performance, charts)
   * GET /api/pmo/dashboard
   */
  async getDashboardAnalytics(params = {}) {
    const response = await api.get('/pmo/dashboard', { params });
    return response;
  },

  /**
   * List team members with pagination, search, and status filter
   */
  async getTeamMembers(params = {}) {
    const response = await api.get('/pmo/team-members', { params });
    return response;
  },

  /**
   * Get single team member details
   */
  async getTeamMember(id) {
    const response = await api.get(`/pmo/team-members/${id}`);
    return response;
  },

  /**
   * Create new team member
   */
  async createTeamMember(data) {
    const response = await api.post('/pmo/team-members', data);
    return response;
  },

  /**
   * Update team member details
   */
  async updateTeamMember(id, data) {
    const response = await api.patch(`/pmo/team-members/${id}`, data);
    return response;
  },

  /**
   * Toggle team member status (ACTIVE / INACTIVE)
   */
  async updateTeamMemberStatus(id, status) {
    const response = await api.patch(`/pmo/team-members/${id}/status`, { status });
    return response;
  },
};

export default pmoService;
