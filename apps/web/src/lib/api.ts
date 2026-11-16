import axios from 'axios';

export const api = axios.create({
  // Hakikisha hapa inaenda kwenye live backend URL yako au fallback ya local
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Inachunguza token zote ili kuzuia conflict ya 'vora_token' na 'token'
    const token = localStorage.getItem('vora_token') || localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;