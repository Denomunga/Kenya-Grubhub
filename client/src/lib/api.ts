import { CSRFTokenManager } from './csrf';

export const API_BASE_URL = import.meta.env?.VITE_API_URL || 'https://kenya-grubhub.onrender.com';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  return CSRFTokenManager.fetchWithCSRF(
    endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`,
    options
  );
}