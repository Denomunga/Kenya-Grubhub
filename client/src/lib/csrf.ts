import { API_BASE_URL } from './api';

// CSRF token management for client-side

export class CSRFTokenManager {
  private static token: string | null = null;

  // Get CSRF token from cookie or header
  static getToken(): string | null {
    if (this.token) {
      return this.token;
    }

    // Try to get from localStorage first
    try {
      const localToken = localStorage.getItem('csrf-token');
      if (localToken) {
        this.token = localToken;
        return localToken;
      }
    } catch (error) {
      // Failed to read CSRF token from localStorage
    }

    // Try to get from cookie (cross-origin might be blocked)
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrf-token') {
          this.token = value;
          return value;
        }
      }
    } catch (error) {
      // Failed to read CSRF token from cookies
    }

    // Try to get from meta tag (server can set this)
    try {
      const metaTag = document.querySelector('meta[name="csrf-token"]');
      if (metaTag) {
        this.token = metaTag.getAttribute('content');
        return this.token;
      }
    } catch (error) {
      // Failed to read CSRF token from meta tag
    }

    return null;
  }

  // Set CSRF token (for when server sends it in response headers)
  static setToken(token: string): void {
    this.token = token;
    
    // Also store in localStorage as backup
    try {
      localStorage.setItem('csrf-token', token);
    } catch (error) {
      // Failed to backup CSRF token to localStorage
    }
  }

  // Clear token
  static clearToken(): void {
    this.token = null;
    try {
      localStorage.removeItem('csrf-token');
    } catch (error) {
      // Failed to clear CSRF token from localStorage
    }
  }

  // Add CSRF token to request headers
  static addTokenToHeaders(headers: Record<string, string>): Record<string, string> {
    const token = this.getToken();
    if (token) {
      return {
        ...headers,
        'X-CSRF-Token': token
      };
    }
    return headers;
  }

  // Fetch wrapper that automatically includes CSRF token
  static async fetchWithCSRF(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getToken();
    
    // Don't set Content-Type for FormData - let browser set it with boundary
    const defaultHeaders: Record<string, string> = options.body instanceof FormData 
      ? {} 
      : { 'Content-Type': 'application/json' };

    // Add CSRF token for state-changing requests
    if (token && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method?.toUpperCase() || 'GET')) {
      defaultHeaders['X-CSRF-Token'] = token;
    }

    const config: RequestInit = {
      credentials: 'include',
      headers: { ...defaultHeaders, ...options.headers },
      ...options,
    };

    const response = await fetch(url, config);

    // Update token if server sends new one in headers
    const newToken = response.headers.get('X-CSRF-Token');
    if (newToken) {
      this.setToken(newToken);
    }

    return response;
  }

  // Initialize CSRF token by making a request to get it
  static async initializeToken(): Promise<void> {
    try {
      // First check if user is authenticated
      const authResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!authResponse.ok) {
        return;
      }
      
      // Get session-based CSRF token
      const csrfResponse = await fetch(`${API_BASE_URL}/api/csrf-token`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (csrfResponse.ok) {
        // Try to get token from header first
        const headerToken = csrfResponse.headers.get('X-CSRF-Token');
        if (headerToken) {
          this.setToken(headerToken);
          return;
        }
        
        // Try to get token from response body
        const data = await csrfResponse.json();
        if (data.csrfToken) {
          this.setToken(data.csrfToken);
          return;
        }
        
        // Try to get from cookie (fallback)
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'csrf-token') {
            this.setToken(value);
            return;
          }
        }
      }
      
    } catch (error) {
      // Failed to initialize CSRF token
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
