import { Request, Response } from 'express';
import { Invoice } from '../models';
import { Expense } from '../models';

export class SearchController {
  /**
   * GET /api/v1/accounting/search/entities
   * Search for invoices, expenses, etc. for manual matching
   */
  static async searchEntities(req: Request, res: Response) {
    try {
      const { type, q, amountMin, amountMax, dateFrom, dateTo, limit = '20' } = req.query;
      const filter: any = {};

      // Amount filter
      if (amountMin || amountMax) {
        if (type === 'Invoice') {
          filter.totalAmount = {};
        } else {
          filter.amount = {};
        }
        const amountField = type === 'Invoice' ? 'totalAmount' : 'amount';
        filter[amountField] = {};
        if (amountMin) filter[amountField].$gte = parseFloat(amountMin as string);
        if (amountMax) filter[amountField].$lte = parseFloat(amountMax as string);
      }

      // Date filter
      if (dateFrom || dateTo) {
        const dateField = type === 'Invoice' ? 'createdAt' : 'expenseDate';
        filter[dateField] = {};
        if (dateFrom) filter[dateField].$gte = new Date(dateFrom as string);
        if (dateTo) filter[dateField].$lte = new Date(dateTo as string);
      }

      // Text search
      if (q) {
        if (type === 'Invoice') {
          filter.$or = [
            { invoiceNumber: new RegExp(q as string, 'i') },
            { clientName: new RegExp(q as string, 'i') }
          ];
        } else if (type === 'Expense') {
          filter.$or = [
            { expenseId: new RegExp(q as string, 'i') },
            { description: new RegExp(q as string, 'i') },
            { vendor: new RegExp(q as string, 'i') }
          ];
        }
      }

      // Status filter (only show relevant items)
      if (type === 'Invoice') {
        filter.status = { $in: ['unpaid', 'partial', 'paid'] };
      } else if (type === 'Expense') {
        filter.status = { $in: ['approved', 'paid'] };
      }

      let results: any[] = [];
      if (type === 'Invoice') {
        results = await Invoice.find(filter).limit(parseInt(limit as string)).lean();
      } else if (type === 'Expense') {
        results = await Expense.find(filter).limit(parseInt(limit as string)).lean();
      } else {
        // Could add Payment, JournalEntry later
        return res.json({ success: true, data: [] });
      }

      const mapped = results.map(r => ({
        id: r._id.toString(),
        ref: type === 'Invoice' ? r.invoiceNumber : r.expenseId,
        description: type === 'Invoice' ? r.clientName : (r.description || r.vendor || ''),
        amount: type === 'Invoice' ? r.totalAmount : r.amount,
        date: type === 'Invoice' ? r.createdAt : r.expenseDate
      }));

      res.json({ success: true, data: mapped });
    } catch (error) {
      console.error('Search entities error:', error);
      res.status(500).json({ success: false, error: 'Search failed' });
    }
  }
}