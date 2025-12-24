import type { Request, Response, NextFunction } from 'express';

// Logger utility with production-safe logging
export class Logger {
  public static isProduction = process.env.NODE_ENV === 'production';
  public static isDevelopment = process.env.NODE_ENV === 'development';

  static log(message: string, source: string = 'APP') {
    const timestamp = new Date().toISOString();
    const formattedMessage = `${timestamp} [${source}] ${message}`;
    
    if (this.isDevelopment) {
      console.log(formattedMessage);
    }
    // In production, logs should go to a proper logging service
    // This is where you'd integrate with Winston, Pino, or similar
  }

  static error(message: string, error?: any, source: string = 'ERROR') {
    const timestamp = new Date().toISOString();
    const formattedMessage = `${timestamp} [${source}] ${message}`;
    
    if (this.isDevelopment) {
      console.error(formattedMessage, error || '');
    }
    
    // In production, send to error tracking service
    // e.g., Sentry, Datadog, etc.
    if (this.isProduction) {
      // Log to external service here
      // Don't log sensitive information
      this.logToExternalService({
        level: 'error',
        message,
        timestamp,
        stack: error?.stack,
        source
      });
    }
  }

  static warn(message: string, source: string = 'WARN') {
    const timestamp = new Date().toISOString();
    const formattedMessage = `${timestamp} [${source}] ${message}`;
    
    if (this.isDevelopment) {
      console.warn(formattedMessage);
    }
    
    if (this.isProduction) {
      this.logToExternalService({
        level: 'warn',
        message,
        timestamp,
        source
      });
    }
  }

  static debug(message: string, data?: any, source: string = 'DEBUG') {
    if (!this.isDevelopment) return; // No debug logs in production
    
    const timestamp = new Date().toISOString();
    const formattedMessage = `${timestamp} [${source}] ${message}`;
    
    if (data) {
      console.debug(formattedMessage, data);
    } else {
      console.debug(formattedMessage);
    }
  }

  private static logToExternalService(logData: {
    level: string;
    message: string;
    timestamp: string;
    stack?: string;
    source: string;
  }) {
    // This would integrate with your logging service
    // For now, we'll just use console.error for critical errors
    if (logData.level === 'error') {
      console.error(`[${logData.level.toUpperCase()}] ${logData.message}`);
    }
  }

  // Sanitize sensitive data from logs
  static sanitizeForLogging(data: any): any {
    if (!data || typeof data !== 'object') return data;
    
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'authorization',
      'cookie', 'session', 'creditCard', 'ssn', 'email',
      'phone', 'address'
    ];
    
    const sanitized = { ...data };
    
    const sanitize = (obj: any, path: string = ''): any => {
      if (!obj || typeof obj !== 'object') return obj;
      
      if (Array.isArray(obj)) {
        return obj.map((item, index) => sanitize(item, `${path}[${index}]`));
      }
      
      const result: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const currentPath = path ? `${path}.${key}` : key;
          const lowerKey = key.toLowerCase();
          
          // Check if this is a sensitive field
          const isSensitive = sensitiveFields.some(field => 
            lowerKey.includes(field.toLowerCase())
          );
          
          if (isSensitive) {
            result[key] = '[REDACTED]';
          } else if (typeof obj[key] === 'object') {
            result[key] = sanitize(obj[key], currentPath);
          } else {
            result[key] = obj[key];
          }
        }
      }
      return result;
    };
    
    return sanitize(sanitized);
  }
}

// Request logger middleware (production-safe)
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const url = req.path;

  if (url.startsWith("/api")) {
    let capturedJsonResponse: any;

    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      capturedJsonResponse = Logger.sanitizeForLogging(body);
      return originalJson(body);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      let message = `${req.method} ${url} ${res.statusCode} in ${duration}ms`;
      
      if (Logger.isDevelopment && capturedJsonResponse) {
        const responseStr = JSON.stringify(capturedJsonResponse);
        message += ` :: ${responseStr.length > 200 ? responseStr.substring(0, 200) + '...' : responseStr}`;
      }
      
      Logger.log(message, 'HTTP');
    });
  }

  next();
};
