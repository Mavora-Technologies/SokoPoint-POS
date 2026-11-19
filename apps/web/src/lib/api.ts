import axios from 'axios';

const rawEnvUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1').trim();
const cleanedOrigin = rawEnvUrl.replace(/\/+$/, '').replace(/\/api\/v1$/i, '');
const normalizedBaseURL = `${cleanedOrigin}/api/v1`;

export const api = axios.create({
  baseURL: normalizedBaseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  // Prevent accidental double /api/v1/api/v1 if a caller passes /api/v1/...
  if (config.url && /^\/?api\/v1\//i.test(config.url)) {
    config.url = config.url.replace(/^\/?api\/v1/i, '');
  }

  if (typeof window !== 'undefined') {
    const token =
      localStorage.getItem('vora_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('auth_token');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;