// CSRF token management for client-side

export class CSRFTokenManager {
  private static token: string | null = null;
  private static readonly TOKEN_KEY = 'csrf_token';

  // Get CSRF token
  static getToken(): string | null {
    return this.token || localStorage.getItem(this.TOKEN_KEY);
  }

  // Set CSRF token
  static setToken(token: string): void {
    this.token = token;
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  // Clear token
  static clearToken(): void {
    this.token = null;
    localStorage.removeItem(this.TOKEN_KEY);
  }

  // Add CSRF token to headers
  static addTokenToHeaders(headers: Record<string, string>): Record<string, string> {
    const token = this.getToken();
    if (token) {
      return {
        ...headers,
        'X-CSRF-Token': token,
      };
    }
    return headers;
  }

  // Fetch wrapper with CSRF
  static async fetchWithCSRF(url: string, options: RequestInit = {}): Promise<Response> {
    const config: RequestInit = {
      credentials: 'include',
      ...options,
    };

    const token = this.getToken();
    if (token) {
      config.headers = {
        ...config.headers,
        'X-CSRF-Token': token,
      };
    }

    return fetch(url, config);
  }

  // Initialize CSRF token
  static async initializeToken(): Promise<void> {
    try {
      const response = await fetch(`${import.meta.env?.VITE_API_URL || 'https://kenya-grubhub-server.onrender.com'}/api/csrf-token`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        this.setToken(data.token);
      }
    } catch (error) {
      console.warn('Failed to initialize CSRF token:', error);
    }
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
