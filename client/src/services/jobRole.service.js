import api from './api';

const jobRoleService = {
  /**
   * List paginated job roles for PMO's organization
   */
  getJobRoles: async (params = {}) => {
    const response = await api.get('/pmo/job-roles', { params });
    return response.data;
  },

  /**
   * Retrieve active job roles for selection in feedback form (Organization scoped)
   */
  getActiveJobRoles: async () => {
    const response = await api.get('/job-roles/active');
    return response.data;
  },

  /**
   * Create a new job role (PMO only)
   */
  createJobRole: async (roleData) => {
    const response = await api.post('/pmo/job-roles', roleData);
    return response.data;
  },

  /**
   * Update job role details (PMO only)
   */
  updateJobRole: async (id, updateData) => {
    const response = await api.patch(`/pmo/job-roles/${id}`, updateData);
    return response.data;
  },

  /**
   * Toggle job role status (ACTIVE / INACTIVE) (PMO only)
   */
  updateJobRoleStatus: async (id, status) => {
    const response = await api.patch(`/pmo/job-roles/${id}/status`, { status });
    return response.data;
  },
};

export default jobRoleService;
