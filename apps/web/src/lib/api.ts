import axios from 'axios';

const api = axios.create({
  // Points to your live Vercel backend API v1
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://sokopoint.vercel.app/api/v1',
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Attach auth token if available
    const token = localStorage.getItem('vora_token'); 
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // CRITICAL: Attach tenant header so the backend returns 'demo-tenant' products
    const tenantId = localStorage.getItem('tenantId') || 'demo-tenant';
    config.headers['x-tenant-id'] = tenantId;
  }
  return config;
});

export default api;