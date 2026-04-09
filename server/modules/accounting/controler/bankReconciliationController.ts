import { Request, Response } from 'express';
import { BankReconciliationService } from '../services/bankReconciliationService';

export class BankReconciliationController {
  static async uploadStatement(req: Request, res: Response) {
    try {
      const file = (req as any).file;
      if (!file) return res.status(400).json({ success: false, error: 'No file uploaded' });
      const { bankAccountCode } = req.body;
      const statement = await BankReconciliationService.uploadStatement(file.buffer, file.originalname, bankAccountCode);
      res.status(201).json({ success: true, data: statement });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

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