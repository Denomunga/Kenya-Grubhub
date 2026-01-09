import axios from 'axios';

interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  shortcode: string;
  callbackUrl: string;
}

interface MpesaTransaction {
  amount: number;
  phoneNumber: string;
  transactionId: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  receipt?: string;
}

class RealMpesaService {
  private config: MpesaConfig;
  private accessToken: string = '';
  private tokenExpiry: Date | null = null;
  private io: any;

  constructor(io?: any) {
    this.io = io;
    this.config = {
      consumerKey: process.env.MPESA_CONSUMER_KEY || '',
      consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
      passkey: process.env.MPESA_PASSKEY || '',
      shortcode: process.env.MPESA_SHORTCODE || '',
      callbackUrl: process.env.MPESA_CALLBACK_URL || 'https://yourdomain.com/api/mpesa/callback'
    };
  }

  // Generate OAuth access token
  private async generateAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.config.consumerKey}:${this.config.consumerSecret}`).toString('base64');
      
      console.log('Requesting M-Pesa access token...');
      console.log(`URL: https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`);
      console.log(`Auth: Basic ${auth.substring(0, 20)}...`);
      
      const response = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      const { access_token, expires_in } = response.data;
      this.accessToken = access_token;
      this.tokenExpiry = new Date(Date.now() + (expires_in - 60) * 1000); // Refresh 1 minute before expiry
      
      console.log(`✅ M-Pesa access token generated successfully: ${this.accessToken.substring(0, 20)}...`);
      console.log(`Token expires in: ${expires_in} seconds`);
      
      return this.accessToken;
    } catch (error) {
      console.error('❌ Error generating M-Pesa access token:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        console.error('Response status:', axiosError.response?.status);
        console.error('Response data:', axiosError.response?.data);
      }
      throw new Error('Failed to generate access token');
    }
  }

  // Start waiting for M-Pesa C2B payment
  async startPaymentMonitoring(saleId: string, amount: number, phoneNumber?: string, timeoutMinutes: number = 5) {
    try {
      console.log(`🔄 Waiting for M-Pesa C2B payment for sale ${saleId}: KES ${amount}`);
      
      // Notify frontend to show waiting screen for C2B payment
      this.io?.emit('mpesa:payment_waiting', {
        saleId,
        amount,
        paymentType: 'C2B',
        message: 'Please pay via M-Pesa to the business number',
        timeoutMinutes
      });

      // Start checking for C2B transaction confirmation
      this.checkC2BPaymentPeriodically(saleId, amount, timeoutMinutes, phoneNumber);
      
    } catch (error) {
      console.error('Error initiating M-Pesa C2B payment monitoring:', error);
      this.io?.emit('mpesa:payment_error', {
        saleId,
        error: 'Failed to start C2B payment monitoring'
      });
    }
  }

  // Check C2B payment status periodically
  private async checkC2BPaymentPeriodically(saleId: string, expectedAmount: number, timeoutMinutes: number, phoneNumber?: string) {
    const startTime = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;
    
    const checkStatus = async () => {
      if (Date.now() - startTime > timeoutMs) {
        this.updateSaleStatus(saleId, 'Failed');
        this.io?.emit('mpesa:payment_timeout', {
          saleId,
          message: 'Payment timeout - please try again'
        });
        return;
      }

      try {
        // Check for recent C2B transactions that match this sale
        const transactions = await this.getRecentTransactions(phoneNumber, expectedAmount);
        
        // Look for a transaction that matches our expected amount and sale
        const matchingTransaction = transactions.find(tx => 
          this.validatePayment(tx, expectedAmount) && 
          tx.status === 'completed'
        );

        if (matchingTransaction) {
          // Payment found and confirmed
          await this.confirmPayment(saleId, matchingTransaction);
        } else {
          // Still waiting, check again in 5 seconds
          setTimeout(checkStatus, 5000);
        }
      } catch (error) {
        console.error('Error checking C2B payment status:', error);
        setTimeout(checkStatus, 5000); // Retry in 5 seconds
      }
    };

    // Start checking after 5 seconds
    setTimeout(checkStatus, 5000);
  }

  // Confirm payment and update sale
  private async confirmPayment(saleId: string, transaction: MpesaTransaction) {
    try {
      const { Sale } = await import('../models/Sale');
      const sale = await Sale.findByIdAndUpdate(saleId, {
        status: 'Completed',
        mpesaTransactionId: transaction.transactionId,
        mpesaReceipt: transaction.receipt,
        mpesaPhoneNumber: transaction.phoneNumber,
        mpesaStatus: 'completed',
        paymentConfirmedAt: new Date()
      });

      // Deduct stock for M-Pesa payment now that it's confirmed
      if (sale) {
        const { Product } = await import('../models/Product');
        for (const item of sale.items) {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: -item.quantity }
          });
        }
      }

      // Notify frontend
      this.io?.emit('mpesa:payment_confirmed', {
        saleId,
        transaction,
        amount: transaction.amount
      });

      console.log(`M-Pesa payment confirmed for sale ${saleId}: KES ${transaction.amount}`);
    } catch (error) {
      console.error('Error confirming M-Pesa payment:', error);
      this.io?.emit('mpesa:payment_error', {
        saleId,
        error: 'Failed to confirm payment'
      });
    }
  }

  // Update sale status
  private async updateSaleStatus(saleId: string, status: string) {
    try {
      const { Sale } = await import('../models/Sale');
      
      const updateData: any = {
        status,
        mpesaStatus: status.toLowerCase()
      };
      
      if (status === 'Failed') {
        updateData.mpesaTransactionId = undefined;
        updateData.mpesaReceipt = undefined;
        updateData.mpesaPhoneNumber = undefined;
      }
      
      await Sale.findByIdAndUpdate(saleId, updateData);
    } catch (error) {
      console.error('Error updating sale status:', error);
    }
  }

  // Check M-Pesa transaction status
  async checkTransactionStatus(transactionId: string): Promise<any> {
    try {
      const token = await this.generateAccessToken();
      
      // Generate timestamp in correct format: YYYYMMDDHHMMSS (no T separator)
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      
      const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
      
      const response = await axios.post(
        'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query',
        {
          BusinessShortCode: this.config.shortcode,
          Password: Buffer.from(`${this.config.shortcode}${this.config.passkey}${timestamp}`).toString('base64'),
          Timestamp: timestamp,
          CheckoutRequestID: transactionId
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`Checking transaction status for ${transactionId} with token ${token.substring(0, 10)}...`);

      return response.data;
    } catch (error) {
      console.error('Error checking M-Pesa transaction status:', error);
      throw new Error('Failed to check transaction status');
    }
  }

  // Parse M-Pesa callback data
  parseCallbackData(callbackData: any): MpesaTransaction {
    const { Body } = callbackData.stkCallback;
    const { stkCallback } = Body;
    
    return {
      amount: stkCallback.CallbackMetadata.Amount,
      phoneNumber: stkCallback.CallbackMetadata.PhoneNumber,
      transactionId: stkCallback.CallbackMetadata.MpesaReceiptNumber,
      timestamp: new Date(),
      status: this.determineTransactionStatus(stkCallback.ResultCode)
    };
  }

  // Determine transaction status from result code
  private determineTransactionStatus(resultCode: string): 'pending' | 'completed' | 'failed' {
    if (resultCode === '0') {
      return 'completed';
    } else if (resultCode === '1032' || resultCode === '1037') {
      return 'pending';
    } else {
      return 'failed';
    }
  }

  // Get recent transactions for payment matching
  async getRecentTransactions(phoneNumber?: string, amount?: number): Promise<MpesaTransaction[]> {
    try {
      const token = await this.generateAccessToken();
      
      // Use the phoneNumber parameter and token to avoid unused warnings
      console.log(`Fetching recent transactions for phone: ${phoneNumber}, amount: ${amount} with token ${token.substring(0, 10)}...`);
      
      // This would typically query M-Pesa API for transaction history
      // For now, return empty array - implement based on your needs
      return [];
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
      return [];
    }
  }

  // Validate payment matches expected criteria
  private validatePayment(transaction: MpesaTransaction, expectedAmount: number): boolean {
    return transaction.amount === expectedAmount;
  }
}

export default RealMpesaService;
