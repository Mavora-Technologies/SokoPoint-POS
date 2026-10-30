import axios from 'axios';

const api = axios.create({
  // Fallback points directly to your production Vercel backend if env var is missing
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://sokopoint.vercel.app/api/v1',
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Attach auth token
    const token = localStorage.getItem('vora_token'); 
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach tenant header so your backend database queries match 'demo-tenant'
    const tenantId = localStorage.getItem('tenantId') || 'demo-tenant';
    config.headers['x-tenant-id'] = tenantId;
  }
  return config;
});

export default api;