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

  // Validate CSRF token
  static validateToken(sessionId: string, providedToken: string): boolean {
    const storedData = this.tokens.get(sessionId);
    
    if (!storedData) return false;
    
    // Check if token has expired
    if (Date.now() > storedData.expires) {
      this.tokens.delete(sessionId);
      return false;
    }
    
    // Compare tokens
    return crypto.timingSafeEqual(
      Buffer.from(storedData.token, 'hex'),
      Buffer.from(providedToken, 'hex')
    );
  }

  // Store token for session
  static storeToken(sessionId: string, token: string): void {
    this.tokens.set(sessionId, {
      token,
      expires: Date.now() + this.TOKEN_EXPIRY
    });
  }

  // Clean up expired tokens
  static cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [sessionId, data] of this.tokens.entries()) {
      if (now > data.expires) {
        this.tokens.delete(sessionId);
      }
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
      const token = CSRFProtection.generateToken();
      CSRFProtection.storeToken(sessionId, token);
      
      // Set token as a cookie and in response headers
      res.cookie('csrf-token', token, {
        httpOnly: false, // JavaScript needs to read this
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000 // 1 hour
      });
      
      res.setHeader('X-CSRF-Token', token);
    }
    return next();
  }

  // For state-changing requests, validate CSRF token
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    // Skip CSRF for API endpoints that don't need it
    const skipCSRFRoutes = ['/api/uploads', '/api/webhooks', '/api/health'];
    if (skipCSRFRoutes.some(route => req.path.startsWith(route))) {
      return next();
    }

    const sessionId = req.sessionID;
    const providedToken = req.headers['x-csrf-token'] as string || 
                         req.body?._csrf || 
                         req.cookies?.['csrf-token'];

    if (!sessionId || !providedToken) {
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
