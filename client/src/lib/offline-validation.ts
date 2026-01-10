import { z } from 'zod';
import CryptoJS from 'crypto-js';

// Encryption key should be stored securely (environment variable or secure storage)
const ENCRYPTION_KEY = import.meta.env.VITE_OFFLINE_ENCRYPTION_KEY || 'default-key-change-in-production';

// Validation schemas
export const OrderItemSchema = z.object({
  item: z.object({
    id: z.string().min(1, 'Item ID is required'),
    name: z.string().min(1, 'Item name is required'),
    price: z.number().min(0, 'Price must be non-negative'),
    category: z.string().min(1, 'Category is required'),
    image: z.string().url().optional(),
  }),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

export const OrderSchema = z.object({
  id: z.string().uuid('Invalid order ID'),
  items: z.array(OrderItemSchema).min(1, 'Order must have at least one item'),
  total: z.number().min(0, 'Total must be non-negative'),
  user: z.string().min(1, 'User name is required'),
  userPhone: z.string().regex(/^[+]?[1-9]\d{1,14}$/, 'Invalid phone number').optional(),
  status: z.enum(['Pending', 'Preparing', 'Ready', 'Delivered', 'Cancelled']),
  paymentMethod: z.enum(['mpesa', 'cash', 'card']),
  paymentStatus: z.enum(['pending', 'completed', 'failed']),
  location: z.object({
    address: z.string().min(1, 'Address is required'),
    coordinates: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }).optional(),
  }).optional(),
  synced: z.boolean(),
  date: z.string().datetime('Invalid date format'),
  createdAt: z.string().datetime('Invalid created date'),
  updatedAt: z.string().datetime('Invalid updated date'),
});

export const MenuItemSchema = z.object({
  id: z.string().min(1, 'Item ID is required'),
  name: z.string().min(1, 'Item name is required'),
  price: z.number().min(0, 'Price must be non-negative'),
  category: z.string().min(1, 'Category is required'),
  image: z.string().url().optional(),
  available: z.boolean(),
  lastUpdated: z.string().datetime('Invalid last updated date'),
});

export class OfflineValidator {
  // Data validation
  static validateOrder(order: any): { isValid: boolean; errors: string[]; data?: any } {
    try {
      const validated = OrderSchema.parse(order);
      return { isValid: true, errors: [], data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { isValid: false, errors };
      }
      return { isValid: false, errors: ['Unknown validation error'] };
    }
  }

  static validateMenuItem(item: any): { isValid: boolean; errors: string[]; data?: any } {
    try {
      const validated = MenuItemSchema.parse(item);
      return { isValid: true, errors: [], data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { isValid: false, errors };
      }
      return { isValid: false, errors: ['Unknown validation error'] };
    }
  }

  // Data sanitization
  static sanitizeOrder(order: any): any {
    return {
      ...order,
      user: this.sanitizeString(order.user),
      userPhone: order.userPhone ? this.sanitizePhone(order.userPhone) : undefined,
      items: order.items?.map((item: any) => ({
        ...item,
        item: {
          ...item.item,
          name: this.sanitizeString(item.item.name),
          category: this.sanitizeString(item.item.category),
        }
      })),
    };
  }

  static sanitizeString(str: string): string {
    return str.trim().replace(/[<>]/g, '');
  }

  static sanitizePhone(phone: string): string {
    // Remove all non-digit characters except + at the beginning
    return phone.replace(/(?!^\+)[^\d]/g, '');
  }

  // Data integrity checks
  static calculateOrderChecksum(order: any): string {
    const relevantData = {
      items: order.items,
      total: order.total,
      user: order.user,
      date: order.date,
    };
    return CryptoJS.SHA256(JSON.stringify(relevantData)).toString();
  }

  static verifyOrderIntegrity(order: any, expectedChecksum: string): boolean {
    const actualChecksum = this.calculateOrderChecksum(order);
    return actualChecksum === expectedChecksum;
  }

  // Encryption for sensitive data
  static encryptSensitiveData(data: any): string {
    const jsonString = JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonString, ENCRYPTION_KEY).toString();
  }

  static decryptSensitiveData(encryptedData: string): any {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Error decrypting data:', error);
      return null;
    }
  }

  // Sanitize order for storage (encrypt sensitive fields)
  static prepareOrderForStorage(order: any): any {
    const sanitized = this.sanitizeOrder(order);
    const checksum = this.calculateOrderChecksum(sanitized);
    
    return {
      ...sanitized,
      checksum,
      // Encrypt sensitive customer data
      encryptedCustomerData: this.encryptSensitiveData({
        userPhone: sanitized.userPhone,
        location: sanitized.location,
      }),
      // Remove original sensitive data
      userPhone: undefined,
      location: undefined,
    };
  }

  // Restore order for use (decrypt sensitive fields)
  static restoreOrderFromStorage(storedOrder: any): any {
    const customerData = this.decryptSensitiveData(storedOrder.encryptedCustomerData);
    
    return {
      ...storedOrder,
      userPhone: customerData?.userPhone,
      location: customerData?.location,
      encryptedCustomerData: undefined, // Remove encrypted data
    };
  }

  // Validate and prepare order in one step
  static validateAndPrepareOrder(order: any): { isValid: boolean; errors: string[]; data?: any } {
    // First validate
    const validation = this.validateOrder(order);
    if (!validation.isValid) {
      return validation;
    }

    // Then prepare for storage
    try {
      const prepared = this.prepareOrderForStorage(validation.data);
      return { isValid: true, errors: [], data: prepared };
    } catch (error) {
      return { isValid: false, errors: ['Failed to prepare order for storage'] };
    }
  }
}
