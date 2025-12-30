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
    console.log('CSRFTokenManager: Adding token to headers', {
      hasToken: !!token,
      tokenLength: token?.length,
      tokenPreview: token ? `${token.substring(0, 10)}...` : 'none',
      originalHeaders: Object.keys(headers)
    });
    
    if (token) {
      const newHeaders = {
        ...headers,
        'X-CSRF-Token': token,
      };
      console.log('CSRFTokenManager: Token added to headers', {
        newHeaders: Object.keys(newHeaders),
        hasCSRFHeader: !!newHeaders['X-CSRF-Token']
      });
      return newHeaders;
    }
    
    console.warn('CSRFTokenManager: No token available to add to headers');
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
      console.log('CSRFTokenManager: Initializing token...');
      const response = await fetch(`${import.meta.env?.VITE_API_URL || 'https://kenya-grubhub-server.onrender.com'}/api/csrf-token`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('CSRFTokenManager: Token received', { 
          token: data.csrfToken,
          tokenLength: data.csrfToken?.length,
          tokenPreview: data.csrfToken ? `${data.csrfToken.substring(0, 10)}...` : 'none'
        });
        this.setToken(data.csrfToken);
        console.log('CSRFTokenManager: Token stored successfully');
      } else {
        console.error('CSRFTokenManager: Failed to fetch token', response.status);
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
