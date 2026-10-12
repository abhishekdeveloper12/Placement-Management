import api from './api';

const jobRoleService = {
  /**
   * List paginated job roles for PMO's organization
   */
  getJobRoles: async (params = {}) => {
    const response = await api.get('/pmo/job-roles', { params });
    return response;
  },

  /**
   * Retrieve active job roles for selection in feedback form (Organization scoped)
   */
  getActiveJobRoles: async () => {
    const response = await api.get('/job-roles/active');
    return response;
  },

  /**
   * Create a new job role (PMO only)
   */
  createJobRole: async (roleData) => {
    const response = await api.post('/pmo/job-roles', roleData);
    return response;
  },

  /**
   * Update job role details (PMO only)
   */
  updateJobRole: async (id, updateData) => {
    const response = await api.patch(`/pmo/job-roles/${id}`, updateData);
    return response;
  },

  /**
   * Toggle job role status (ACTIVE / INACTIVE) (PMO only)
   */
  updateJobRoleStatus: async (id, status) => {
    const response = await api.patch(`/pmo/job-roles/${id}/status`, { status });
    return response;
  },

  /**
   * Delete a job role (PMO only, strictly allowed only if usedCount === 0)
   */
  deleteJobRole: async (id) => {
    const response = await api.delete(`/pmo/job-roles/${id}`);
    return response;
  },
};

export default jobRoleService;
