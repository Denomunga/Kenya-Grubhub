import { offlineStorage } from './offline-storage';
import { OfflineValidator } from './offline-validation';

interface BackupData {
  version: string;
  timestamp: string;
  orders: any[];
  menuItems: any[];
  settings: Record<string, any>;
  checksum: string;
}

interface RestoreResult {
  success: boolean;
  restored: number;
  errors: string[];
}

export class OfflineBackup {
  private static readonly BACKUP_VERSION = '1.0.0';
  private static readonly BACKUP_KEY = 'kenya-grubhub-backup';

  // Create backup of all offline data
  static async createBackup(): Promise<string> {
    try {
      const [orders, menuItems, settings] = await Promise.all([
        offlineStorage.getOrders(),
        offlineStorage.getMenuItems(),
        this.getAllSettings(),
      ]);

      const backupData: BackupData = {
        version: this.BACKUP_VERSION,
        timestamp: new Date().toISOString(),
        orders: orders.map(order => OfflineValidator.restoreOrderFromStorage(order)),
        menuItems,
        settings,
        checksum: '', // Will be calculated below
      };

      // Calculate checksum
      backupData.checksum = this.calculateBackupChecksum(backupData);

      // Encrypt backup data
      const encryptedBackup = OfflineValidator.encryptSensitiveData(backupData);

      // Save to localStorage and download
      localStorage.setItem(this.BACKUP_KEY, encryptedBackup);
      
      // Also trigger download
      this.downloadBackup(encryptedBackup);

      return encryptedBackup;
    } catch (error) {
      console.error('Backup creation failed:', error);
      throw new Error(`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Restore from backup
  static async restoreFromBackup(backupData?: string): Promise<RestoreResult> {
    const result: RestoreResult = {
      success: true,
      restored: 0,
      errors: []
    };

    try {
      // Get backup data from parameter or localStorage
      const encryptedData = backupData || localStorage.getItem(this.BACKUP_KEY);
      
      if (!encryptedData) {
        throw new Error('No backup data found');
      }

      // Decrypt backup
      const backup: BackupData = OfflineValidator.decryptSensitiveData(encryptedData);
      
      if (!backup) {
        throw new Error('Failed to decrypt backup data');
      }

      // Verify backup integrity
      if (!this.verifyBackupIntegrity(backup)) {
        throw new Error('Backup integrity check failed');
      }

      // Validate backup version
      if (backup.version !== this.BACKUP_VERSION) {
        result.errors.push(`Warning: Backup version ${backup.version} differs from current ${this.BACKUP_VERSION}`);
      }

      // Clear existing data (optional - you might want to merge instead)
      // await offlineStorage.clearAllData();

      // Restore orders
      for (const order of backup.orders) {
        try {
          const validation = OfflineValidator.validateAndPrepareOrder(order);
          if (validation.isValid && validation.data) {
            await offlineStorage.saveOrder(validation.data);
            result.restored++;
          } else {
            result.errors.push(`Invalid order ${order.id}: ${validation.errors.join(', ')}`);
          }
        } catch (error) {
          result.errors.push(`Error restoring order ${order.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Restore menu items
      if (backup.menuItems && backup.menuItems.length > 0) {
        try {
          await offlineStorage.saveMenuItems(backup.menuItems);
          result.restored += backup.menuItems.length;
        } catch (error) {
          result.errors.push(`Error restoring menu items: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Restore settings
      for (const [key, value] of Object.entries(backup.settings)) {
        try {
          await offlineStorage.saveSetting(key, value);
        } catch (error) {
          result.errors.push(`Error restoring setting ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (result.errors.length > 0) {
        result.success = false;
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  // Auto-backup functionality
  static async autoBackup(): Promise<void> {
    try {
      const lastBackupTime = await offlineStorage.getSetting('lastAutoBackup');
      const now = new Date();
      
      // Auto-backup every 6 hours
      if (!lastBackupTime || (now.getTime() - new Date(lastBackupTime).getTime()) > 6 * 60 * 60 * 1000) {
        await this.createBackup();
        await offlineStorage.saveSetting('lastAutoBackup', now.toISOString());
        console.log('Auto backup completed');
      }
    } catch (error) {
      console.error('Auto backup failed:', error);
    }
  }

  // Export backup data
  static async exportBackup(): Promise<void> {
    try {
      const backupData = await this.createBackup();
      const blob = new Blob([backupData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `kenya-grubhub-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export backup failed:', error);
      throw error;
    }
  }

  // Import backup from file
  static async importBackup(file: File): Promise<RestoreResult> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const backupData = e.target?.result as string;
          const result = await this.restoreFromBackup(backupData);
          resolve(result);
        } catch (error) {
          resolve({
            success: false,
            restored: 0,
            errors: [`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
          });
        }
      };
      
      reader.onerror = () => {
        resolve({
          success: false,
          restored: 0,
          errors: ['Failed to read backup file']
        });
      };
      
      reader.readAsText(file);
    });
  }

  // Get backup info
  static async getBackupInfo(): Promise<{
    hasBackup: boolean;
    backupTime?: string;
    backupSize?: number;
  }> {
    try {
      const encryptedData = localStorage.getItem(this.BACKUP_KEY);
      
      if (!encryptedData) {
        return { hasBackup: false };
      }

      const backup: BackupData = OfflineValidator.decryptSensitiveData(encryptedData);
      
      if (!backup) {
        return { hasBackup: false };
      }

      return {
        hasBackup: true,
        backupTime: backup.timestamp,
        backupSize: encryptedData.length
      };
    } catch (error) {
      console.error('Error getting backup info:', error);
      return { hasBackup: false };
    }
  }

  // Clear backup
  static clearBackup(): void {
    localStorage.removeItem(this.BACKUP_KEY);
  }

  // Private helper methods
  private static calculateBackupChecksum(backup: BackupData): string {
    const dataToHash = {
      version: backup.version,
      timestamp: backup.timestamp,
      orders: backup.orders,
      menuItems: backup.menuItems,
      settings: backup.settings,
    };
    return CryptoJS.SHA256(JSON.stringify(dataToHash)).toString();
  }

  private static verifyBackupIntegrity(backup: BackupData): boolean {
    if (!backup.checksum) return false;
    
    const expectedChecksum = backup.checksum;
    const actualChecksum = this.calculateBackupChecksum(backup);
    
    return expectedChecksum === actualChecksum;
  }

  private static async getAllSettings(): Promise<Record<string, any>> {
    try {
      // This would need to be implemented in offlineStorage
      // For now, return empty object
      return {};
    } catch (error) {
      return {};
    }
  }

  private static downloadBackup(backupData: string): void {
    const blob = new Blob([backupData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `kenya-grubhub-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }
}
