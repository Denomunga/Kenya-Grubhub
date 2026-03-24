import { LeaveRequest } from './models-leave';
import { Contract } from './models-contracts-payslips';
import { Employee as EmployeeModel } from './models';

const generateLeaveId = () => `LV-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

export class LeaveService {
  /**
   * Get all leave requests with filters
   */
  static async getLeaveRequests(filters: any = {}, page = 1, limit = 50) {
    const query: any = {};
    if (filters.status) query.status = filters.status;
    if (filters.employeeId) query.employeeId = filters.employeeId;
    if (filters.leaveType) query.leaveType = filters.leaveType;

    const skip = (page - 1) * limit;
    const leaves = await LeaveRequest.find(query)
      .populate('employeeId', 'firstName lastName email department position employeeId')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await LeaveRequest.countDocuments(query);
    return { leaves, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  /**
   * Get leave requests for a specific employee
   */
  static async getMyLeaves(employeeId: string) {
    return LeaveRequest.find({ employeeId })
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Get leave balance for an employee from their active contract
   */
  static async getLeaveBalance(employeeId: string) {
    // Get active contract for entitlements
    const contract = await Contract.findOne({ employeeId, status: { $in: ['active', 'draft', 'offered'] } })
      .sort({ createdAt: -1 });

    const entitlements = contract?.leaveEntitlements || {
      annualLeave: 21,
      sickLeave: 10,
      maternityLeave: 90,
      paternityLeave: 14,
      compassionateLeave: 3
    };

    // Count approved leaves for current year
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const yearEnd = new Date(new Date().getFullYear(), 11, 31);

    const usedLeaves = await LeaveRequest.aggregate([
      {
        $match: {
          employeeId: contract ? contract.employeeId : employeeId,
          status: 'approved',
          startDate: { $gte: yearStart, $lte: yearEnd }
        }
      },
      {
        $group: {
          _id: '$leaveType',
          totalDays: { $sum: '$totalDays' }
        }
      }
    ]);

    const used: Record<string, number> = {};
    usedLeaves.forEach((u: any) => { used[u._id] = u.totalDays; });

    return {
      entitlements,
      used: {
        annual: used['annual'] || 0,
        sick: used['sick'] || 0,
        maternity: used['maternity'] || 0,
        paternity: used['paternity'] || 0,
        compassionate: used['compassionate'] || 0,
        unpaid: used['unpaid'] || 0,
      },
      remaining: {
        annual: entitlements.annualLeave - (used['annual'] || 0),
        sick: entitlements.sickLeave - (used['sick'] || 0),
        maternity: entitlements.maternityLeave - (used['maternity'] || 0),
        paternity: entitlements.paternityLeave - (used['paternity'] || 0),
        compassionate: entitlements.compassionateLeave - (used['compassionate'] || 0),
      }
    };
  }

  /**
   * Apply for leave
   */
  static async applyLeave(data: {
    employeeId: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    doctorLetterUrl?: string;
  }) {
    // Validate sick leave requires doctor letter
    if (data.leaveType === 'sick' && !data.doctorLetterUrl) {
      throw new Error('Doctor letter is required for sick leave applications');
    }

    // Calculate total days (excluding weekends)
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end < start) throw new Error('End date must be after start date');

    let totalDays = 0;
    const current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) totalDays++; // Exclude weekends
      current.setDate(current.getDate() + 1);
    }

    if (totalDays === 0) throw new Error('Leave must be at least 1 working day');

    // Check balance (except unpaid)
    if (data.leaveType !== 'unpaid') {
      const balance = await this.getLeaveBalance(data.employeeId);
      const typeMap: Record<string, string> = {
        annual: 'annual', sick: 'sick', maternity: 'maternity',
        paternity: 'paternity', compassionate: 'compassionate'
      };
      const key = typeMap[data.leaveType] as keyof typeof balance.remaining;
      if (key && balance.remaining[key] !== undefined && balance.remaining[key] < totalDays) {
        throw new Error(`Insufficient ${data.leaveType} leave balance. Remaining: ${balance.remaining[key]} days, Requested: ${totalDays} days`);
      }
    }

    const leave = new LeaveRequest({
      leaveId: generateLeaveId(),
      employeeId: data.employeeId,
      leaveType: data.leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      reason: data.reason,
      doctorLetterUrl: data.doctorLetterUrl,
    });

    return leave.save();
  }

  /**
   * Approve or reject a leave request
   */
  static async reviewLeave(leaveId: string, reviewerId: string, action: 'approved' | 'rejected', reviewNotes?: string) {
    const leave = await LeaveRequest.findById(leaveId);
    if (!leave) throw new Error('Leave request not found');
    if (leave.status !== 'pending') throw new Error('Only pending leave requests can be reviewed');

    leave.status = action;
    leave.reviewedBy = reviewerId as any;
    leave.reviewedAt = new Date();
    if (reviewNotes) leave.reviewNotes = reviewNotes;

    // If approved, update employee status to on_leave if leave starts today or earlier
    if (action === 'approved') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (leave.startDate <= today) {
        await EmployeeModel.findByIdAndUpdate(leave.employeeId, { status: 'on_leave' });
      }
    }

    return leave.save();
  }

  /**
   * Cancel a leave request (by employee)
   */
  static async cancelLeave(leaveId: string, employeeId: string) {
    const leave = await LeaveRequest.findOne({ _id: leaveId, employeeId });
    if (!leave) throw new Error('Leave request not found');
    if (leave.status !== 'pending') throw new Error('Only pending leave requests can be cancelled');

    leave.status = 'cancelled';
    return leave.save();
  }

  /**
   * Get leave stats for dashboard
   */
  static async getLeaveStats() {
    const [pending, approved, rejected] = await Promise.all([
      LeaveRequest.countDocuments({ status: 'pending' }),
      LeaveRequest.countDocuments({ status: 'approved' }),
      LeaveRequest.countDocuments({ status: 'rejected' }),
    ]);
    return { pending, approved, rejected };
  }
}
