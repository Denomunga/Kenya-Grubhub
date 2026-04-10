import { Request, Response } from 'express';
import { BankReconciliationService } from '../services/bankReconciliationService';
import { BankStatement } from '../models'; // ✅ ADD THIS LINE



export class BankReconciliationController {
  static async uploadStatement(req: Request, res: Response) {
  try {
    const file = (req as any).file;
    if (!file) {
      console.warn('⚠️ No file uploaded');
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { bankAccountCode } = req.body;
    if (!bankAccountCode) {
      console.warn('⚠️ Missing bankAccountCode');
      return res.status(400).json({ success: false, error: 'bankAccountCode is required' });
    }

    console.log(`📄 Processing file: ${file.originalname}, size: ${file.size} bytes, bank account: ${bankAccountCode}`);

    const statement = await BankReconciliationService.uploadStatement(
      file.buffer,
      file.originalname,
      bankAccountCode
    );

    res.status(201).json({ success: true, data: statement });
  } catch (error: any) {
    // 🔴 CRITICAL: Log full error details
    console.error('❌ BANK RECONCILIATION UPLOAD FAILED:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('Request file:', (req as any).file?.originalname);
    console.error('Request body:', req.body);

    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Inside BankReconciliationController class, add:

/**
 * GET /api/v1/accounting/reconciliation/statement/:statementId
 */
static async getStatementDetails(req: Request, res: Response) {
  try {
    const { statementId } = req.params;
    const statement = await BankStatement.findOne({ statementId }).lean();
    if (!statement) {
      return res.status(404).json({ success: false, error: 'Statement not found' });
    }
    res.json({ success: true, data: statement });
  } catch (error: any) {
    console.error('Get statement details error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/v1/accounting/reconciliation/statements
 * Optional query params: ?status=pending&limit=50&page=1
 */
static async getAllStatements(req: Request, res: Response) {
  try {
    const { status, bankAccountCode, page = 1, limit = 20 } = req.query;
    const filter: any = {};
    if (status) filter.status = status;
    if (bankAccountCode) filter.bankAccountCode = bankAccountCode;

    const skip = (Number(page) - 1) * Number(limit);
    const statements = await BankStatement.find(filter)
      .sort({ statementDate: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await BankStatement.countDocuments(filter);
    res.json({
      success: true,
      data: statements,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Get all statements error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/v1/accounting/reconciliation/:statementId/finalize
 * Marks statement as reconciled and optionally creates adjustment if needed
 */
static async finalizeReconciliation(req: Request, res: Response) {
  try {
    const { statementId } = req.params;
    const { adjustmentAmount, adjustmentDescription } = req.body;
    const userId = (req as any).user?.id || 'system';

    const statement = await BankStatement.findOne({ statementId });
    if (!statement) {
      return res.status(404).json({ success: false, error: 'Statement not found' });
    }

    // Optional: create adjustment if amount provided
    if (adjustmentAmount && Math.abs(adjustmentAmount) > 0.01) {
      await BankReconciliationService.createAdjustment(
        statementId,
        adjustmentAmount,
        adjustmentDescription || 'Reconciliation adjustment',
        userId
      );
    } else {
      // Just mark as reconciled
      statement.status = 'reconciled';
      await statement.save();
    }

    res.json({ success: true, message: 'Reconciliation finalized successfully' });
  } catch (error: any) {
    console.error('Finalize reconciliation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}


//
  static async autoMatch(req: Request, res: Response) {
    try {
      const { statementId } = req.params;
      const statement = await BankReconciliationService.autoMatchStatement(statementId);
      res.json({ success: true, data: statement });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async manualMatch(req: Request, res: Response) {
    try {
      const { statementId, transactionId } = req.params;
      const { entityType, entityId, entityRef } = req.body;
      const statement = await BankReconciliationService.manualMatch(statementId, transactionId, { entityType, entityId, entityRef });
      res.json({ success: true, data: statement });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async createAdjustment(req: Request, res: Response) {
    try {
      const { statementId } = req.params;
      const { amount, description } = req.body;
      const userId = (req as any).user.id;
      const adjustment = await BankReconciliationService.createAdjustment(statementId, amount, description, userId);
      res.json({ success: true, data: adjustment });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getReconciliationStatus(req: Request, res: Response) {
    try {
      const { bankAccountCode } = req.params;
      const status = await BankReconciliationService.getReconciliationStatus(bankAccountCode);
      res.json({ success: true, data: status });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}