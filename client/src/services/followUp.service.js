import api from './api';

export const followUpService = {
  /**
   * Get follow-up statistics (Team Member or PMO depending on user role/endpoint)
   * GET /api/team-member/follow-ups/stats or GET /api/pmo/follow-ups/stats
   */
  async getTeamMemberFollowUpStats() {
    const response = await api.get('/team-member/follow-ups/stats');
    return response;
  },

  async getPMOFollowUpStats(params = {}) {
    const response = await api.get('/pmo/follow-ups/stats', { params });
    return response;
  },

  /**
   * Get team member follow-ups
   * GET /api/team-member/follow-ups
   */
  async getTeamMemberFollowUps(params = {}) {
    const response = await api.get('/team-member/follow-ups', { params });
    return response;
  },

  /**
   * Get single follow-up by ID (Team Member)
   * GET /api/team-member/follow-ups/:id
   */
  async getTeamMemberFollowUpById(id) {
    const response = await api.get(`/team-member/follow-ups/${id}`);
    return response;
  },

  /**
   * Create a manual follow-up task (Team Member)
   * POST /api/team-member/follow-ups
   */
  async createFollowUp(payload) {
    const response = await api.post('/team-member/follow-ups', payload);
    return response;
  },

  /**
   * Complete a follow-up task (Team Member)
   * PATCH /api/team-member/follow-ups/:id/complete
   */
  async completeFollowUp(id, payload = {}) {
    const response = await api.patch(`/team-member/follow-ups/${id}/complete`, payload);
    return response;
  },

  /**
   * Cancel a follow-up task (Team Member)
   * PATCH /api/team-member/follow-ups/:id/cancel
   */
  async cancelFollowUp(id, payload = {}) {
    const response = await api.patch(`/team-member/follow-ups/${id}/cancel`, payload);
    return response;
  },

  /**
   * Get organization-wide follow-ups (PMO view)
   * GET /api/pmo/follow-ups
   */
  async getPMOFollowUps(params = {}) {
    const response = await api.get('/pmo/follow-ups', { params });
    return response;
  },

  /**
   * Get single follow-up detail (PMO view)
   * GET /api/pmo/follow-ups/:id
   */
  async getPMOFollowUpById(id) {
    const response = await api.get(`/pmo/follow-ups/${id}`);
    return response;
  },
};

export default followUpService;
