import { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import {
  EmployeeService,
  JobPostingService,
  JobApplicationService,
  PayrollService
} from './service';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * HR Controller
 */

// ============================================================
// EMPLOYEE CONTROLLER
// ============================================================
export class EmployeeController {
  /**
   * Get all employees
   * GET /api/v1/hr/employees
   */
  static async getEmployees(req: AuthRequest, res: Response) {
    try {
      const filters = {
        status: req.query.status as string,
        department: req.query.department as string,
        search: req.query.search as string
      };

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await EmployeeService.getEmployees(filters, page, limit);

      res.status(200).json({
        success: true,
        data: result.employees,
        pagination: result.pagination
      });
    } catch (error: any) {
      console.error('Get employees error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to fetch employees'
      });
    }
  }

  /**
   * Get employee by ID
   * GET /api/v1/hr/employees/:id
   */
  static async getEmployeeById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const employee = await EmployeeService.getEmployeeById(id);

      res.status(200).json({
        success: true,
        data: employee
      });
    } catch (error: any) {
      console.error('Get employee error:', error);
      res.status(404).json({
        success: false,
        error: error?.message || 'Employee not found'
      });
    }
  }

  /**
   * Create new employee
   * POST /api/v1/hr/employees
   */
  static async createEmployee(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const employee = await EmployeeService.createEmployee(req.body);

      res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        data: employee
      });
    } catch (error: any) {
      console.error('Create employee error:', error);
      res.status(400).json({
        success: false,
        error: error?.message || 'Failed to create employee'
      });
    }
  }

  /**
   * Update employee
   * PUT /api/v1/hr/employees/:id
   */
  static async updateEmployee(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const employee = await EmployeeService.updateEmployee(id, req.body);

      res.status(200).json({
        success: true,
        message: 'Employee updated successfully',
        data: employee
      });
    } catch (error: any) {
      console.error('Update employee error:', error);
      res.status(400).json({
        success: false,
        error: error?.message || 'Failed to update employee'
      });
    }
  }

  /**
   * Delete employee
   * DELETE /api/v1/hr/employees/:id
   */
  static async deleteEmployee(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await EmployeeService.deleteEmployee(id);

      res.status(200).json({
        success: true,
        message: 'Employee deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete employee error:', error);
      res.status(400).json({
        success: false,
        error: error?.message || 'Failed to delete employee'
      });
    }
  }

  /**
   * Get employee statistics
   * GET /api/v1/hr/employees/stats
   */
  static async getEmployeeStats(_req: AuthRequest, res: Response) {
    try {
      const stats = await EmployeeService.getEmployeeStats();

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Get employee stats error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to get employee statistics'
      });
    }
  }
}

// ============================================================
// JOB POSTING CONTROLLER
// ============================================================
export class JobPostingController {
  /**
   * Get all job postings
   * GET /api/v1/hr/jobs
   */
  static async getJobPostings(req: AuthRequest, res: Response) {
    try {
      const filters = {
        status: req.query.status as string,
        department: req.query.department as string,
        search: req.query.search as string
      };

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await JobPostingService.getJobPostings(filters, page, limit);

      res.status(200).json({
        success: true,
        data: { jobs: result.jobs },
        pagination: result.pagination
      });
    } catch (error: any) {
      console.error('Get job postings error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to fetch job postings'
      });
    }
  }

  /**
   * Get job posting by ID
   * GET /api/v1/hr/jobs/:id
   */
  static async getJobPostingById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const job = await JobPostingService.getJobPostingById(id);

      res.status(200).json({
        success: true,
        data: job
      });
    } catch (error: any) {
      console.error('Get job posting error:', error);
      res.status(404).json({
        success: false,
        error: error?.message || 'Job posting not found'
      });
    }
  }

  /**
   * Create new job posting
   * POST /api/v1/hr/jobs
   */
  static async createJobPosting(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const jobPosting = await JobPostingService.createJobPosting(req.body, req.user.id);

      res.status(201).json({
        success: true,
        message: 'Job posting created successfully',
        data: jobPosting
      });
    } catch (error: any) {
      console.error('Create job posting error:', error);
      res.status(400).json({
        success: false,
        error: error?.message || 'Failed to create job posting'
      });
    }
  }

  /**
   * Update job posting
   * PUT /api/v1/hr/jobs/:id
   */
  static async updateJobPosting(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const jobPosting = await JobPostingService.updateJobPosting(id, req.body);

      res.status(200).json({
        success: true,
        message: 'Job posting updated successfully',
        data: jobPosting
      });
    } catch (error: any) {
      console.error('Update job posting error:', error);
      res.status(400).json({
        success: false,
        error: error?.message || 'Failed to update job posting'
      });
    }
  }

  /**
   * Close job posting
   * PUT /api/v1/hr/jobs/:id/close
   */
  static async closeJobPosting(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const jobPosting = await JobPostingService.closeJobPosting(id);

      res.status(200).json({
        success: true,
        message: 'Job posting closed successfully',
        data: jobPosting
      });
    } catch (error: any) {
      console.error('Close job posting error:', error);
      res.status(400).json({
        success: false,
        error: error?.message || 'Failed to close job posting'
      });
    }
  }
}

