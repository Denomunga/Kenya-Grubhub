export const API_BASE_URL = import.meta.env?.VITE_API_URL || '';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    credentials: 'include',
    headers: { ...defaultHeaders, ...options.headers },
    ...options,
  };

  const response = await fetch(url, config);
  return response;
}