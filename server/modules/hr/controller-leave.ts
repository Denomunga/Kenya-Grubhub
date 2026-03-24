import { Response } from 'express';
import { LeaveService } from './service-leave';
import { Employee as EmployeeModel } from './models';

interface AuthRequest {
  user?: { id: string; role: string; email?: string };
  params: any;
  query: any;
  body: any;
}

export class LeaveController {
  /**
   * Get all leave requests (HR/Admin)
   */
  static async getLeaveRequests(req: AuthRequest, res: Response) {
    try {
      const { status, employeeId, leaveType, page = 1, limit = 50 } = req.query;
      const filters: any = {};
      if (status) filters.status = status;
      if (employeeId) filters.employeeId = employeeId;
      if (leaveType) filters.leaveType = leaveType;

      const result = await LeaveService.getLeaveRequests(filters, Number(page), Number(limit));
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      console.error('Get leave requests error:', error);
      res.status(500).json({ success: false, error: error?.message || 'Failed to get leave requests' });
    }
  }

  /**
   * Get my leave requests (Employee)
   */
  static async getMyLeaves(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });

      // Find employee record for this user
      const employee = await EmployeeModel.findOne({ 
        $or: [{ userId: req.user.id }, { email: req.user.email }] 
      });
      if (!employee) return res.status(404).json({ success: false, error: 'Employee record not found' });

      const leaves = await LeaveService.getMyLeaves(employee._id.toString());
      res.status(200).json({ success: true, data: leaves });
    } catch (error: any) {
      console.error('Get my leaves error:', error);
      res.status(500).json({ success: false, error: error?.message || 'Failed to get leaves' });
    }
  }

  /**
   * Get leave balance (Employee)
   */
  static async getMyLeaveBalance(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });

      const employee = await EmployeeModel.findOne({ 
        $or: [{ userId: req.user.id }, { email: req.user.email }] 
      });
      if (!employee) return res.status(404).json({ success: false, error: 'Employee record not found' });

      const balance = await LeaveService.getLeaveBalance(employee._id.toString());
      res.status(200).json({ success: true, data: balance });
    } catch (error: any) {
      console.error('Get leave balance error:', error);
      res.status(500).json({ success: false, error: error?.message || 'Failed to get leave balance' });
    }
  }

  /**
   * Apply for leave (Employee)
   */
  static async applyLeave(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });

      const employee = await EmployeeModel.findOne({ 
        $or: [{ userId: req.user.id }, { email: req.user.email }] 
      });
      if (!employee) return res.status(404).json({ success: false, error: 'Employee record not found' });

      const { leaveType, startDate, endDate, reason, doctorLetterUrl } = req.body;

      const leave = await LeaveService.applyLeave({
        employeeId: employee._id.toString(),
        leaveType,
        startDate,
        endDate,
        reason,
        doctorLetterUrl,
      });

      res.status(201).json({ success: true, data: leave });
    } catch (error: any) {
      console.error('Apply leave error:', error);
      res.status(400).json({ success: false, error: error?.message || 'Failed to apply for leave' });
    }
  }

  /**
   * Review leave request (HR/Admin)
   */
  static async reviewLeave(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });

      const { id } = req.params;
      const { action, reviewNotes } = req.body;

      if (!['approved', 'rejected'].includes(action)) {
        return res.status(400).json({ success: false, error: 'Action must be approved or rejected' });
      }

      const leave = await LeaveService.reviewLeave(id, req.user.id, action, reviewNotes);
      res.status(200).json({ success: true, data: leave });
    } catch (error: any) {
      console.error('Review leave error:', error);
      res.status(400).json({ success: false, error: error?.message || 'Failed to review leave' });
    }
  }

  /**
   * Cancel leave request (Employee)
   */
  static async cancelLeave(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });

      const employee = await EmployeeModel.findOne({ 
        $or: [{ userId: req.user.id }, { email: req.user.email }] 
      });
      if (!employee) return res.status(404).json({ success: false, error: 'Employee record not found' });

      const { id } = req.params;
      const leave = await LeaveService.cancelLeave(id, employee._id.toString());
      res.status(200).json({ success: true, data: leave });
    } catch (error: any) {
      console.error('Cancel leave error:', error);
      res.status(400).json({ success: false, error: error?.message || 'Failed to cancel leave' });
    }
  }

  /**
   * Get leave stats (HR/Admin)
   */
  static async getLeaveStats(_req: AuthRequest, res: Response) {
    try {
      const stats = await LeaveService.getLeaveStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      console.error('Get leave stats error:', error);
      res.status(500).json({ success: false, error: error?.message || 'Failed to get leave stats' });
    }
  }

  /**
   * Get leave balance for a specific employee (HR/Admin)
   */
  static async getEmployeeLeaveBalance(req: AuthRequest, res: Response) {
    try {
      const { employeeId } = req.params;
      const balance = await LeaveService.getLeaveBalance(employeeId);
      res.status(200).json({ success: true, data: balance });
    } catch (error: any) {
      console.error('Get employee leave balance error:', error);
      res.status(500).json({ success: false, error: error?.message || 'Failed to get leave balance' });
    }
  }
}