// ============================================================
// JOB APPLICATION CONTROLLER
// ============================================================
export class JobApplicationController {
  /**
   * Get all job applications
   * GET /api/v1/hr/applications
   */
  static async getJobApplications(req: AuthRequest, res: Response) {
    try {
      const filters = {
        jobId: req.query.jobId as string,
        status: req.query.status as string,
        search: req.query.search as string
      };

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await JobApplicationService.getJobApplications(filters, page, limit);

      res.status(200).json({
        success: true,
        data: { applications: result.applications },
        pagination: result.pagination
      });
    } catch (error: any) {
      console.error('Get job applications error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to fetch job applications'
      });
    }
  }

  /**
   * Get job application by ID
   * GET /api/v1/hr/applications/:id
   */
  static async getJobApplicationById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const application = await JobApplicationService.getJobApplicationById(id);

      res.status(200).json({
        success: true,
        data: application
      });
    } catch (error: any) {
      console.error('Get job application error:', error);
      res.status(404).json({
        success: false,
        error: error?.message || 'Job application not found'
      });
    }
  }

  /**
   * Apply for a job
   * POST /api/v1/hr/jobs/:jobId/apply
   */
  static async applyForJob(req: AuthRequest, res: Response) {
    try {
      const { jobId } = req.params;

      const application = await JobApplicationService.applyForJob(jobId, req.body);

      res.status(201).json({
        success: true,
        message: 'Job application submitted successfully',
        data: application
      });
    } catch (error: any) {
      console.error('Apply for job error:', error);
      res.status(400).json({
        success: false,
        error: error?.message || 'Failed to submit job application'
      });
    }
  }

  /**
   * Update application status
   * PUT /api/v1/hr/applications/:id/status
   */
  static async updateApplicationStatus(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const { id } = req.params;
      const { status, reviewNotes } = req.body;

      const application = await JobApplicationService.updateApplicationStatus(
        id,
        status,
        req.user.id,
        reviewNotes
      );

      // Send notifications based on new status (fire-and-forget)
      try {
        const appData = application as any;
        const applicantEmail = appData?.applicantEmail;
        const applicantName = appData?.applicantName || 'Applicant';
        const applicantPhone = appData?.applicantPhone;
        const jobTitle = appData?.jobId?.title || 'the position';

        // Email notification when moved to Interview
        if (status === 'interviewed' && applicantEmail) {
          const smtpHost = process.env.SMTP_HOST;
          if (smtpHost) {
            const transporter = nodemailer.createTransport({
              host: smtpHost,
              port: Number(process.env.SMTP_PORT || 587),
              secure: !!process.env.SMTP_SECURE,
              auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
            });
            await transporter.sendMail({
              from: process.env.SMTP_FROM || 'no-reply@kenyanbistro.local',
              to: applicantEmail,
              subject: 'Interview Invitation - ' + jobTitle,
              html: '<h2>Congratulations, ' + applicantName + '!</h2>'
                + '<p>We are pleased to inform you that you have been shortlisted for an interview for the position of <strong>' + jobTitle + '</strong>.</p>'
                + '<p>Our HR team will contact you shortly with the interview details including date, time, and venue.</p>'
                + '<p>Please ensure your contact details are up to date.</p>'
                + '<br><p>Best regards,<br>Kenya GrubHub HR Team</p>',
            });
            console.log('Interview email sent to:', applicantEmail);
          } else {
            console.log('SMTP not configured. Interview notification for:', applicantEmail);
          }
        }

        // SMS notification when Hired
        if (status === 'hired' && applicantPhone) {
          const smsMessage = 'Congratulations ' + applicantName + '! You have been hired for ' + jobTitle + ' at Kenya GrubHub. Our HR team will contact you with onboarding details. Welcome aboard!';
          // Log SMS for now - integrate with Africa's Talking or Twilio when ready
          console.log('HIRE SMS to '+applicantPhone+': '+smsMessage);
          // TODO: Integrate with SMS provider
          // Example with Africa's Talking:
          // const AfricasTalking = require('africastalking')({ apiKey: process.env.AT_API_KEY, username: process.env.AT_USERNAME });
          // await AfricasTalking.SMS.send({ to: [applicantPhone], message: smsMessage });
        }
      } catch (notifError) {
        console.error('Notification error (non-blocking):', notifError);
      }

      res.status(200).json({
        success: true,
        message: 'Application status updated successfully',
        data: application
      });
    } catch (error: any) {
      console.error('Update application status error:', error);
      res.status(400).json({
        success: false,
        error: error?.message || 'Failed to update application status'
      });
    }
  }
}

