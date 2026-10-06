import api from './api';

export const superAdminService = {
  /**
   * Fetch aggregate platform stats for dashboard
   */
  async getDashboardStats() {
    const response = await api.get('/super-admin/dashboard/stats');
    return response;
  },

  /**
   * Fetch global platform-wide analytics across all organizations
   * GET /api/super-admin/dashboard
   */
  async getGlobalDashboardAnalytics(params = {}) {
    const response = await api.get('/super-admin/dashboard', { params });
    return response;
  },

  /**
   * Fetch organization-scoped drill-down analytics for Super Admin
   * GET /api/super-admin/organizations/:organizationId/analytics
   */
  async getOrganizationAnalytics(organizationId) {
    const response = await api.get(`/super-admin/organizations/${organizationId}/analytics`);
    return response;
  },

  /**
   * List organizations with pagination, search, status filter
   */
  async getOrganizations(params = {}) {
    const response = await api.get('/super-admin/organizations', { params });
    return response;
  },

  /**
   * Get single organization details with PMO and counts
   */
  async getOrganization(id) {
    const response = await api.get(`/super-admin/organizations/${id}`);
    return response;
  },

  /**
   * Create new organization
   */
  async createOrganization(data) {
    const response = await api.post('/super-admin/organizations', data);
    return response;
  },

  /**
   * Update organization details
   */
  async updateOrganization(id, data) {
    const response = await api.patch(`/super-admin/organizations/${id}`, data);
    return response;
  },

  /**
   * Change organization status (ACTIVE / INACTIVE)
   */
  async updateOrganizationStatus(id, status) {
    const response = await api.patch(`/super-admin/organizations/${id}/status`, { status });
    return response;
  },

  /**
   * Permanently delete an organization and all associated data
   */
  async deleteOrganization(id) {
    const response = await api.delete(`/super-admin/organizations/${id}`);
    return response;
  },

  /**
   * Get organization's primary PMO
   */
  async getOrganizationPmo(organizationId) {
    const response = await api.get(`/super-admin/organizations/${organizationId}/pmo`);
    return response;
  },

  /**
   * Provision primary PMO for organization
   */
  async createOrganizationPmo(organizationId, data) {
    const response = await api.post(`/super-admin/organizations/${organizationId}/pmo`, data);
    return response;
  },

  /**
   * Update PMO details
   */
  async updateOrganizationPmo(organizationId, data) {
    const response = await api.patch(`/super-admin/organizations/${organizationId}/pmo`, data);
    return response;
  },

  /**
   * Toggle PMO status (ACTIVE / INACTIVE)
   */
  async updateOrganizationPmoStatus(organizationId, status) {
    const response = await api.patch(`/super-admin/organizations/${organizationId}/pmo/status`, { status });
    return response;
  },
};

export default superAdminService;
