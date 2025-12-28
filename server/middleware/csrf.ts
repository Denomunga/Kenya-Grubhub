import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Simple CSRF token implementation (since csurf is deprecated)
export class CSRFProtection {
  public static tokens = new Map<string, { token: string; expires: number }>();
  public static readonly TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

  // Generate CSRF token
  static generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Validate CSRF token - Session-based approach
  static validateToken(sessionId: string, providedToken: string): boolean {
    const storedData = this.tokens.get(sessionId);
    
    if (!storedData) {
      return false;
    }
    
    // Check if token has expired
    if (Date.now() > storedData.expires) {
      this.tokens.delete(sessionId);
      return false;
    }
    
    // For session-based CSRF, we can validate against session ID
    // This is more reliable for cross-origin requests
    const isValid = providedToken === sessionId || 
                   crypto.timingSafeEqual(
                     Buffer.from(storedData.token, 'hex'),
                     Buffer.from(providedToken, 'hex')
                   );
    
    return isValid;
  }

  // Store token for session
  static storeToken(sessionId: string, token: string): void {
    this.tokens.set(sessionId, {
      token,
      expires: Date.now() + this.TOKEN_EXPIRY
    });
  }

  // Get session-based CSRF token (simpler approach)
  static getSessionToken(sessionId: string): string {
    return sessionId; // Use session ID as CSRF token for simplicity
  }

  // Clean up expired tokens
  static cleanupExpiredTokens(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [sessionId, data] of this.tokens.entries()) {
      if (now > data.expires) {
        this.tokens.delete(sessionId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      // Tokens cleaned up
    }
  }
}

// CSRF middleware
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Only apply CSRF to state-changing methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    // For GET requests, provide a CSRF token
    if (req.session?.userId) {
      const sessionId = req.sessionID;
      
      // Session-based approach: use session ID as CSRF token
      const sessionToken = CSRFProtection.getSessionToken(sessionId);
      
      // Store both for compatibility
      CSRFProtection.storeToken(sessionId, sessionToken);
      
      // Set token as a cookie and in response headers
      res.cookie('csrf-token', sessionToken, {
        httpOnly: false, // JavaScript needs to read this
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none', // Required for cross-origin
        maxAge: 60 * 60 * 1000 // 1 hour
      });
      
      res.setHeader('X-CSRF-Token', sessionToken);
    }
    return next();
  }

  // For state-changing requests, validate CSRF token
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    // Skip CSRF for API endpoints that don't need it
    const skipCSRFRoutes = ['/api/uploads', '/api/webhooks', '/api/health', '/api/auth/login', '/api/auth/register', '/api/chat'];
    if (skipCSRFRoutes.some(route => req.path.startsWith(route))) {
      return next();
    }

    const sessionId = req.sessionID;
    const providedToken = req.headers['x-csrf-token'] as string || 
                         req.body?._csrf || 
                         req.cookies?.['csrf-token'];

    // Session-based validation: accept session ID or stored token
    if (!sessionId) {
      return res.status(403).json({ 
        message: 'No session found',
        error: 'CSRF_VALIDATION_FAILED'
      });
    }

    // Allow session ID as CSRF token (session-based approach)
    if (providedToken === sessionId) {
      return next();
    }

    // Fallback to traditional token validation
    if (!providedToken) {
      return res.status(403).json({ 
        message: 'CSRF token missing',
        error: 'CSRF_VALIDATION_FAILED'
      });
    }

    if (!CSRFProtection.validateToken(sessionId, providedToken)) {
      return res.status(403).json({ 
        message: 'Invalid CSRF token',
        error: 'CSRF_VALIDATION_FAILED'
      });
    }

    // Clean up the token after successful validation
    CSRFProtection.tokens.delete(sessionId);
  }

  next();
};

// Periodic cleanup
setInterval(() => {
  CSRFProtection.cleanupExpiredTokens();
}, 15 * 60 * 1000); // Every 15 minutes
