// CSRF token management for client-side

export class CSRFTokenManager {
  private static token: string | null = null;

  // Get CSRF token from cookie or header
  static getToken(): string | null {
    if (this.token) return this.token;

    // Try to get from cookie first
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrf-token') {
        this.token = value;
        return value;
      }
    }

    // Try to get from meta tag (server can set this)
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
      this.token = metaTag.getAttribute('content');
      return this.token;
    }

    return null;
  }

  // Set CSRF token (for when server sends it in response headers)
  static setToken(token: string): void {
    this.token = token;
  }

  // Clear token
  static clearToken(): void {
    this.token = null;
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
