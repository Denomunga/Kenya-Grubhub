import { fetchWithRateLimit } from './rateLimiter';

export const API_BASE_URL = import.meta.env?.VITE_API_URL || 'https://kenya-grubhub-server.onrender.com';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const config: RequestInit = {
    credentials: 'include',
    ...options,
  };
  
  return fetchWithRateLimit(url, config);
}