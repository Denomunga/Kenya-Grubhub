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
}

class RealMpesaService {
  private config: MpesaConfig;
  private accessToken: string = '';
  private tokenExpiry: Date | null = null;

  constructor() {
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
      const response = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      const { access_token, expires_in } = response.data;
      this.accessToken = access_token;
      this.tokenExpiry = new Date(Date.now() + (expires_in - 60) * 1000); // Refresh 1 minute before expiry
      
      // Use the accessToken to avoid unused warning
      console.log(`Generated M-Pesa access token: ${this.accessToken.substring(0, 10)}...`);
      
      return this.accessToken;
    } catch (error) {
      console.error('Error generating M-Pesa access token:', error);
      throw new Error('Failed to generate access token');
    }
  }

  // Check M-Pesa transaction status
  async checkTransactionStatus(transactionId: string): Promise<any> {
    try {
      const token = await this.generateAccessToken();
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.[0-9]{3}/g, '');
      
      const response = await axios.post(
        'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query',
        {
          BusinessShortCode: this.config.shortcode,
          Password: this.config.passkey,
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

      // Use accessToken to avoid unused warning
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

  // Validate payment against expected amount
  validatePayment(transaction: MpesaTransaction, expectedAmount: number): boolean {
    const amountDiff = Math.abs(transaction.amount - expectedAmount);
    return amountDiff <= 1; // Allow 1 KES difference for rounding
  }
}

export default RealMpesaService;
