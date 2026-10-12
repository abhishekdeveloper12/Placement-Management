import api from './api';

export const assignmentService = {
  /**
   * Assign or reassign a single company to a Team Member
   */
  async assignCompany(payload) {
    const response = await api.post('/pmo/assignments', payload);
    return response;
  },

  /**
   * Bulk assign multiple companies to a Team Member
   */
  async assignBulkCompanies(payload) {
    const response = await api.post('/pmo/assignments/bulk', payload);
    return response;
  },

  /**
   * Retrieve all matching company IDs for current filters (Select All across pages)
   */
  async getMatchingCompanyIds(filterParams = {}) {
    const response = await api.post('/pmo/assignments/matching-company-ids', filterParams);
    return response;
  },

  /**
   * Preview bulk assignment by quantity
   */
  async previewQuantityAssignment(payload) {
    const response = await api.post('/pmo/assignments/preview-quantity', payload);
    return response;
  },

  /**
   * Execute bulk assignment by quantity
   */
  async assignByQuantity(payload) {
    const response = await api.post('/pmo/assignments/assign-quantity', payload);
    return response;
  },

  /**
   * Preview distribution of companies across multiple team members
   */
  async previewDistribution(payload) {
    const response = await api.post('/pmo/assignments/preview-distribution', payload);
    return response;
  },

  /**
   * Execute distribution of companies across multiple team members
   */
  async executeDistribution(payload) {
    const response = await api.post('/pmo/assignments/execute-distribution', payload);
    return response;
  },

  /**
   * Reassign a company to another Team Member
   */
  async reassignCompany(companyId, payload) {
    const response = await api.patch(`/pmo/assignments/${companyId}/reassign`, payload);
    return response;
  },

  /**
   * Unassign a company (ends active assignment)
   */
  async unassignCompany(companyId, payload = {}) {
    const response = await api.patch(`/pmo/assignments/${companyId}/unassign`, payload);
    return response;
  },

  /**
   * Retrieve chronological assignment history for a company
   */
  async getCompanyAssignmentHistory(companyId) {
    const response = await api.get(`/companies/${companyId}/assignments`);
    return response;
  },

  /**
   * GET /api/team-member/companies
   * Retrieve companies currently assigned to authenticated Team Member
   */
  async getTeamMemberAssignedCompanies(params = {}) {
    const response = await api.get('/team-member/companies', { params });
    return response;
  },

  /**
   * GET /api/team-member/companies/:id
   * Retrieve single assigned company detail for authenticated Team Member
   */
  async getTeamMemberAssignedCompanyDetail(id) {
    const response = await api.get(`/team-member/companies/${id}`);
    return response;
  },
};

export default assignmentService;
