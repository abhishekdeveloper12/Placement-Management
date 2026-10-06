import apiClient from './api';

export const authService = {
  /**
   * Log in user with credentials
   */
  async login(email, password) {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  /**
   * Fetch current authenticated user's profile
   */
  async getMe() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  /**
   * Log out current user and clear server session
   */
  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('placement_access_token');
    }
  },

  /**
   * Refresh current access token
   */
  async refresh() {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  },
};

export default authService;
