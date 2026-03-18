/**
 * Generic API Response type
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
  pagination?: PaginationMeta;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/**
 * Module registration interface
 */
export interface ModuleConfig {
  name: string;
  path: string;
  routes: any;
  prefix: string;
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  success: false;
  message: string;
  code?: string;
  details?: any;
}