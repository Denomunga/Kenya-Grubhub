import { API_BASE_URL } from './api';

// CSRF token management for client-side

export class CSRFTokenManager {
  private static token: string | null = null;

  // Get CSRF token from cookie or header
  static getToken(): string | null {
    if (this.token) {
      console.log('Using stored CSRF token:', this.token.substring(0, 8) + '...');
      return this.token;
    }

    // Try to get from localStorage first (most reliable)
    try {
      const localToken = localStorage.getItem('csrf-token');
      if (localToken) {
        this.token = localToken;
        console.log('Found CSRF token in localStorage:', localToken.substring(0, 8) + '...');
        return localToken;
      }
    } catch (error) {
      console.warn('Failed to read CSRF token from localStorage:', error);
    }

    // Try to get from cookie (cross-origin might be blocked)
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrf-token') {
          this.token = value;
          console.log('Found CSRF token in cookie:', value.substring(0, 8) + '...');
          return value;
        }
      }
    } catch (error) {
      console.warn('Failed to read CSRF token from cookies:', error);
    }

    // Try to get from meta tag (server can set this)
    try {
      const metaTag = document.querySelector('meta[name="csrf-token"]');
      if (metaTag) {
        this.token = metaTag.getAttribute('content');
        console.log('Found CSRF token in meta tag:', this.token?.substring(0, 8) + '...');
        return this.token;
      }
    } catch (error) {
      console.warn('Failed to read CSRF token from meta tag:', error);
    }

    console.warn('No CSRF token found in any location');
    return null;
  }

  // Set CSRF token (for when server sends it in response headers)
  static setToken(token: string): void {
    this.token = token;
    console.log('CSRF token stored in memory:', token.substring(0, 8) + '...');
    
    // Also store in localStorage as backup
    try {
      localStorage.setItem('csrf-token', token);
      console.log('CSRF token backed up to localStorage');
    } catch (error) {
      console.warn('Failed to backup CSRF token to localStorage:', error);
    }
  }

  // Clear token
  static clearToken(): void {
    this.token = null;
    try {
      localStorage.removeItem('csrf-token');
    } catch (error) {
      console.warn('Failed to clear CSRF token from localStorage:', error);
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
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add CSRF token for state-changing requests
    if (token && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method?.toUpperCase() || 'GET')) {
      defaultHeaders['X-CSRF-Token'] = token;
      console.log(`Adding CSRF token to ${options.method} request:`, token.substring(0, 8) + '...');
    } else if (!token && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method?.toUpperCase() || 'GET')) {
      console.warn(`No CSRF token available for ${options.method} request to ${url}`);
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
      console.log('Updated CSRF token from response header');
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
        console.warn('User not authenticated, skipping CSRF initialization');
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
          console.log('CSRF token initialized from header:', headerToken.substring(0, 8) + '...');
          return;
        }
        
        // Try to get token from response body
        const data = await csrfResponse.json();
        if (data.csrfToken) {
          this.setToken(data.csrfToken);
          console.log('CSRF token initialized from response body:', data.csrfToken.substring(0, 8) + '...');
          return;
        }
        
        // Try to get from cookie (fallback)
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'csrf-token') {
            this.setToken(value);
            console.log('CSRF token initialized from cookie:', value.substring(0, 8) + '...');
            return;
          }
        }
      }
      
      console.warn('Could not obtain CSRF token');
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
