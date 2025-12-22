export const API_BASE_URL = import.meta.env?.VITE_API_URL || 'https://kenya-grubhub.onrender.com';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  // Don't set Content-Type for FormData - let browser set it with correct boundary
  const defaultHeaders: Record<string, string> = options.body instanceof FormData 
    ? {} 
    : { 'Content-Type': 'application/json' };

  const config: RequestInit = {
    credentials: 'include',
    headers: { ...defaultHeaders, ...options.headers },
    ...options,
  };

  const response = await fetch(url, config);
  return response;
}