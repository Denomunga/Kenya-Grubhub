# Professional Offline POS Setup Guide

## Overview
Your Kenya GrubHub POS now includes enterprise-grade offline capabilities with secure MongoDB synchronization, data encryption, and automatic backup systems.

## 🔧 Setup Instructions

### 1. Environment Configuration
Copy `.env.example` to `.env.local` and configure:

```bash
# Security - CHANGE THIS IN PRODUCTION
VITE_OFFLINE_ENCRYPTION_KEY=your-super-secure-encryption-key-256-bits

# Sync Configuration
VITE_MONGODB_SYNC_URL=http://localhost:3001/api
VITE_SYNC_INTERVAL=60000
VITE_OFFLINE_BACKUP_INTERVAL=1800000

# Features
VITE_ENABLE_DATA_ENCRYPTION=true
VITE_AUTO_BACKUP_ENABLED=true
```

### 2. Server Integration
Add the offline sync routes to your server:

```typescript
// In your main server file
import offlineSyncRoutes from './routes/offline-sync';
app.use('/api', offlineSyncRoutes);
```

### 3. Client Integration
Wrap your app with the OfflinePOSWrapper:

```tsx
import { OfflinePOSWrapper } from '@/components/OfflinePOSWrapper';

function App() {
  return (
    <OfflinePOSWrapper>
      <YourPOSApp />
    </OfflinePOSWrapper>
  );
}
```

## 🚀 Features Enabled

### ✅ **Professional Offline Operation**
- POS continues working without internet
- All orders saved locally with validation
- Real-time offline status indicators
- Automatic sync when connection restored

### ✅ **Enterprise Security**
- AES-256 encryption for sensitive data
- Data integrity verification with checksums
- Input validation and sanitization
- Secure customer data handling

### ✅ **Robust MongoDB Sync**
- Conflict resolution with timestamp logic
- Intelligent merging of conflicting data
- Retry mechanisms with exponential backoff
- Real-time sync status monitoring

### ✅ **Automatic Backup System**
- Encrypted local backups every 30 minutes
- Export/import backup functionality
- Data recovery after failures
- Backup integrity verification

### ✅ **Professional Receipt Printing**
- Works completely offline
- Thermal printer support
- PDF and text receipt formats
- Automatic receipt generation

## 🔒 Security Features

### Data Encryption
- Customer phone numbers and addresses encrypted
- Backup data encrypted with AES-256
- Secure key management
- No sensitive data in localStorage unencrypted

### Data Integrity
- SHA-256 checksums for all orders
- Verification before sync
- Tamper detection
- Corruption recovery

### Input Validation
- Zod schema validation
- XSS prevention
- Phone number sanitization
- Data type enforcement

## 📊 Monitoring & Analytics

### Real-time Status
- Connection quality monitoring
- Sync queue status
- Backup status
- Data integrity checks

### Performance Metrics
- Sync success rate
- Conflict resolution stats
- Backup verification results
- Offline operation duration

## 🔄 Sync Behavior

### Automatic Sync
- Triggers when connection restored
- Every 60 seconds when online
- Priority-based queue processing
- Conflict resolution

### Conflict Resolution
1. **Timestamp-based**: Newest data wins
2. **Status priority**: Delivered > Ready > Preparing > Pending > Cancelled
3. **Sensitive data preservation**: Local customer info always kept
4. **Manual override**: Admin can choose resolution strategy

### Backup Strategy
- **Auto-backup**: Every 30 minutes
- **Manual backup**: On-demand export
- **Import recovery**: From backup files
- **Integrity checks**: Before restore

## 🛠️ Usage Examples

### Creating Orders Offline
```tsx
import { useOfflineOrder } from '@/hooks/useOfflineOrder';

function OrderForm() {
  const { createOrder, isCreating } = useOfflineOrder();
  
  const handleCreateOrder = async (orderData) => {
    const result = await createOrder(orderData);
    if (result.success) {
      console.log('Order created:', result.orderId);
      console.log('Synced:', result.synced);
    }
  };
  
  return (
    // Your order form JSX
  );
}
```

### Manual Sync
```tsx
import { mongoDBSync } from '@/lib/mongodb-sync';

const handleForceSync = async () => {
  const result = await mongoDBSync.syncAllData();
  console.log('Sync result:', result);
};
```

### Backup Management
```tsx
import { OfflineBackup } from '@/lib/offline-backup';

const handleBackup = async () => {
  await OfflineBackup.exportBackup();
};

const handleRestore = async (file) => {
  const result = await OfflineBackup.importBackup(file);
  console.log('Restore result:', result);
};
```

## 🔧 Troubleshooting

### Common Issues

1. **Sync not working**
   - Check network connection
   - Verify server endpoints are accessible
   - Check encryption key configuration

2. **Data integrity errors**
   - Run backup restore
   - Clear local storage and resync
   - Check for corrupted data

3. **Performance issues**
   - Reduce sync interval
   - Clear old backups
   - Optimize database queries

### Debug Mode
Enable debug logging:
```bash
VITE_OFFLINE_DEBUG=true
VITE_SYNC_DEBUG=true
```

## 📱 Mobile Considerations

### Battery Optimization
- Reduced sync frequency on battery
- Background sync limitations
- Connection type awareness

### Storage Management
- Automatic cleanup of old data
- Storage quota monitoring
- Backup size optimization

## 🚀 Production Deployment

### Security Checklist
- [ ] Change encryption key
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set up monitoring
- [ ] Test backup/restore

### Performance Optimization
- [ ] Enable service workers
- [ ] Configure caching
- [ ] Optimize bundle size
- [ ] Test on slow networks

### Monitoring Setup
- [ ] Error tracking
- [ ] Performance metrics
- [ ] Sync success rates
- [ ] User experience monitoring

## 📞 Support

For issues with the offline POS system:

1. Check browser console for errors
2. Verify network connectivity
3. Test with fresh localStorage
4. Check server API endpoints
5. Review backup integrity

The system is designed to be resilient and will continue working even with partial failures. All data is preserved and will sync when connectivity is restored.
