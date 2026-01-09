import { Request, Response, NextFunction } from "express";

// Middleware to sync POS sales with website inventory
export const syncPOSWithWebsite = async (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Only process successful POS sales
    if (req.originalUrl.includes('/api/pos/sales') && 
        req.method === 'POST' && 
        res.statusCode === 201) {
      
      try {
        const saleData = JSON.parse(data);
        
        // Only update inventory for non-M-Pesa payments or completed sales
        // M-Pesa sales should only deduct stock when payment is confirmed
        // Note: Stock is already deducted in the POS route, so we only emit updates here
        if (saleData.paymentMethod !== 'Mobile Money') {
          // Emit real-time update to connected clients (no stock deduction here)
          const io = (req.app as any).locals.io;
          if (io) {
            io.emit('inventory:update', {
              type: 'pos_sale',
              items: saleData.items,
              timestamp: new Date()
            });
          }
          
          console.log('POS sale synced with website inventory:', saleData.receiptNumber);
        } else {
          console.log('M-Pesa sale created - stock will be deducted on payment confirmation:', saleData.receiptNumber);
        }
      } catch (error) {
        console.error('Error syncing POS sale with website:', error);
      }
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};
