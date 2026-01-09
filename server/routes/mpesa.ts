import { Router } from "express";
import MpesaService from "../services/mpesaService";

const router = Router();

// Get payment status for a sale
router.get("/status/:saleId", async (req, res) => {
  try {
    const { saleId } = req.params;
    const mpesaService = new MpesaService();
    const status = mpesaService.getPaymentStatus(saleId);
    
    res.json(status);
  } catch (error) {
    console.error("Error getting payment status:", error);
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

    const mpesaService = new MpesaService();
    await mpesaService.manualConfirmPayment(saleId, amount, transactionId);
    
    res.json({ message: "Payment confirmed successfully" });
  } catch (error) {
    console.error("Error confirming payment:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Simulate payment detection (for testing)
router.post("/simulate-payment", async (req, res) => {
  try {
    const { amount, transactionId, phoneNumber, receipt } = req.body;
    
    if (!amount || !transactionId) {
      return res.status(400).json({ 
        message: "Amount and transaction ID are required" 
      });
    }

    const mpesaService = new MpesaService();
    mpesaService.detectPayment(amount, transactionId, phoneNumber, receipt);
    
    res.json({ message: "Payment simulated successfully" });
  } catch (error) {
    console.error("Error simulating payment:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
