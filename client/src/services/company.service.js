import api from './api';

export const companyService = {
  /**
   * Fetch summary metrics for Company Master
   */
  async getCompanyStats() {
    const response = await api.get('/companies/stats');
    return response;
  },

  /**
   * List companies with pagination, search, status/industry/city filters, and org filter (for Super Admin)
   */
  async getCompanies(params = {}) {
    const response = await api.get('/companies', { params });
    return response;
  },

  /**
   * Export companies to Excel (.xlsx)
   */
  async exportCompanies(params = {}) {
    const response = await api.get('/companies/export', {
      params,
      responseType: 'blob',
    });
    return response;
  },

  /**
   * Get single company details with primary contact and metadata
   */
  async getCompany(id) {
    const response = await api.get(`/companies/${id}`);
    return response;
  },

  /**
   * Create new company record
   */
  async createCompany(data) {
    const response = await api.post('/companies', data);
    return response;
  },

  /**
   * Update existing company details
   */
  async updateCompany(id, data) {
    const response = await api.patch(`/companies/${id}`, data);
    return response;
  },

  /**
   * Toggle company status (ACTIVE / INACTIVE)
   */
  async updateCompanyStatus(id, status) {
    const response = await api.patch(`/companies/${id}/status`, { status });
    return response;
  },

  /**
   * Delete single company
   */
  async deleteCompany(id) {
    const response = await api.delete(`/companies/${id}`);
    return response;
  },

  /**
   * Bulk delete selected companies
   */
  async bulkDeleteCompanies(companyIds = []) {
    const response = await api.post('/companies/bulk-delete', { companyIds });
    return response;
  },
};

export default companyService;
