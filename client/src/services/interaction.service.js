import api from './api';

export const interactionService = {
  /**
   * Record a Quick HR Call Interaction (Team Member only)
   * POST /api/team-member/companies/:companyId/interactions
   */
  async recordCallInteraction(companyId, payload) {
    const response = await api.post(`/team-member/companies/${companyId}/interactions`, payload);
    return response;
  },

  /**
   * Get interactions for an assigned company (Team Member view)
   * GET /api/team-member/companies/:companyId/interactions
   */
  async getCompanyInteractions(companyId, params = {}) {
    const response = await api.get(`/team-member/companies/${companyId}/interactions`, { params });
    return response;
  },

  /**
   * Get outreach summary card data for a company
   * GET /api/team-member/companies/:companyId/outreach-summary
   */
  async getCompanyOutreachSummary(companyId) {
    const response = await api.get(`/team-member/companies/${companyId}/outreach-summary`);
    return response;
  },

  /**
   * Get company interactions (PMO / Super Admin view)
   * GET /api/companies/:companyId/interactions
   */
  async getPMOCompanyInteractions(companyId, params = {}) {
    const response = await api.get(`/companies/${companyId}/interactions`, { params });
    return response;
  },

  /**
   * Get organization-wide interactions (PMO view)
   * GET /api/pmo/interactions
   */
  async getPMOInteractions(params = {}) {
    const response = await api.get('/pmo/interactions', { params });
    return response;
  },

  /**
   * Get team member outreach stats & KPI metrics
   * GET /api/team-member/outreach/stats
   */
  async getTeamMemberOutreachStats() {
    const response = await api.get('/team-member/outreach/stats');
    return response;
  },

  /**
   * Get team member interaction history across all assigned companies
   * GET /api/team-member/outreach
   */
  async getTeamMemberInteractions(params = {}) {
    const response = await api.get('/team-member/outreach', { params });
    return response;
  },

  /**
   * Get single interaction by ID (Team Member or PMO)
   * GET /api/team-member/interactions/:id or GET /api/pmo/interactions/:id
   */
  async getInteractionById(id, isPmo = false) {
    const endpoint = isPmo ? `/pmo/interactions/${id}` : `/team-member/interactions/${id}`;
    const response = await api.get(endpoint);
    return response;
  },
};

export default interactionService;
