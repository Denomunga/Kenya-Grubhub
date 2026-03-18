import {
  Employee,
  IEmployee,
  JobPosting,
  IJobPosting,
  JobApplication,
  IJobApplication,
  Payroll,
  IPayroll
} from './models';

/**
 * HR Service
 * Handles employee management, job postings, applications, and payroll
 */

// ============================================================
// EMPLOYEE SERVICE
// ============================================================
export class EmployeeService {
  static async getEmployees(filters: any = {}, page = 1, limit = 50) {
    try {
      const query: any = {};

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.department) {
        query.department = filters.department;
      }

      if (filters.search) {
        query.$or = [
          { firstName: { $regex: filters.search, $options: 'i' } },
          { lastName: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
          { employeeId: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;

      const employees = await Employee
        .find(query)
        .populate('managerId', 'firstName lastName employeeId')
        .sort({ hireDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Employee.countDocuments(query);

      return {
        employees,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch employees: ${error?.message || String(error)}`);
    }
  }

  static async getEmployeeById(id: string) {
    try {
      const employee = await Employee
        .findById(id)
        .populate('managerId', 'firstName lastName employeeId')
        .populate('userId', 'email role');

      if (!employee) throw new Error('Employee not found');
      return employee;
    } catch (error: any) {
      throw new Error(`Failed to fetch employee: ${error?.message || String(error)}`);
    }
  }

  static async createEmployee(data: Partial<IEmployee>) {
    try {
      // Generate unique employee ID
      const employeeId = `EMP-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Check if email already exists
      const existingEmployee = await Employee.findOne({ email: data.email });
      if (existingEmployee) throw new Error('Employee with this email already exists');

      const employee = new Employee({
        ...data,
        employeeId
      });

      await employee.save();
      return employee;
    } catch (error: any) {
      throw new Error(`Failed to create employee: ${error?.message || String(error)}`);
    }
  }

  static async updateEmployee(id: string, data: Partial<IEmployee>) {
    try {
      const employee = await Employee.findByIdAndUpdate(
        id,
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!employee) throw new Error('Employee not found');
      return employee;
    } catch (error: any) {
      throw new Error(`Failed to update employee: ${error?.message || String(error)}`);
    }
  }

  static async deleteEmployee(id: string) {
    try {
      const employee = await Employee.findByIdAndDelete(id);
      if (!employee) throw new Error('Employee not found');
      return employee;
    } catch (error: any) {
      throw new Error(`Failed to delete employee: ${error?.message || String(error)}`);
    }
  }

  static async getEmployeeStats() {
    try {
      const stats = await Employee.aggregate([
        {
          $group: {
            _id: null,
            totalEmployees: { $sum: 1 },
            activeEmployees: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            departments: { $addToSet: '$department' },
            avgSalary: { $avg: '$salary' }
          }
        }
      ]);

      const departmentStats = await Employee.aggregate([
        {
          $group: {
            _id: '$department',
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        overview: stats[0] || {
          totalEmployees: 0,
          activeEmployees: 0,
          departments: [],
          avgSalary: 0
        },
        departmentBreakdown: departmentStats
      };
    } catch (error: any) {
      throw new Error(`Failed to get employee stats: ${error?.message || String(error)}`);
    }
  }
}

// ============================================================
// JOB POSTING SERVICE
// ============================================================
export class JobPostingService {
  static async getJobPostings(filters: any = {}, page = 1, limit = 50) {
    try {
      const query: any = {};

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.department) {
        query.department = filters.department;
      }

      if (filters.search) {
        query.$or = [
          { title: { $regex: filters.search, $options: 'i' } },
          { department: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;

      const jobs = await JobPosting
        .find(query)
        .populate('postedBy', 'firstName lastName employeeId')
        .sort({ postedDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await JobPosting.countDocuments(query);

      return {
        jobs,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch job postings: ${error?.message || String(error)}`);
    }
  }

  static async getJobPostingById(id: string) {
    try {
      const job = await JobPosting
        .findById(id)
        .populate('postedBy', 'firstName lastName employeeId');

      if (!job) throw new Error('Job posting not found');
      return job;
    } catch (error: any) {
      throw new Error(`Failed to fetch job posting: ${error?.message || String(error)}`);
    }
  }

  static async createJobPosting(data: Partial<IJobPosting>, postedBy: string) {
    try {
      // Generate unique job ID
      const jobId = `JOB-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      const jobPosting = new JobPosting({
        ...data,
        jobId,
        postedBy
      });

      await jobPosting.save();
      return jobPosting;
    } catch (error: any) {
      throw new Error(`Failed to create job posting: ${error?.message || String(error)}`);
    }
  }

  static async updateJobPosting(id: string, data: Partial<IJobPosting>) {
    try {
      const jobPosting = await JobPosting.findByIdAndUpdate(
        id,
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!jobPosting) throw new Error('Job posting not found');
      return jobPosting;
    } catch (error: any) {
      throw new Error(`Failed to update job posting: ${error?.message || String(error)}`);
    }
  }

  static async closeJobPosting(id: string) {
    try {
      const jobPosting = await JobPosting.findByIdAndUpdate(
        id,
        { status: 'closed', updatedAt: new Date() },
        { new: true }
      );

      if (!jobPosting) throw new Error('Job posting not found');
      return jobPosting;
    } catch (error: any) {
      throw new Error(`Failed to close job posting: ${error?.message || String(error)}`);
    }
  }
}

// ============================================================
// JOB APPLICATION SERVICE
// ============================================================
export class JobApplicationService {
  static async getJobApplications(filters: any = {}, page = 1, limit = 50) {
    try {
      const query: any = {};

      if (filters.jobId) {
        query.jobId = filters.jobId;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.search) {
        query.$or = [
          { applicantName: { $regex: filters.search, $options: 'i' } },
          { applicantEmail: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;

      const applications = await JobApplication
        .find(query)
        .populate('jobId', 'title department jobId')
        .sort({ appliedDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await JobApplication.countDocuments(query);

      return {
        applications,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch job applications: ${error?.message || String(error)}`);
    }
  }

  static async getJobApplicationById(id: string) {
    try {
      const application = await JobApplication
        .findById(id)
        .populate('jobId', 'title department jobId salaryRange')
        .populate('reviewedBy', 'firstName lastName employeeId');

      if (!application) throw new Error('Job application not found');
      return application;
    } catch (error: any) {
      throw new Error(`Failed to fetch job application: ${error?.message || String(error)}`);
    }
  }

  static async applyForJob(jobId: string, applicationData: Partial<IJobApplication>) {
    try {
      // Check if job exists and is open
      const job = await JobPosting.findById(jobId);
      if (!job) throw new Error('Job posting not found');
      if (job.status !== 'open') throw new Error('Job posting is not open for applications');

      // Check if applicant already applied
      const existingApplication = await JobApplication.findOne({
        jobId,
        applicantEmail: applicationData.applicantEmail
      });

      if (existingApplication) {
        throw new Error('You have already applied for this job');
      }

      // Generate unique application ID
      const applicationId = `APP-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      const application = new JobApplication({
        ...applicationData,
        applicationId,
        jobId
      });

      await application.save();

      // Update application count on job posting
      await JobPosting.findByIdAndUpdate(jobId, {
        $inc: { applicationCount: 1 }
      });

      return application;
    } catch (error: any) {
      throw new Error(`Failed to submit job application: ${error?.message || String(error)}`);
    }
  }

  static async updateApplicationStatus(id: string, status: string, reviewedBy: string, reviewNotes?: string) {
    try {
      const application = await JobApplication.findByIdAndUpdate(
        id,
        {
          status,
          reviewedBy,
          reviewDate: new Date(),
          reviewNotes,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!application) throw new Error('Job application not found');

      // If application is accepted/hired, close the job posting
      if (status === 'hired') {
        await JobPosting.findByIdAndUpdate(application.jobId, {
          status: 'filled',
          updatedAt: new Date()
        });
      }

      return application;
    } catch (error: any) {
      throw new Error(`Failed to update application status: ${error?.message || String(error)}`);
    }
  }
}

// ============================================================
// PAYROLL SERVICE
// ============================================================
export class PayrollService {
  static async getPayrolls(filters: any = {}, page = 1, limit = 50) {
    try {
      const query: any = {};

      if (filters.employeeId) {
        query.employeeId = filters.employeeId;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.payPeriod) {
        query['payPeriod.startDate'] = { $gte: new Date(filters.payPeriod.start) };
        query['payPeriod.endDate'] = { $lte: new Date(filters.payPeriod.end) };
      }

      const skip = (page - 1) * limit;

      const payrolls = await Payroll
        .find(query)
        .populate('employeeId', 'firstName lastName employeeId department')
        .populate('processedBy', 'firstName lastName employeeId')
        .sort({ payDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Payroll.countDocuments(query);

      return {
        payrolls,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch payrolls: ${error?.message || String(error)}`);
    }
  }

  static async getPayrollById(id: string) {
    try {
      const payroll = await Payroll
        .findById(id)
        .populate('employeeId', 'firstName lastName employeeId department salary')
        .populate('processedBy', 'firstName lastName employeeId');

      if (!payroll) throw new Error('Payroll record not found');
      return payroll;
    } catch (error: any) {
      throw new Error(`Failed to fetch payroll: ${error?.message || String(error)}`);
    }
  }

  static async createPayroll(data: Partial<IPayroll>) {
    try {
      // Generate unique payroll ID
      const payrollId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Calculate totals
      const grossPay = data.basicSalary! +
        (data.allowances?.reduce((sum, allowance) => sum + allowance.amount, 0) || 0);

      const totalDeductions = data.deductions?.reduce((sum, deduction) => sum + deduction.amount, 0) || 0;
      const netPay = grossPay - totalDeductions;

      const payroll = new Payroll({
        ...data,
        payrollId,
        grossPay,
        totalDeductions,
        netPay
      });

      await payroll.save();
      return payroll;
    } catch (error: any) {
      throw new Error(`Failed to create payroll: ${error?.message || String(error)}`);
    }
  }

  static async updatePayrollStatus(id: string, status: string) {
    try {
      const payroll = await Payroll.findByIdAndUpdate(
        id,
        { status, updatedAt: new Date() },
        { new: true }
      );

      if (!payroll) throw new Error('Payroll record not found');
      return payroll;
    } catch (error: any) {
      throw new Error(`Failed to update payroll status: ${error?.message || String(error)}`);
    }
  }

  static async calculateMonthlyPayroll(employeeId: string, month: number, year: number) {
    try {
      const employee = await Employee.findById(employeeId);
      if (!employee) throw new Error('Employee not found');

      // Calculate pay period (assuming monthly payroll)
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of month

      // Basic calculation - in real implementation, this would include:
      // - Attendance/days worked
      // - Overtime calculations
      // - Tax calculations
      // - Benefits deductions
      // - etc.

      const basicSalary = employee.salary;
      const allowances = [
        { type: 'Housing Allowance', amount: basicSalary * 0.15, description: '15% of basic salary' },
        { type: 'Transport Allowance', amount: basicSalary * 0.10, description: '10% of basic salary' }
      ];

      const deductions = [
        { type: 'PAYE Tax', amount: basicSalary * 0.20, description: '20% PAYE' },
        { type: 'NHIF', amount: 500, description: 'National Health Insurance Fund' },
        { type: 'NSSF', amount: basicSalary * 0.06, description: '6% NSSF contribution' }
      ];

      const grossPay = basicSalary + allowances.reduce((sum, a) => sum + a.amount, 0);
      const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
      const netPay = grossPay - totalDeductions;

      return {
        employeeId: employee._id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        payPeriod: { startDate, endDate },
        basicSalary,
        allowances,
        deductions,
        grossPay,
        totalDeductions,
        netPay
      };
    } catch (error: any) {
      throw new Error(`Failed to calculate payroll: ${error?.message || String(error)}`);
    }
  }
}