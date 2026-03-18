import { Contract, Payslip, IContract, IPayslip } from './models-contracts-payslips';
import { Employee as EmployeeModel } from './models';

// Helper to generate unique IDs
const generateContractId = () => `CON-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generatePayslipId = () => `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Contract Service
 */
export class ContractService {
  static async getContracts(filters: any = {}, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (filters.status) query.status = filters.status;
    if (filters.employeeId) query.employeeId = filters.employeeId;
    if (filters.contractType) query.contractType = filters.contractType;

    const [contracts, total] = await Promise.all([
      Contract.find(query)
        .populate('employeeId', 'firstName lastName email department position')
        .populate('signedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Contract.countDocuments(query)
    ]);

    return {
      contracts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async getContractById(id: string) {
    return Contract.findById(id)
      .populate('employeeId', 'firstName lastName email department position salary currency')
      .populate('signedBy', 'firstName lastName');
  }

  static async createContract(data: Partial<IContract>) {
    const contract = new Contract({
      ...data,
      contractId: generateContractId()
    });
    return contract.save();
  }

  static async updateContract(id: string, data: Partial<IContract>) {
    return Contract.findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .populate('employeeId', 'firstName lastName email department position');
  }

  static async deleteContract(id: string) {
    return Contract.findByIdAndDelete(id);
  }

  static async getExpiringContracts(days: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return Contract.find({
      status: 'active',
      endDate: { $exists: true, $lte: futureDate, $gte: new Date() }
    })
      .populate('employeeId', 'firstName lastName email department position')
      .sort({ endDate: 1 });
  }

  static async getContractStats() {
    const [total, active, expired, byType] = await Promise.all([
      Contract.countDocuments(),
      Contract.countDocuments({ status: 'active' }),
      Contract.countDocuments({ status: 'expired' }),
      Contract.aggregate([
        { $group: { _id: '$contractType', count: { $sum: 1 } } }
      ])
    ]);

    return { total, active, expired, byType };
  }
}

/**
 * Payslip Service
 */
export class PayslipService {
  static async getPayslips(filters: any = {}, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (filters.status) query.status = filters.status;
    if (filters.employeeId) query.employeeId = filters.employeeId;
    if (filters.month && filters.year) {
      query['payPeriod.month'] = filters.month;
      query['payPeriod.year'] = filters.year;
    }

    const [payslips, total] = await Promise.all([
      Payslip.find(query)
        .populate('employeeId', 'firstName lastName email department position employeeId')
        .populate('approvedBy', 'firstName lastName')
        .sort({ payDate: -1 })
        .skip(skip)
        .limit(limit),
      Payslip.countDocuments(query)
    ]);

    return {
      payslips,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async getPayslipById(id: string) {
    return Payslip.findById(id)
      .populate('employeeId', 'firstName lastName email department position employeeId bankDetails')
      .populate('approvedBy', 'firstName lastName');
  }

  static async createPayslip(data: Partial<IPayslip>) {
    const payslip = new Payslip({
      ...data,
      payslipId: generatePayslipId()
    });
    return payslip.save();
  }

  static async updatePayslip(id: string, data: Partial<IPayslip>) {
    return Payslip.findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .populate('employeeId', 'firstName lastName email department position');
  }

  static async deletePayslip(id: string) {
    return Payslip.findByIdAndDelete(id);
  }

  static async approvePayslip(id: string, approvedBy: string) {
    return Payslip.findByIdAndUpdate(
      id,
      {
        status: 'approved',
        approvedBy,
        approvedAt: new Date()
      },
      { new: true }
    ).populate('employeeId', 'firstName lastName email department position');
  }

  static async markPayslipPaid(id: string) {
    return Payslip.findByIdAndUpdate(
      id,
      {
        status: 'paid',
        paidAt: new Date()
      },
      { new: true }
    ).populate('employeeId', 'firstName lastName email department position');
  }

  static async getPayslipsByEmployee(employeeId: string) {
    return Payslip.find({ employeeId })
      .sort({ payDate: -1 })
      .populate('approvedBy', 'firstName lastName');
  }

  static async getPayslipStats() {
    const [total, draft, approved, paid, totalNetPay] = await Promise.all([
      Payslip.countDocuments(),
      Payslip.countDocuments({ status: 'draft' }),
      Payslip.countDocuments({ status: 'approved' }),
      Payslip.countDocuments({ status: 'paid' }),
      Payslip.aggregate([
        { $group: { _id: null, total: { $sum: '$netPay' } } }
      ])
    ]);

    return {
      total,
      draft,
      approved,
      paid,
      totalNetPay: totalNetPay[0]?.total || 0
    };
  }

  static async generatePayslipForEmployee(employeeId: string, month: number, year: number) {
    const employee = await EmployeeModel.findById(employeeId);
    if (!employee) throw new Error('Employee not found');

    // Check if payslip already exists for this period
    const existing = await Payslip.findOne({
      employeeId,
      'payPeriod.month': month,
      'payPeriod.year': year
    });
    if (existing) throw new Error('Payslip already exists for this period');

    // Calculate basic values
    const basicSalary = employee.salary;
    const allowances: any[] = [];
    const bonuses: any[] = [];
    
    // Calculate Kenyan statutory deductions
    const paye = this.calculatePAYE(basicSalary);
    const nssf = this.calculateNSSF(basicSalary);
    const nhif = this.calculateNHIF(basicSalary);
    
    const totalEarnings = basicSalary + 
      allowances.reduce((sum, a) => sum + a.amount, 0) +
      bonuses.reduce((sum, b) => sum + b.amount, 0);
    
    const totalDeductions = paye + nssf + nhif;
    const netPay = totalEarnings - totalDeductions;

    const payslip = new Payslip({
      payslipId: generatePayslipId(),
      employeeId,
      payPeriod: { month, year },
      payDate: new Date(year, month, 25), // 25th of the month
      basicSalary,
      allowances,
      bonuses,
      overtimeHours: 0,
      overtimeRate: 0,
      overtimePay: 0,
      totalEarnings,
      paye,
      nssf,
      nhif,
      otherDeductions: [],
      totalDeductions,
      netPay,
      currency: employee.currency || 'KES',
      employerNssf: nssf,
      employerNhif: nhif,
      status: 'draft',
      paymentMethod: 'bank_transfer',
      bankDetails: employee.bankDetails
    });

    return payslip.save();
  }

  // Kenyan Tax Calculations
  private static calculatePAYE(salary: number): number {
    // Kenya PAYE rates 2024
    const annualSalary = salary * 12;
    const personalRelief = 2400 * 12; // Monthly personal relief
    const taxableIncome = annualSalary - personalRelief;
    
    let paye = 0;
    if (taxableIncome <= 0) return 0;
    
    // Tax bands (simplified)
    if (taxableIncome <= 288000) {
      paye = taxableIncome * 0.10;
    } else if (taxableIncome <= 388000) {
      paye = 28800 + (taxableIncome - 288000) * 0.25;
    } else {
      paye = 28800 + 25000 + (taxableIncome - 388000) * 0.30;
    }
    
    return Math.max(0, Math.round(paye / 12));
  }

  private static calculateNSSF(salary: number): number {
    // NSSF Tier I - 6% of pensionable earnings, max 2160
    const rate = 0.06;
    const maxContribution = 2160;
    return Math.min(Math.round(salary * rate), maxContribution);
  }

  private static calculateNHIF(salary: number): number {
    // NHIF rates 2024 (simplified)
    if (salary <= 5999) return 150;
    if (salary <= 7999) return 300;
    if (salary <= 11999) return 400;
    if (salary <= 14999) return 500;
    if (salary <= 19999) return 600;
    if (salary <= 24999) return 750;
    if (salary <= 29999) return 850;
    if (salary <= 34999) return 900;
    if (salary <= 39999) return 950;
    if (salary <= 44999) return 1000;
    if (salary <= 49999) return 1100;
    if (salary <= 59999) return 1200;
    if (salary <= 69999) return 1300;
    if (salary <= 79999) return 1400;
    if (salary <= 89999) return 1500;
    if (salary <= 99999) return 1600;
    return 1700; // Above 100,000
  }
}
