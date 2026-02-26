import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('scl_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => {
    console.log(`[API] ${response.config.method?.toUpperCase()} ${response.config.url} → ${response.status}`);
    return response;
  },
  (error) => {
    const url = error.config?.url || 'unknown';
    const status = error.response?.status || 'network';
    console.error(`[API] ${error.config?.method?.toUpperCase()} ${url} → ${status}`, error.response?.data);
    
    // Only redirect on 401 for non-login endpoints
    if (error.response?.status === 401 && !url.includes('/auth/login')) {
      localStorage.removeItem('scl_token');
      localStorage.removeItem('scl_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
