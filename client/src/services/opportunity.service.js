import api from './api';

export const opportunityService = {
  /**
   * Get job opportunities list with filtering and pagination
   * GET /api/opportunities
   */
  async getOpportunities(params = {}) {
    const response = await api.get('/opportunities', { params });
    return response;
  },

  /**
   * Get single opportunity detail by ID
   * GET /api/opportunities/:id
   */
  async getOpportunityById(id) {
    const response = await api.get(`/opportunities/${id}`);
    return response;
  },

  /**
   * Create a new job opportunity
   * POST /api/opportunities
   */
  async createOpportunity(payload) {
    const response = await api.post('/opportunities', payload);
    return response;
  },

  /**
   * Update job opportunity
   * PATCH /api/opportunities/:id
   */
  async updateOpportunity(id, payload) {
    const response = await api.patch(`/opportunities/${id}`, payload);
    return response;
  },

  /**
   * Delete or close job opportunity
   * DELETE /api/opportunities/:id
   */
  async deleteOpportunity(id) {
    const response = await api.delete(`/opportunities/${id}`);
    return response;
  },

  /**
   * Upload or replace JD document
   * POST /api/opportunities/:id/jd
   */
  async uploadJdDocument(id, file) {
    const formData = new FormData();
    formData.append('jd', file);

    const response = await api.post(`/opportunities/${id}/jd`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  },

  /**
   * Remove attached JD document
   * DELETE /api/opportunities/:id/jd
   */
  async deleteJdDocument(id) {
    const response = await api.delete(`/opportunities/${id}/jd`);
    return response;
  },

  /**
   * Get download endpoint URL for JD document
   */
  getJdDownloadUrl(id) {
    const baseURL = api.defaults.baseURL || '/api';
    return `${baseURL}/opportunities/${id}/jd`;
  },

  /**
   * Shortlist, unshortlist, or update review note for an opportunity
   * PATCH /api/opportunities/:id/shortlist
   */
  async shortlistOpportunity(id, payload) {
    const response = await api.patch(`/opportunities/${id}/shortlist`, payload);
    return response;
  },
};

export default opportunityService;
