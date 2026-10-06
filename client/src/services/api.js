import axios from 'axios';

// Centralized Axios instance configuration
const baseURL = import.meta.env.VITE_API_URL || 'https://placement-management-rkfx.onrender.com/api';

export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor: Attach access token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('placement_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Extract response data and handle global 401s gracefully
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Format standardized client error structure
    const errorDetails = {
      message: error.response?.data?.error?.message || error.message || 'Network communication error',
      code: error.response?.data?.error?.code || 'NETWORK_ERROR',
      status: error.response?.status || 0,
      details: error.response?.data?.error?.details || [],
    };

    // If 401 error and not a login/logout/refresh request
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data?.data?.accessToken;
        if (newAccessToken) {
          localStorage.setItem('placement_access_token', newAccessToken);
          apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('placement_access_token');
        return Promise.reject(errorDetails);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(errorDetails);
  }
);

/**
 * Health Check API Call
 */
export const getHealthCheck = async () => {
  return await apiClient.get('/health');
};

export default apiClient;
