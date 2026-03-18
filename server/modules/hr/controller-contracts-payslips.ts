import { Request, Response } from 'express';
import { ContractService, PayslipService } from './service-contracts-payslips';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

/**
 * Contract Controller
 */
export class ContractController {
  static async getContracts(req: AuthRequest, res: Response) {
    try {
      const { status, employeeId, contractType, page = 1, limit = 50 } = req.query;
      const filters: any = {};
      
      if (status) filters.status = status;
      if (employeeId) filters.employeeId = employeeId;
      if (contractType) filters.contractType = contractType;

      const result = await ContractService.getContracts(filters, Number(page), Number(limit));
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Get contracts error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to get contracts'
      });
    }
  }

  static async getContractById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const contract = await ContractService.getContractById(id);
      
      if (!contract) {
        return res.status(404).json({
          success: false,
          error: 'Contract not found'
        });
      }

      res.status(200).json({
        success: true,
        data: contract
      });
    } catch (error: any) {
      console.error('Get contract error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to get contract'
      });
    }
  }

  static async createContract(req: AuthRequest, res: Response) {
    try {
      const contract = await ContractService.createContract(req.body);
      res.status(201).json({
        success: true,
        data: contract
      });
    } catch (error: any) {
      console.error('Create contract error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to create contract'
      });
    }
  }

  static async updateContract(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const contract = await ContractService.updateContract(id, req.body);
      
      if (!contract) {
        return res.status(404).json({
          success: false,
          error: 'Contract not found'
        });
      }

      res.status(200).json({
        success: true,
        data: contract
      });
    } catch (error: any) {
      console.error('Update contract error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to update contract'
      });
    }
  }

  static async deleteContract(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const contract = await ContractService.deleteContract(id);
      
      if (!contract) {
        return res.status(404).json({
          success: false,
          error: 'Contract not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Contract deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete contract error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to delete contract'
      });
    }
  }

  static async getExpiringContracts(req: AuthRequest, res: Response) {
    try {
      const { days = 30 } = req.query;
      const contracts = await ContractService.getExpiringContracts(Number(days));
      res.status(200).json({
        success: true,
        data: contracts
      });
    } catch (error: any) {
      console.error('Get expiring contracts error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to get expiring contracts'
      });
    }
  }

  static async getContractStats(_req: AuthRequest, res: Response) {
    try {
      const stats = await ContractService.getContractStats();
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Get contract stats error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to get contract stats'
      });
    }
  }
}

/**
 * Payslip Controller
 */
export class PayslipController {
  static async getPayslips(req: AuthRequest, res: Response) {
    try {
      const { status, employeeId, month, year, page = 1, limit = 50 } = req.query;
      const filters: any = {};
      
      if (status) filters.status = status;
      if (employeeId) filters.employeeId = employeeId;
      if (month) filters.month = Number(month);
      if (year) filters.year = Number(year);

      const result = await PayslipService.getPayslips(filters, Number(page), Number(limit));
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Get payslips error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to get payslips'
      });
    }
  }

  static async getPayslipById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const payslip = await PayslipService.getPayslipById(id);
      
      if (!payslip) {
        return res.status(404).json({
          success: false,
          error: 'Payslip not found'
        });
      }

      res.status(200).json({
        success: true,
        data: payslip
      });
    } catch (error: any) {
      console.error('Get payslip error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to get payslip'
      });
    }
  }

  static async createPayslip(req: AuthRequest, res: Response) {
    try {
      const payslip = await PayslipService.createPayslip(req.body);
      res.status(201).json({
        success: true,
        data: payslip
      });
    } catch (error: any) {
      console.error('Create payslip error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to create payslip'
      });
    }
  }

  static async updatePayslip(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const payslip = await PayslipService.updatePayslip(id, req.body);
      
      if (!payslip) {
        return res.status(404).json({
          success: false,
          error: 'Payslip not found'
        });
      }

      res.status(200).json({
        success: true,
        data: payslip
      });
    } catch (error: any) {
      console.error('Update payslip error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to update payslip'
      });
    }
  }

  static async deletePayslip(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const payslip = await PayslipService.deletePayslip(id);
      
      if (!payslip) {
        return res.status(404).json({
          success: false,
          error: 'Payslip not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Payslip deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete payslip error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to delete payslip'
      });
    }
  }

  static async approvePayslip(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const payslip = await PayslipService.approvePayslip(id, req.user?.id || '');
      
      if (!payslip) {
        return res.status(404).json({
          success: false,
          error: 'Payslip not found'
        });
      }

      res.status(200).json({
        success: true,
        data: payslip
      });
    } catch (error: any) {
      console.error('Approve payslip error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to approve payslip'
      });
    }
  }

  static async markPayslipPaid(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const payslip = await PayslipService.markPayslipPaid(id);
      
      if (!payslip) {
        return res.status(404).json({
          success: false,
          error: 'Payslip not found'
        });
      }

      res.status(200).json({
        success: true,
        data: payslip
      });
    } catch (error: any) {
      console.error('Mark payslip paid error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to mark payslip as paid'
      });
    }
  }

  static async getPayslipsByEmployee(req: AuthRequest, res: Response) {
    try {
      const { employeeId } = req.params;
      const payslips = await PayslipService.getPayslipsByEmployee(employeeId);
      res.status(200).json({
        success: true,
        data: payslips
      });
    } catch (error: any) {
      console.error('Get payslips by employee error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to get payslips'
      });
    }
  }

  static async getPayslipStats(_req: AuthRequest, res: Response) {
    try {
      const stats = await PayslipService.getPayslipStats();
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Get payslip stats error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to get payslip stats'
      });
    }
  }

  static async generatePayslipForEmployee(req: AuthRequest, res: Response) {
    try {
      const { employeeId } = req.params;
      const { month, year } = req.body;
      
      if (!month || !year) {
        return res.status(400).json({
          success: false,
          error: 'Month and year are required'
        });
      }

      const payslip = await PayslipService.generatePayslipForEmployee(
        employeeId,
        Number(month),
        Number(year)
      );
      
      res.status(201).json({
        success: true,
        data: payslip
      });
    } catch (error: any) {
      console.error('Generate payslip error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to generate payslip'
      });
    }
  }

  static async generateBulkPayslips(req: AuthRequest, res: Response) {
    try {
      const { month, year, employeeIds } = req.body;
      
      if (!month || !year) {
        return res.status(400).json({
          success: false,
          error: 'Month and year are required'
        });
      }

      const results = [];
      const errors = [];

      for (const employeeId of employeeIds || []) {
        try {
          const payslip = await PayslipService.generatePayslipForEmployee(
            employeeId,
            Number(month),
            Number(year)
          );
          results.push(payslip);
        } catch (err: any) {
          errors.push({ employeeId, error: err.message });
        }
      }

      res.status(201).json({
        success: true,
        data: {
          created: results.length,
          failed: errors.length,
          payslips: results,
          errors
        }
      });
    } catch (error: any) {
      console.error('Generate bulk payslips error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to generate payslips'
      });
    }
  }
}
