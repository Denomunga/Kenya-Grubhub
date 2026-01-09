import { Router } from "express";
import axios from "axios";
import RealMpesaService from "../services/realMpesaService";

const router = Router();

// Register C2B URLs (for receiving M-Pesa callbacks)
router.post("/c2b/v1/registerurl", async (req, res) => {
  try {
    const { ValidationURL, ConfirmationURL, ShortCode } = req.body;
    
    if (!ValidationURL || !ConfirmationURL || !ShortCode) {
      return res.status(400).json({ 
        message: "ValidationURL, ConfirmationURL, and ShortCode are required" 
      });
    }

    const mpesaService = new RealMpesaService();
    const token = await (mpesaService as any).generateAccessToken();
    
    console.log('Registering C2B URLs with M-Pesa...');
    console.log(`Validation URL: ${ValidationURL}`);
    console.log(`Confirmation URL: ${ConfirmationURL}`);
    console.log(`Short Code: ${ShortCode}`);
    
    // Call M-Pesa API to register C2B URLs
    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl',
      {
        ShortCode: ShortCode,
        ResponseType: 'Completed',
        ConfirmationURL: ConfirmationURL,
        ValidationURL: ValidationURL
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ C2B URLs registered successfully:', response.data);
    
    res.json(response.data);
  } catch (error) {
    console.error("❌ Error registering C2B URLs:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      console.error('Response status:', axiosError.response?.status);
      console.error('Response data:', axiosError.response?.data);
    }
    res.status(500).json({ message: "Server error" });
  }
});

// C2B Validation URL (M-Pesa calls this to validate transactions)
router.post("/c2b/v1/validate", async (req, res) => {
  try {
    const { TransID, TransAmount, MSISDN, BillRefNumber } = req.body;
    
    // Log transaction details for validation
    console.log(`Validating transaction: ${TransID} - KES ${TransAmount} from ${MSISDN} for ${BillRefNumber}`);
    
    // Validate transaction (you can add your business logic here)
    // For now, accept all transactions
    res.json({
      ResponseCode: "0",
      ResponseDesc: "Success"
    });
  } catch (error) {
    console.error("Error validating C2B transaction:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// C2B Confirmation URL (M-Pesa calls this to confirm completed transactions)
router.post("/c2b/v1/confirm", async (req, res) => {
  try {
    const { 
      TransactionType, 
      TransID, 
      TransTime, 
      TransAmount, 
      BusinessShortCode, 
      BillRefNumber, 
      MSISDN, 
      FirstName 
    } = req.body;
    
    // Process the confirmed transaction
    console.log(`C2B Transaction confirmed: ${TransID} - KES ${TransAmount} from ${MSISDN} for sale ${BillRefNumber}`);
    console.log(`Transaction details:`, {
      TransactionType,
      TransTime,
      BusinessShortCode,
      CustomerName: FirstName
    });
    
    // Find the pending sale by BillRefNumber (sale ID)
    try {
      const { Sale } = await import('../models/Sale');
      const sale = await Sale.findOne({ 
        _id: BillRefNumber, 
        status: 'Pending',
        mpesaStatus: 'pending' 
      });
      
      if (sale) {
        // Update sale status to 'Completed'
        await Sale.findByIdAndUpdate(sale._id, {
          status: 'Completed',
          mpesaStatus: 'completed',
          mpesaTransactionId: TransID,
          mpesaReceipt: TransID,
          mpesaPhoneNumber: MSISDN,
          paymentConfirmedAt: new Date(),
          $push: {
            auditLog: {
              action: 'mpesa_payment_confirmed',
              user: 'system',
              timestamp: new Date(),
              details: {
                transId: TransID,
                amount: TransAmount,
                phoneNumber: MSISDN,
                customerName: FirstName
              }
            }
          }
        });
        
        // Deduct inventory for confirmed payment
        const { Product } = await import('../models/Product');
        for (const item of sale.items) {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: -item.quantity }
          });
        }
        
        console.log(`Sale ${BillRefNumber} marked as completed and inventory deducted`);
        
        // Emit socket event for real-time frontend update
        const reqApp = req.app as any;
        reqApp.locals.io?.emit('mpesa:payment_confirmed', {
          saleId: BillRefNumber,
          transactionId: TransID,
          amount: TransAmount,
          phoneNumber: MSISDN,
          customerName: FirstName
        });
        
      } else {
        console.log(`No pending sale found for BillRefNumber: ${BillRefNumber}`);
      }
      
    } catch (dbError) {
      console.error('Error updating sale in database:', dbError);
    }
    
    res.json({
      ResponseCode: "0",
      ResponseDesc: "Success"
    });
  } catch (error) {
    console.error("Error confirming C2B transaction:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// STK Push Callback URL (for STK Push payment notifications)
router.post("/callback", async (req, res) => {
  try {
    const { Body } = req.body;
    const { stkCallback } = Body;
    
    const { ResultCode, ResultDesc, CallbackMetadata } = stkCallback;
    
    if (ResultCode === 0) {
      // Payment successful
      const { Amount, MpesaReceiptNumber, PhoneNumber } = CallbackMetadata.Item.reduce((acc: any, item: any) => {
        acc[item.Name] = item.Value;
        return acc;
      }, {});
      
      console.log(`STK Push successful: ${MpesaReceiptNumber} - KES ${Amount} from ${PhoneNumber}`);
      
      // Update sale status in database
      // You would typically find the sale by CheckoutRequestID and update it
      
    } else {
      // Payment failed
      console.log(`STK Push failed: ${ResultDesc} (Code: ${ResultCode})`);
      
      // Update sale status to failed
    }
    
    res.json({
      ResponseCode: "0",
      ResponseDesc: "Success"
    });
  } catch (error) {
    console.error("Error processing M-Pesa callback:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get payment status for a sale
router.get("/status/:saleId", async (_req, res) => {
  try {
    // For now, return not found since we don't have a direct status method
    res.json({ status: 'not_found' });
  } catch (error) {
    console.error("Error getting payment status:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Simulate C2B transaction (for testing)
router.post("/c2b/v1/simulate", async (req, res) => {
  try {
    const { 
      ShortCode, 
      Msisdn, 
      Amount, 
      BillRefNumber, 
      CommandID = 'CustomerPayBillOnline' 
    } = req.body;
    
    if (!ShortCode || !Msisdn || !Amount || !BillRefNumber) {
      return res.status(400).json({ 
        message: "ShortCode, Msisdn, Amount, and BillRefNumber are required" 
      });
    }

    const mpesaService = new RealMpesaService();
    const token = await (mpesaService as any).generateAccessToken();
    
    console.log('Simulating C2B transaction with M-Pesa...');
    console.log(`Short Code: ${ShortCode}`);
    console.log(`MSISDN: ${Msisdn}`);
    console.log(`Amount: ${Amount}`);
    console.log(`Bill Reference: ${BillRefNumber}`);
    
    // Call M-Pesa API to simulate C2B transaction
    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/c2b/v1/simulate',
      {
        ShortCode: ShortCode,
        CommandID: CommandID,
        Amount: Amount,
        Msisdn: Msisdn,
        BillRefNumber: BillRefNumber
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ C2B transaction simulated successfully:', response.data);
    
    res.json(response.data);
  } catch (error) {
    console.error("❌ Error simulating C2B transaction:", error);
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      console.error('Response status:', axiosError.response?.status);
      console.error('Response data:', axiosError.response?.data);
    }
    res.status(500).json({ message: "Server error" });
  }
});

// Manual payment confirmation (for testing/backup)
router.post("/confirm", async (req, res) => {
  try {
    const { saleId, amount, transactionId } = req.body;
    
    if (!saleId || !amount || !transactionId) {
      return res.status(400).json({ 
        message: "Sale ID, amount, and transaction ID are required" 
      });
    }

    const mpesaService = new RealMpesaService();
    await (mpesaService as any).manualConfirmPayment(saleId, amount, transactionId);
    
    res.json({ message: "Payment confirmed successfully" });
  } catch (error) {
    console.error("Error confirming payment:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
