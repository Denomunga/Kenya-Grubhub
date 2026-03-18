import { Request, Response, NextFunction } from 'express';

export type UserRole = 'admin' | 'staff' | 'user' | 'manager' | 'inventory_manager' | 'procurement_manager' | 'warehouse_manager' | 'quality_manager' | 'sales_rep' | 'customer' | 'accounting_manager' | 'hr_manager' | 'sales_person' | 'accounting_person' | 'payroll_manager';

/**
 * Middleware to require specific roles
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role as UserRole;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        required: allowedRoles,
        current: userRole
      });
    }

    next();
  };
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Middleware to require manager or admin role
 */
export const requireManager = requireRole(['admin', 'manager']);

/**
 * Middleware to check if user has any of the specified roles
 */
export const hasRole = (roles: UserRole[]) => {
  return (req: Request): boolean => {
    if (!req.user) return false;
    return roles.includes(req.user.role as UserRole);
  };
};

/**
 * Middleware to allow access if user is owner or has required role
 */
export const requireOwnershipOrRole = (allowedRoles: UserRole[], ownerField = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role as UserRole;
    const userId = req.user.id;

    // Check if user has required role
    if (allowedRoles.includes(userRole)) {
      return next();
    }

    // Check if user is the owner
    const resourceOwnerId = req.params[ownerField] || req.body[ownerField];
    if (resourceOwnerId && resourceOwnerId === userId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied: insufficient permissions or not the owner'
    });
  };
};