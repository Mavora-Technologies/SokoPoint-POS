import axios from 'axios';

const api = axios.create({
  // Pointed explicitly to your backend PORT=8000
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Matches your AuthContext perfectly
    const token = localStorage.getItem('vora_token'); 
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;