import api from './api';

const dataManagementService = {
  getSummary: async () => {
    const response = await api.get('/super-admin/data-management/summary');
    return response;
  },

  getTestData: async (params = {}) => {
    const response = await api.get('/super-admin/data-management/test-data', { params });
    return response;
  },

  deleteTestData: async (payload = {}) => {
    const response = await api.post('/super-admin/data-management/delete-test-data', payload);
    return response;
  },
};

export default dataManagementService;
