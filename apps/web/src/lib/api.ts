import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://sokopoint.vercel.app/api/v1',
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('vora_token'); 
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const tenantId = localStorage.getItem('tenantId') || 'demo-tenant';
    
    // 1. Send via Header (Primary)
    config.headers['x-tenant-id'] = tenantId;

    // 2. BACKUP SAFETY for GET requests: Attach as query param if CORS strips headers
    if (config.method === 'get') {
      config.params = { tenantId, ...(config.params || {}) };
    }

    // 3. BACKUP SAFETY for POST/PUT requests: Attach to JSON body payloads
    if (['post', 'put', 'patch'].includes(config.method || '') && config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
      config.data = { tenantId, ...config.data };
    }
  }
  return config;
});

export default api;