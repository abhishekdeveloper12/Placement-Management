import api from './api';

const dataManagementService = {
  getSummary: async () => {
    const response = await api.get('/super-admin/data-management/summary');
    return response.data;
  },

  getTestData: async (params = {}) => {
    const response = await api.get('/super-admin/data-management/test-data', { params });
    return response.data;
  },

  deleteTestData: async (payload = {}) => {
    const response = await api.post('/super-admin/data-management/delete-test-data', payload);
    return response.data;
  },
};

export default dataManagementService;
