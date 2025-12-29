import { CSRFTokenManager } from './csrf';
import { fetchWithRateLimit } from './rateLimiter';

export const API_BASE_URL = import.meta.env?.VITE_API_URL || 'https://kenya-grubhub-server.onrender.com';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  // Add CSRF token to headers
  const headers = CSRFTokenManager.addTokenToHeaders(options.headers as Record<string, string> || {});
  
  const config: RequestInit = {
    credentials: 'include',
    ...options,
    headers,
  };
  
  return fetchWithRateLimit(url, config);
}