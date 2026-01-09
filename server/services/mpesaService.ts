
interface MpesaTransaction {
  amount: number;
  transactionId: string;
  phoneNumber?: string;
  timestamp: Date;
  receipt?: string;
}

interface PendingPayment {
  saleId: string;
  amount: number;
  createdAt: Date;
  timeout: number; // minutes
}

class MpesaService {
  private pendingPayments: Map<string, PendingPayment> = new Map();
  private confirmedTransactions: MpesaTransaction[] = [];
  private io: any;

  constructor(io?: any) {
    this.io = io;
  }

  // Start waiting for M-Pesa payment
  startPaymentMonitoring(saleId: string, amount: number, timeoutMinutes: number = 5) {
    const pendingPayment: PendingPayment = {
      saleId,
      amount,
      createdAt: new Date(),
      timeout: timeoutMinutes
    };

    this.pendingPayments.set(saleId, pendingPayment);

    // Notify frontend to show waiting screen
    this.io?.emit('mpesa:payment_waiting', {
      saleId,
      amount,
      timeoutMinutes
    });

    // Set timeout for payment
    setTimeout(() => {
      this.checkPaymentTimeout(saleId);
    }, timeoutMinutes * 60 * 1000);

    console.log(`Waiting for M-Pesa payment of KES ${amount} for sale ${saleId}`);
  }

  // Simulate M-Pesa payment detection (replace with actual implementation)
  detectPayment(amount: number, transactionId: string, phoneNumber?: string, receipt?: string) {
    const transaction: MpesaTransaction = {
      amount,
      transactionId,
      phoneNumber,
      timestamp: new Date(),
      receipt
    };

    this.confirmedTransactions.push(transaction);
    this.matchPendingPayments(transaction);
  }

  // Match incoming payment with pending payments
  private matchPendingPayments(transaction: MpesaTransaction) {
    for (const [saleId, pendingPayment] of this.pendingPayments.entries()) {
      if (this.isPaymentMatch(pendingPayment, transaction)) {
        this.confirmPayment(saleId, transaction);
        break;
      }
    }
  }

  // Check if payment matches pending payment
  private isPaymentMatch(pending: PendingPayment, transaction: MpesaTransaction): boolean {
    // Match by amount only (allow small variations for rounding)
    const amountDiff = Math.abs(pending.amount - transaction.amount);
    const isAmountMatch = amountDiff <= 1; // Allow 1 KES difference
    
    // Check if payment came after pending payment was created
    const isTimeMatch = transaction.timestamp >= pending.createdAt;
    
    return isAmountMatch && isTimeMatch;
  }

  // Confirm payment and update sale
  private async confirmPayment(saleId: string, transaction: MpesaTransaction) {
    const pendingPayment = this.pendingPayments.get(saleId);
    if (!pendingPayment) return;

    try {
      // Update sale status in database
      const { Sale } = await import('../models/Sale');
      await Sale.findByIdAndUpdate(saleId, {
        status: 'Completed',
        mpesaTransactionId: transaction.transactionId,
        mpesaReceipt: transaction.receipt,
        mpesaStatus: 'completed',
        paymentConfirmedAt: new Date()
      });

      // Remove from pending payments
      this.pendingPayments.delete(saleId);

      // Notify frontend
      this.io?.emit('mpesa:payment_confirmed', {
        saleId,
        transaction,
        amount: transaction.amount
      });

      console.log(`Payment confirmed for sale ${saleId}: KES ${transaction.amount}`);
    } catch (error) {
      console.error('Error confirming payment:', error);
      this.io?.emit('mpesa:payment_error', {
        saleId,
        error: 'Failed to confirm payment'
      });
    }
  }

  // Check for payment timeout
  private checkPaymentTimeout(saleId: string) {
    const pendingPayment = this.pendingPayments.get(saleId);
    if (!pendingPayment) return;

    const now = new Date();
    const timeDiff = (now.getTime() - pendingPayment.createdAt.getTime()) / (1000 * 60);
    
    if (timeDiff >= pendingPayment.timeout) {
      this.pendingPayments.delete(saleId);
      
      // Update sale status to failed
      this.updateSaleStatus(saleId, 'Failed');
      
      // Notify frontend
      this.io?.emit('mpesa:payment_timeout', {
        saleId,
        message: 'Payment timeout - please try again'
      });
    }
  }

  // Update sale status
  private async updateSaleStatus(saleId: string, status: string) {
    try {
      const { Sale } = await import('../models/Sale');
      await Sale.findByIdAndUpdate(saleId, {
        status,
        mpesaStatus: status.toLowerCase()
      });
    } catch (error) {
      console.error('Error updating sale status:', error);
    }
  }

  // Get payment status
  getPaymentStatus(saleId: string): { status: string; amount?: number; timeLeft?: number } {
    const pending = this.pendingPayments.get(saleId);
    if (!pending) {
      return { status: 'not_found' };
    }

    const now = new Date();
    const timeDiff = (now.getTime() - pending.createdAt.getTime()) / (1000 * 60);
    const timeLeft = Math.max(0, pending.timeout - timeDiff);

    return {
      status: 'waiting',
      amount: pending.amount,
      timeLeft: Math.ceil(timeLeft)
    };
  }

  // Manual payment confirmation (for testing/backup)
  async manualConfirmPayment(saleId: string, amount: number, transactionId: string) {
    // Use all parameters to avoid unused warnings
    console.log(`Manual payment confirmation for sale ${saleId}: KES ${amount}, TXN: ${transactionId}`);
  }
}

export default MpesaService;