// ============================================================
// PAYROLL CONTROLLER
// ============================================================
export class PayrollController {
  /**
   * Get all payrolls
   * GET /api/v1/hr/payrolls
   */
  static async getPayrolls(req: AuthRequest, res: Response) {
    try {
      const filters = {
        employeeId: req.query.employeeId as string,
        status: req.query.status as string,
        payPeriod: req.query.payPeriod ? JSON.parse(req.query.payPeriod as string) : undefined
      };

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await PayrollService.getPayrolls(filters, page, limit);

      res.status(200).json({
        success: true,
        data: result.payrolls,
        pagination: result.pagination
      });
    } catch (error: any) {
      console.error('Get payrolls error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to fetch payrolls'
      });
    }
  }

  /**
   * Get payroll by ID
   * GET /api/v1/hr/payrolls/:id
   */
  static async getPayrollById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const payroll = await PayrollService.getPayrollById(id);

      res.status(200).json({
        success: true,
        data: payroll
      });
    } catch (error: any) {
      console.error('Get payroll error:', error);
      res.status(404).json({
        success: false,
        error: error?.message || 'Payroll record not found'
      });
    }
  }

  /**
   * Create new payroll
   * POST /api/v1/hr/payrolls
   */
  static async createPayroll(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const payroll = await PayrollService.createPayroll({
        ...req.body,
        processedBy: req.user.id
      });

      res.status(201).json({
        success: true,
        message: 'Payroll created successfully',
        data: payroll
      });
    } catch (error: any) {
      console.error('Create payroll error:', error);
      res.status(400).json({
        success: false,
        error: error?.message || 'Failed to create payroll'
      });
    }
  }

  /**
   * Update payroll status
   * PUT /api/v1/hr/payrolls/:id/status
   */
  static async updatePayrollStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const payroll = await PayrollService.updatePayrollStatus(id, status);

      res.status(200).json({
        success: true,
        message: 'Payroll status updated successfully',
        data: payroll
      });
    } catch (error: any) {
      console.error('Update payroll status error:', error);
      res.status(400).json({
        success: false,
        error: error?.message || 'Failed to update payroll status'
      });
    }
  }

  /**
   * Calculate monthly payroll for employee
   * GET /api/v1/hr/payrolls/calculate/:employeeId?month=3&year=2024
   */
  static async calculateMonthlyPayroll(req: AuthRequest, res: Response) {
    try {
      const { employeeId } = req.params;
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      const calculation = await PayrollService.calculateMonthlyPayroll(employeeId, month, year);

      res.status(200).json({
        success: true,
        data: calculation
      });
    } catch (error: any) {
      console.error('Calculate payroll error:', error);
      res.status(400).json({
        success: false,
        error: error?.message || 'Failed to calculate payroll'
      });
    }
  }
}