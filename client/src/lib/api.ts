import { CSRFTokenManager } from './csrf';
import { fetchWithRateLimit } from './rateLimiter';

export const API_BASE_URL = import.meta.env?.VITE_API_URL || 'https://kenya-grubhub-server.onrender.com';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  // Get token (adjust key as needed)
  const token = localStorage.getItem('accessToken'); // or 'token', 'authToken', etc.
  
  const headers = CSRFTokenManager.addTokenToHeaders(options.headers as Record<string, string> || {});
  
  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const config: RequestInit = {
    //credentials: 'include', // keep if cookies are also used
    ...options,
    headers,
  };
  
  return fetchWithRateLimit(url, config);
}