import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

// Error handling middleware
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details (sanitized)
  Logger.error(`${req.method} ${req.path}: ${error.message}`, {
    stack: err.stack,
    body: Logger.sanitizeForLogging(req.body),
    params: req.params,
    query: req.query,
    user: req.user?.id || 'anonymous'
  }, 'ERROR_HANDLER');

  // Default error response
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'INTERNAL_ERROR';
  let details: any = undefined;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    details = err.details;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid data format';
    code = 'INVALID_FORMAT';
  } else if (err.code === 11000) {
    // MongoDB duplicate key error
    statusCode = 400;
    message = 'Duplicate entry';
    code = 'DUPLICATE_ENTRY';
    const field = Object.keys(err.keyValue)[0];
    details = { field, value: err.keyValue[field] };
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code || 'APP_ERROR';
    details = (err as any).details;
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    message = 'File upload error';
    code = 'UPLOAD_ERROR';
    if (err.message.includes('File too large')) {
      message = 'File size exceeds limit';
    } else if (err.message.includes('Unsupported file type')) {
      message = 'Unsupported file type';
    }
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Something went wrong';
    details = undefined;
  }

  // Build error response
  const errorResponse: any = {
    success: false,
    message,
    code,
    timestamp: new Date().toISOString()
  };

  // Include details in development or for client errors
  if (details && (process.env.NODE_ENV !== 'production' || statusCode < 500)) {
    errorResponse.details = details;
  }

  // Include stack trace only in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

// Process unhandled promise rejections
export const setupUnhandledRejectionHandler = () => {
  process.on('unhandledRejection', (reason: any, _promise: Promise<any>) => {
    Logger.error('Unhandled Promise Rejection:', reason, 'UNHANDLED_REJECTION');
    // Don't crash the server, just log it
  });

  process.on('uncaughtException', (error: Error) => {
    Logger.error('Uncaught Exception:', error, 'UNCAUGHT_EXCEPTION');
    // Graceful shutdown
    process.exit(1);
  });
};
