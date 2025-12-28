import { API_BASE_URL } from './api';

// CSRF token management for client-side

export class CSRFTokenManager {
  private static token: string | null = null;

  // Get CSRF token (disabled - returns null)
  static getToken(): string | null {
    return null; // CSRF protection disabled
  }

  // Set CSRF token (disabled)
  static setToken(token: string): void {
    // No-op - CSRF protection disabled
  }

  // Clear token (disabled)
  static clearToken(): void {
    // No-op - CSRF protection disabled
  }

  // Add CSRF token to headers (disabled)
  static addTokenToHeaders(headers: Record<string, string>): Record<string, string> {
    return headers; // No CSRF token added
  }

  // Fetch wrapper without CSRF (disabled)
  static async fetchWithCSRF(url: string, options: RequestInit = {}): Promise<Response> {
    const config: RequestInit = {
      credentials: 'include',
      ...options,
    };

    return fetch(url, config);
  }

  // Initialize CSRF token (disabled)
  static async initializeToken(): Promise<void> {
    // No-op - CSRF protection disabled
  }
}

// Hook for React components
export const useCSRF = () => {
  const getToken = () => CSRFTokenManager.getToken();
  const addTokenToHeaders = (headers: Record<string, string>) => 
    CSRFTokenManager.addTokenToHeaders(headers);

  return {
    getToken,
    addTokenToHeaders,
    fetchWithCSRF: CSRFTokenManager.fetchWithCSRF.bind(CSRFTokenManager)
  };
};
