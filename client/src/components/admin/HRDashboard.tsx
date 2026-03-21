import React, { useEffect, useState, useMemo } from 'react';
import { useHybridAuth } from '@/lib/hybrid-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { apiFetch } from '@/lib/api';
import {
  Briefcase,
  Plus,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  Calendar,
  UserPlus,
  ClipboardCheck,
  CreditCard as PayrollIcon,
  FileWarning,
  Users,
  UserCheck,
  CalendarOff,
  RefreshCw,
  ChevronRight,
  Star,
  Activity,
  Calculator,
  Download,
} from 'lucide-react';
import { InsightActionCard, InsightItem } from '@/components/ui/InsightActionCard';
import { useToast } from '@/hooks/use-toast';

interface EmployeeStats {
  overview: {
    totalEmployees: number;
    activeEmployees: number;
    avgSalary: number;
  };
  departmentBreakdown: Array<{
    _id: string;
    count: number;
  }>;
}

interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  employmentType: string;
  hireDate: string;
  salary: number;
  currency: string;
  status: 'active' | 'inactive' | 'terminated' | 'on_leave';
  performanceScore?: number;
}

interface RecentJobPosting {
  _id: string;
  jobId: string;
  title: string;
  department: string;
  status: string;
  applicationCount: number;
  postedDate: string;
}

interface RecentApplication {
  _id: string;
  applicationId: string;
  applicantName: string;
  jobId: string;
  title: string;
  status: string;
  appliedDate: string;
}

interface PayrollOverview {
  pending: number;
  processed: number;
  paid: number;
  totalAmount: number;
}

interface PayrollCalcResult {
  employeeName: string;
  basicSalary: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  allowances: Array<{ type: string; amount: number }>;
  deductions: Array<{ type: string; amount: number }>;
}

interface Contract {
  _id: string;
  contractId: string;
  employeeId: {
    _id: string;
    firstName: string;
    lastName: string;
    department: string;
    position: string;
  };
  contractType: string;
  title: string;
  startDate: string;
  endDate?: string;
  status: string;
  salary: number;
  currency: string;
  leaveEntitlements?: {
    annualLeave: number;
    sickLeave: number;
    maternityLeave: number;
    paternityLeave: number;
    compassionateLeave: number;
  };
}

interface Payslip {
  _id: string;
  payslipId: string;
  employeeId: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department: string;
  };
  payPeriod: {
    month: number;
    year: number;
  };
  netPay: number;
  currency: string;
  status: string;
  payDate: string;
}

interface ActivityLog {
  id: string;
  type: 'hire' | 'leave' | 'promotion' | 'payroll' | 'contract' | 'termination';
  employee: string;
  description: string;
  date: string;
}

const PIPELINE_STAGES = [
  { key: 'pending', label: 'Applied', icon: FileText },
  { key: 'under_review', label: 'Shortlisted', icon: ClipboardCheck },
  { key: 'interviewed', label: 'Interview', icon: Eye },
  { key: 'hired', label: 'Hired', icon: CheckCircle },
] as const;

const DEPT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280', '#14b8a6'];

export default function HRDashboard() {
  const { toast } = useToast();
  const { user } = useHybridAuth();
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [recentJobs, setRecentJobs] = useState<RecentJobPosting[]>([]);
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);
  const [payrollOverview, setPayrollOverview] = useState<PayrollOverview | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'recruitment' | 'contracts' | 'payslips' | 'my-contracts' | 'my-payslips'>(
    user?.role === 'admin' || user?.role === 'staff' ? 'overview' : 'my-contracts'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState<'all' | 'active' | 'on_leave' | 'inactive' | 'terminated'>('all');
  const [loading, setLoading] = useState(true);
  const [payrollCalcOpen, setPayrollCalcOpen] = useState(false);
  const [payrollCalcResult, setPayrollCalcResult] = useState<PayrollCalcResult | null>(null);
  const [createEmployeeOpen, setCreateEmployeeOpen] = useState(false);
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [contractOfferOpen, setContractOfferOpen] = useState(false);
  const [contractSignOpen, setContractSignOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [employeeForm, setEmployeeForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: 'Kitchen',
    position: '',
    employmentType: 'full_time',
    salary: '',
  });
  const [jobForm, setJobForm] = useState({
    title: '',
    department: 'Kitchen',
    description: '',
    status: 'open',
        postedDate: new Date().toISOString(),
        location: 'Nairobi',                // or add a location field to your form
        employmentType: 'full_time',
        requirements: [],
        salaryRange: { min: 0, max: 0 },
  });

  useEffect(() => {
    if (user) fetchHRData();
  }, [user]);

  useEffect(() => {
    if (user) {
      setActiveTab(user.role === 'admin' || user.role === 'staff' ? 'overview' : 'my-contracts');
    }
  }, [user]);

  const fetchHRData = async () => {
    try {
      const [statsRes, employeesRes, jobsRes, appsRes, payrollRes, contractsRes, payslipsRes] = await Promise.all([
        apiFetch('/api/v1/hr/employees/stats'),
        apiFetch('/api/v1/hr/employees?page=1&limit=100'),
        apiFetch('/api/v1/hr/jobs?page=1&limit=50'),
        apiFetch('/api/v1/hr/applications?page=1&limit=50'),
        apiFetch('/api/v1/hr/payrolls?page=1&limit=1000'),
        apiFetch('/api/v1/hr/contracts?page=1&limit=50'),
        apiFetch('/api/v1/hr/payslips?page=1&limit=50'),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data);
      }

      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setEmployees(data.data?.employees || []);
      }

      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setRecentJobs(data.data?.jobs || []);
      }

      if (appsRes.ok) {
        const data = await appsRes.json();
        setRecentApplications(data.data?.applications || []);
      }

      if (payrollRes.ok) {
        const data = await payrollRes.json();
        const payrolls = data.data?.payrolls || [];
        const overview = {
          pending: payrolls.filter((p: any) => p.status === 'pending').length,
          processed: payrolls.filter((p: any) => p.status === 'processed').length,
          paid: payrolls.filter((p: any) => p.status === 'paid').length,
          totalAmount: payrolls.reduce((sum: number, p: any) => sum + (p.netPay || 0), 0)
        };
        setPayrollOverview(overview);
      }

      if (contractsRes.ok) {
        const data = await contractsRes.json();
        if (user?.role === 'admin' || user?.role === 'staff') {
          setContracts(data.data?.contracts || []);
        } else {
          // For employees, fetch their own contracts
          const employeeContractsRes = await apiFetch('/api/v1/hr/contracts/employee/my');
          if (employeeContractsRes.ok) {
            const employeeData = await employeeContractsRes.json();
            setContracts(employeeData.data || []);
          }
        }
      }

      if (payslipsRes.ok) {
        const data = await payslipsRes.json();
        if (user?.role === 'admin' || user?.role === 'staff') {
          setPayslips(data.data?.payslips || []);
        } else {
          // For employees, fetch their own payslips
          const employeePayslipsRes = await apiFetch('/api/v1/hr/payslips/employee/my');
          if (employeePayslipsRes.ok) {
            const employeeData = await employeePayslipsRes.json();
            setPayslips(employeeData.data || []);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch HR data:', error);
      // Mock data for demo
      setStats({
        overview: { totalEmployees: 48, activeEmployees: 42, avgSalary: 85000 },
        departmentBreakdown: [
          { _id: 'Kitchen', count: 15 },
          { _id: 'Service', count: 12 },
          { _id: 'Management', count: 6 },
          { _id: 'Delivery', count: 8 },
          { _id: 'Admin', count: 7 },
        ]
      });
      setEmployees([
        { _id: '1', employeeId: 'EMP-001', firstName: 'John', lastName: 'Kamau', email: 'john@kgrub.com', phone: '+254700000001', department: 'Kitchen', position: 'Head Chef', employmentType: 'full_time', hireDate: '2022-03-15', salary: 120000, currency: 'KES', status: 'active', performanceScore: 92 },
        { _id: '2', employeeId: 'EMP-002', firstName: 'Mary', lastName: 'Wanjiku', email: 'mary@kgrub.com', phone: '+254700000002', department: 'Service', position: 'Floor Manager', employmentType: 'full_time', hireDate: '2022-06-10', salary: 95000, currency: 'KES', status: 'active', performanceScore: 88 },
        { _id: '3', employeeId: 'EMP-003', firstName: 'David', lastName: 'Ochieng', email: 'david@kgrub.com', phone: '+254700000003', department: 'Delivery', position: 'Rider Lead', employmentType: 'full_time', hireDate: '2023-01-20', salary: 65000, currency: 'KES', status: 'on_leave' },
        { _id: '4', employeeId: 'EMP-004', firstName: 'Grace', lastName: 'Muthoni', email: 'grace@kgrub.com', phone: '+254700000004', department: 'Admin', position: 'HR Manager', employmentType: 'full_time', hireDate: '2021-11-05', salary: 110000, currency: 'KES', status: 'active', performanceScore: 95 },
        { _id: '5', employeeId: 'EMP-005', firstName: 'Peter', lastName: 'Njoroge', email: 'peter@kgrub.com', phone: '+254700000005', department: 'Kitchen', position: 'Sous Chef', employmentType: 'full_time', hireDate: '2023-04-12', salary: 80000, currency: 'KES', status: 'active', performanceScore: 78 },
      ]);
      setRecentApplications([
        { _id: 'a1', applicationId: 'APP-001', applicantName: 'Alice Mwangi', jobId: 'JOB-001', title: 'Line Cook', status: 'pending', appliedDate: '2024-01-10' },
        { _id: 'a2', applicationId: 'APP-002', applicantName: 'Brian Otieno', jobId: 'JOB-001', title: 'Line Cook', status: 'under_review', appliedDate: '2024-01-08' },
        { _id: 'a3', applicationId: 'APP-003', applicantName: 'Carol Wambui', jobId: 'JOB-002', title: 'Delivery Rider', status: 'interviewed', appliedDate: '2024-01-05' },
        { _id: 'a4', applicationId: 'APP-004', applicantName: 'Dennis Kiprop', jobId: 'JOB-002', title: 'Delivery Rider', status: 'hired', appliedDate: '2023-12-20' },
      ]);
      setRecentJobs([
        { _id: 'j1', jobId: 'JOB-001', title: 'Line Cook', department: 'Kitchen', status: 'open', applicationCount: 2, postedDate: '2024-01-01' },
        { _id: 'j2', jobId: 'JOB-002', title: 'Delivery Rider', department: 'Delivery', status: 'open', applicationCount: 3, postedDate: '2024-01-05' },
        { _id: 'j3', jobId: 'JOB-003', title: 'Cashier', department: 'Service', status: 'open', applicationCount: 0, postedDate: '2024-01-12' },
      ]);
      setPayrollOverview({ pending: 5, processed: 12, paid: 31, totalAmount: 3200000 });
    } finally {
      setLoading(false);
    }
  };

  // ─── Computed values ────────────────────────────────────────────────────

  const onLeaveCount = useMemo(() =>
    employees.filter(e => e.status === 'on_leave').length || 0
  , [employees]);

  const openPositions = useMemo(() =>
    recentJobs.filter(j => j.status === 'open').length
  , [recentJobs]);

  const pipelineCounts = useMemo(() => {
    const counts: Record<string, number> = { pending: 0, under_review: 0, interviewed: 0, hired: 0 };
    recentApplications.forEach(a => {
      if (counts[a.status] !== undefined) counts[a.status]++;
      else if (a.status === 'offered') counts['hired']++;
    });
    return counts;
  }, [recentApplications]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const matchesSearch = searchTerm === '' ||
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.position.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = employeeFilter === 'all' || e.status === employeeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [employees, searchTerm, employeeFilter]);

  const activityLogs: ActivityLog[] = useMemo(() => {
    const logs: ActivityLog[] = [];
    // Generate activity logs from available data
    employees.slice(0, 3).forEach(e => {
      logs.push({
        id: `hire-${e._id}`, type: 'hire',
        employee: `${e.firstName} ${e.lastName}`,
        description: `Hired as ${e.position} in ${e.department}`,
        date: e.hireDate,
      });
    });
    employees.filter(e => e.status === 'on_leave').forEach(e => {
      logs.push({
        id: `leave-${e._id}`, type: 'leave',
        employee: `${e.firstName} ${e.lastName}`,
        description: `Currently on leave`,
        date: new Date().toISOString(),
      });
    });
    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  }, [employees]);

  const departmentData = useMemo(() =>
    stats?.departmentBreakdown.map(dept => ({
      name: dept._id || 'Unknown',
      value: dept.count,
    })) || []
  , [stats]);

  // ─── Status helpers ─────────────────────────────────────────────────────

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200',
      terminated: 'bg-red-100 text-red-800 border-red-200',
      on_leave: 'bg-amber-100 text-amber-800 border-amber-200',
      open: 'bg-green-100 text-green-800 border-green-200',
      closed: 'bg-gray-100 text-gray-800 border-gray-200',
      filled: 'bg-blue-100 text-blue-800 border-blue-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      under_review: 'bg-blue-100 text-blue-800 border-blue-200',
      interviewed: 'bg-purple-100 text-purple-800 border-purple-200',
      offered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      hired: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      approved: 'bg-blue-100 text-blue-800 border-blue-200',
      paid: 'bg-green-100 text-green-800 border-green-200',
      processed: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return variants[status] || variants.pending;
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      active: <CheckCircle size={14} />,
      inactive: <Clock size={14} />,
      terminated: <AlertCircle size={14} />,
      on_leave: <CalendarOff size={14} />,
      open: <CheckCircle size={14} />,
      closed: <Clock size={14} />,
      filled: <CheckCircle size={14} />,
      cancelled: <AlertCircle size={14} />,
      pending: <Clock size={14} />,
      under_review: <Eye size={14} />,
      interviewed: <Eye size={14} />,
      offered: <CheckCircle size={14} />,
      hired: <UserCheck size={14} />,
      rejected: <AlertCircle size={14} />,
    };
    return icons[status] || icons.pending;
  };

  // ─── Smart actions ──────────────────────────────────────────────────────

  const handlePayrollCalc = async (employeeId: string) => {
    const now = new Date();
    try {
      const res = await apiFetch(`/api/v1/hr/payrolls/calculate/${employeeId}?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
      if (res.ok) {
        const data = await res.json();
        setPayrollCalcResult(data.data);
      } else {
        // Use local calculation as fallback
        const emp = employees.find(e => e._id === employeeId);
        if (emp) {
          const basic = emp.salary;
          const housing = basic * 0.15;
          const transport = basic * 0.10;
          const gross = basic + housing + transport;
          const paye = basic * 0.20;
          const nhif = 500;
          const nssf = basic * 0.06;
          const totalDed = paye + nhif + nssf;
          setPayrollCalcResult({
            employeeName: `${emp.firstName} ${emp.lastName}`,
            basicSalary: basic,
            grossPay: gross,
            totalDeductions: totalDed,
            netPay: gross - totalDed,
            allowances: [
              { type: 'Housing Allowance', amount: housing },
              { type: 'Transport Allowance', amount: transport },
            ],
            deductions: [
              { type: 'PAYE Tax (20%)', amount: paye },
              { type: 'NHIF', amount: nhif },
              { type: 'NSSF (6%)', amount: nssf },
            ],
          });
        }
      }
    } catch {
      const emp = employees.find(e => e._id === employeeId);
      if (emp) {
        const basic = emp.salary;
        const housing = basic * 0.15;
        const transport = basic * 0.10;
        const gross = basic + housing + transport;
        const paye = basic * 0.20;
        const nhif = 500;
        const nssf = basic * 0.06;
        const totalDed = paye + nhif + nssf;
        setPayrollCalcResult({
          employeeName: `${emp.firstName} ${emp.lastName}`,
          basicSalary: basic,
          grossPay: gross,
          totalDeductions: totalDed,
          netPay: gross - totalDed,
          allowances: [
            { type: 'Housing Allowance', amount: housing },
            { type: 'Transport Allowance', amount: transport },
          ],
          deductions: [
            { type: 'PAYE Tax (20%)', amount: paye },
            { type: 'NHIF', amount: nhif },
            { type: 'NSSF (6%)', amount: nssf },
          ],
        });
      }
    }
    setPayrollCalcOpen(true);
  };

  const handleExportEmployees = () => {
    const headers = ['Employee ID', 'Name', 'Department', 'Position', 'Type', 'Status', 'Salary', 'Hire Date'];
    const rows = employees.map(e => [
      e.employeeId, `${e.firstName} ${e.lastName}`, e.department, e.position,
      e.employmentType, e.status, e.salary, new Date(e.hireDate).toLocaleDateString()
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Employee list exported as CSV' });
  };

  const handleCreateEmployee = () => {
    setEmployeeForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: 'Kitchen',
      position: '',
      employmentType: 'full_time',
      salary: '',
    });
    setCreateEmployeeOpen(true);
  };

  const handleCreateJob = () => {
    setJobForm({
      title: '',
      department: 'Kitchen',
      description: '',
      status: 'open',
        postedDate: new Date().toISOString(),
        location: 'Nairobi',                // or add a location field to your form
        employmentType: 'full_time',
        requirements: [],
        salaryRange: { min: 0, max: 0 },
    });
    setCreateJobOpen(true);
  };

  const handleSubmitEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/v1/hr/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...employeeForm,
          salary: parseInt(employeeForm.salary),
          hireDate: new Date().toISOString(),
          status: 'active',
          currency: 'KES',
        }),
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Employee created successfully' });
        setCreateEmployeeOpen(false);
        fetchHRData(); // Refresh data
      } else {
        toast({ title: 'Error', description: 'Failed to create employee', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create employee', variant: 'destructive' });
    }
  };

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/v1/hr/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobForm),
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Job posted successfully' });
        setCreateJobOpen(false);
        fetchHRData(); // Refresh data
      } else {
        toast({ title: 'Error', description: 'Failed to post job', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to post job', variant: 'destructive' });
    }
  };

  const handleSendContractOffer = async () => {
    if (!selectedContract) return;
    
    try {
      const res = await apiFetch(`/api/v1/hr/contracts/${selectedContract._id}/send-offer`, {
        method: 'POST',
      });
      
      if (res.ok) {
        toast({ title: 'Success', description: 'Contract offer sent successfully' });
        setContractOfferOpen(false);
        setSelectedContract(null);
        fetchHRData(); // Refresh data
      } else {
        toast({ title: 'Error', description: 'Failed to send contract offer', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send contract offer', variant: 'destructive' });
    }
  };

  const handleSignContract = async () => {
    if (!selectedContract) return;
    
    try {
      const res = await apiFetch(`/api/v1/hr/contracts/${selectedContract._id}/sign`, {
        method: 'POST',
      });
      
      if (res.ok) {
        toast({ title: 'Success', description: 'Contract signed successfully' });
        setContractSignOpen(false);
        setSelectedContract(null);
        fetchHRData(); // Refresh data
      } else {
        toast({ title: 'Error', description: 'Failed to sign contract', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to sign contract', variant: 'destructive' });
    }
  };

  // ─── Insights ───────────────────────────────────────────────────────────

  const expiringContracts = contracts.filter(c => {
    if (!c.endDate || c.status !== 'active') return false;
    const daysLeft = Math.ceil((new Date(c.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft >= 0 && daysLeft <= 30;
  });
  const pendingApplications = recentApplications.filter(a => a.status === 'pending' || a.status === 'under_review');
  const openJobsNoApps = recentJobs.filter(j => j.status === 'open' && j.applicationCount === 0);

  const hrInsights: InsightItem[] = [];

  if (onLeaveCount > 0) {
    hrInsights.push({
      id: 'on-leave',
      severity: 'info',
      title: 'Employees On Leave',
      metric: `${onLeaveCount} staff`,
      description: `${employees.filter(e => e.status === 'on_leave').slice(0, 2).map(e => e.firstName).join(', ')} currently on leave`,
      action: {
        label: 'View Employees',
        onClick: () => { setActiveTab('employees'); setEmployeeFilter('on_leave'); },
        icon: CalendarOff,
        variant: 'outline',
      },
    });
  }

  if (expiringContracts.length > 0) {
    hrInsights.push({
      id: 'expiring-contracts',
      severity: 'critical',
      title: 'Contracts Expiring Soon',
      metric: `${expiringContracts.length} contracts`,
      description: `${expiringContracts.slice(0, 2).map(c => `${c.employeeId?.firstName} ${c.employeeId?.lastName}`).join(', ')} expire within 30 days`,
      action: {
        label: 'Renew Contracts',
        onClick: () => setActiveTab('contracts'),
        icon: FileWarning,
      },
    });
  }

  if (payrollOverview && payrollOverview.pending > 0) {
    hrInsights.push({
      id: 'pending-payroll',
      severity: 'warning',
      title: 'Pending Payroll',
      metric: `${payrollOverview.pending} payslips`,
      description: 'Payroll items need processing before the pay cycle ends',
      action: {
        label: 'Process Payroll',
        onClick: () => setActiveTab('payslips'),
        icon: PayrollIcon,
      },
    });
  }

  if (pendingApplications.length > 0) {
    hrInsights.push({
      id: 'pending-apps',
      severity: 'info',
      title: 'Pending Applications',
      metric: `${pendingApplications.length} applicants`,
      description: 'Job applications awaiting review or interview scheduling',
      action: {
        label: 'Review Applications',
        onClick: () => setActiveTab('recruitment'),
        icon: ClipboardCheck,
        variant: 'outline',
      },
    });
  }

  if (openJobsNoApps.length > 0) {
    hrInsights.push({
      id: 'jobs-no-apps',
      severity: 'warning',
      title: 'Jobs With No Applications',
      metric: `${openJobsNoApps.length} positions`,
      description: `${openJobsNoApps.slice(0, 2).map(j => j.title).join(', ')} have zero applicants`,
      action: {
        label: 'Promote Listings',
        onClick: () => setActiveTab('recruitment'),
        icon: UserPlus,
        variant: 'outline',
      },
    });
  }

  if (hrInsights.length === 0 && stats) {
    hrInsights.push({
      id: 'hr-healthy',
      severity: 'success',
      title: 'HR Status Healthy',
      metric: `${stats.overview.activeEmployees} active`,
      description: 'All HR processes are running smoothly',
      action: {
        label: 'View Overview',
        onClick: () => setActiveTab('overview'),
        variant: 'outline',
      },
    });
  }

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-muted rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-muted rounded-lg"></div>
            <div className="h-64 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════
          SMART CARDS (4 cards)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Employees */}
        <Card className="border shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => setActiveTab('employees')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold">{stats?.overview.totalEmployees ?? employees.length}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Avg salary: KES {Math.round(stats?.overview.avgSalary ?? 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {/* Active Staff */}
        <Card className="border shadow-sm hover:shadow-md transition-all border-emerald-200 bg-emerald-50/50 cursor-pointer" onClick={() => { setActiveTab('employees'); setEmployeeFilter('active'); }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active Staff</CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold text-emerald-700">{stats?.overview.activeEmployees ?? 0}</div>
            <p className="text-[10px] text-emerald-600 mt-0.5">Currently working</p>
          </CardContent>
        </Card>

        {/* On Leave */}
        <Card className={`border shadow-sm hover:shadow-md transition-all cursor-pointer ${onLeaveCount > 0 ? 'border-amber-200 bg-amber-50/50' : ''}`} onClick={() => { setActiveTab('employees'); setEmployeeFilter('on_leave'); }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">On Leave</CardTitle>
            <CalendarOff className={`h-4 w-4 ${onLeaveCount > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent className="pb-3">
            <div className={`text-2xl font-bold ${onLeaveCount > 0 ? 'text-amber-700' : ''}`}>{onLeaveCount}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {onLeaveCount > 0 ? 'Staff on leave today' : 'None on leave'}
            </p>
          </CardContent>
        </Card>

        {/* Open Positions */}
        <Card className={`border shadow-sm hover:shadow-md transition-all cursor-pointer ${openPositions > 0 ? 'border-blue-200 bg-blue-50/50' : ''}`} onClick={() => setActiveTab('recruitment')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Open Positions</CardTitle>
            <Briefcase className={`h-4 w-4 ${openPositions > 0 ? 'text-blue-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent className="pb-3">
            <div className={`text-2xl font-bold ${openPositions > 0 ? 'text-blue-700' : ''}`}>{openPositions}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {recentApplications.length} total applicants
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Data -> Insight -> Action Panel */}
      <InsightActionCard insights={hrInsights} title="HR Alerts" />

      {/* ═══════════════════════════════════════════════════════════════════
          ACTION TOOLBAR
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => fetchHRData()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportEmployees}>
          <Download className="h-3.5 w-3.5" />
          Export Employees
        </Button>
        <div className="ml-auto text-xs text-muted-foreground">
          {employees.length} employees &middot; {recentJobs.length} jobs &middot; {recentApplications.length} applicants
        </div>
      </div>

      {/* Payroll Auto-Calculation Dialog */}
      <Dialog open={payrollCalcOpen} onOpenChange={setPayrollCalcOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payroll Auto-Calculation</DialogTitle>
            <DialogDescription>
              {payrollCalcResult ? `Monthly payroll breakdown for ${payrollCalcResult.employeeName}` : 'Calculating...'}
            </DialogDescription>
          </DialogHeader>
          {payrollCalcResult && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm border-b pb-2">
                <span className="text-muted-foreground">Basic Salary</span>
                <span className="font-mono font-medium">KES {payrollCalcResult.basicSalary.toLocaleString()}</span>
              </div>
              {payrollCalcResult.allowances.map((a, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">+ {a.type}</span>
                  <span className="font-mono text-emerald-600">{a.amount.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm border-t pt-2 font-medium">
                <span>Gross Pay</span>
                <span className="font-mono">KES {payrollCalcResult.grossPay.toLocaleString()}</span>
              </div>
              {payrollCalcResult.deductions.map((d, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">- {d.type}</span>
                  <span className="font-mono text-red-600">{d.amount.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm border-t pt-2 font-medium">
                <span>Total Deductions</span>
                <span className="font-mono text-red-600">KES {payrollCalcResult.totalDeductions.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base border-t-2 pt-2 font-bold">
                <span>Net Pay</span>
                <span className="font-mono text-emerald-700">KES {payrollCalcResult.netPay.toLocaleString()}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Employee Dialog */}
      <Dialog open={createEmployeeOpen} onOpenChange={setCreateEmployeeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Employee</DialogTitle>
            <DialogDescription>Add a new employee to the system</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmitEmployee}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">First Name</label>
                <Input
                  placeholder="John"
                  value={employeeForm.firstName}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  placeholder="Doe"
                  value={employeeForm.lastName}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, lastName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="john@company.com"
                value={employeeForm.email}
                onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input
                placeholder="+254700000000"
                value={employeeForm.phone}
                onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Department</label>
                <select
                  className="w-full h-9 px-3 border rounded-lg text-sm"
                  value={employeeForm.department}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
                >
                  <option>Kitchen</option>
                  <option>Service</option>
                  <option>Delivery</option>
                  <option>Management</option>
                  <option>Admin</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Position</label>
                <Input
                  placeholder="Chef"
                  value={employeeForm.position}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Employment Type</label>
                <select
                  className="w-full h-9 px-3 border rounded-lg text-sm"
                  value={employeeForm.employmentType}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, employmentType: e.target.value })}
                >
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Salary (KES)</label>
                <Input
                  type="number"
                  placeholder="50000"
                  value={employeeForm.salary}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, salary: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" type="button" onClick={() => setCreateEmployeeOpen(false)}>Cancel</Button>
              <Button type="submit">Create Employee</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Job Dialog */}
      <Dialog open={createJobOpen} onOpenChange={setCreateJobOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Post New Job</DialogTitle>
            <DialogDescription>Create a new job posting</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmitJob}>
            <div>
              <label className="text-sm font-medium">Job Title</label>
              <Input
                placeholder="Line Cook"
                value={jobForm.title}
                onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Department</label>
              <select
                className="w-full h-9 px-3 border rounded-lg text-sm"
                value={jobForm.department}
                onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
              >
                <option>Kitchen</option>
                <option>Service</option>
                <option>Delivery</option>
                <option>Management</option>
                <option>Admin</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full h-20 px-3 py-2 border rounded-lg text-sm"
                placeholder="Job description..."
                value={jobForm.description}
                onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" type="button" onClick={() => setCreateJobOpen(false)}>Cancel</Button>
              <Button type="submit">Post Job</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contract Offer Dialog */}
      <Dialog open={contractOfferOpen} onOpenChange={setContractOfferOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Contract Offer</DialogTitle>
            <DialogDescription>
              Send contract offer to {selectedContract?.employeeId?.firstName} {selectedContract?.employeeId?.lastName}
            </DialogDescription>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Contract ID:</span>
                  <span className="font-mono">{selectedContract.contractId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Position:</span>
                  <span>{selectedContract.title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Salary:</span>
                  <span className="font-mono font-medium">{selectedContract.currency} {selectedContract.salary?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="capitalize">{selectedContract.contractType?.replace('_', ' ')}</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                This will send the contract offer to the employee for review and signing.
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setContractOfferOpen(false)}>Cancel</Button>
                <Button onClick={handleSendContractOffer}>Send Offer</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contract Signing Dialog */}
      <Dialog open={contractSignOpen} onOpenChange={setContractSignOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sign Employment Contract</DialogTitle>
            <DialogDescription>
              Review and sign your employment contract
            </DialogDescription>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-6">
              {/* Contract Details */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contract ID:</span>
                  <span className="font-mono font-medium">{selectedContract.contractId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Position:</span>
                  <span className="font-medium">{selectedContract.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Salary:</span>
                  <span className="font-mono font-medium text-lg">{selectedContract.currency} {selectedContract.salary?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start Date:</span>
                  <span>{new Date(selectedContract.startDate).toLocaleDateString()}</span>
                </div>
                {selectedContract.endDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">End Date:</span>
                    <span>{new Date(selectedContract.endDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Leave Entitlements */}
              {selectedContract.leaveEntitlements && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">Leave Entitlements</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Annual Leave:</span>
                      <span className="font-medium">{selectedContract.leaveEntitlements.annualLeave} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sick Leave:</span>
                      <span className="font-medium">{selectedContract.leaveEntitlements.sickLeave} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Maternity Leave:</span>
                      <span className="font-medium">{selectedContract.leaveEntitlements.maternityLeave} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paternity Leave:</span>
                      <span className="font-medium">{selectedContract.leaveEntitlements.paternityLeave} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Compassionate Leave:</span>
                      <span className="font-medium">{selectedContract.leaveEntitlements.compassionateLeave} days</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                By signing this contract, you agree to the terms and conditions outlined above.
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setContractSignOpen(false)}>Cancel</Button>
                <Button onClick={handleSignContract} className="bg-emerald-600 hover:bg-emerald-700">
                  Sign Contract
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════
          TAB NAVIGATION
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex gap-1 border-b">
        {(() => {
          const tabs = user?.role === 'admin' || user?.role === 'staff' ? [
            { key: 'overview' as const, label: 'Overview', icon: Eye },
            { key: 'employees' as const, label: 'Employees', icon: Users },
            { key: 'recruitment' as const, label: 'Recruitment', icon: UserPlus },
            { key: 'contracts' as const, label: 'Contracts', icon: FileText },
            { key: 'payslips' as const, label: 'Payslips', icon: DollarSign },
          ] : [
            { key: 'my-contracts' as const, label: 'My Contracts', icon: FileText },
            { key: 'my-payslips' as const, label: 'My Payslips', icon: DollarSign },
          ];
          return tabs.map(tab => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? 'default' : 'ghost'}
              onClick={() => setActiveTab(tab.key)}
              size="sm"
              className="gap-1.5 rounded-b-none"
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </Button>
          ));
        })()}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          OVERVIEW TAB
          ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* Recruitment Pipeline Funnel */}
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Recruitment Pipeline</CardTitle>
              <CardDescription>Applied → Shortlisted → Interview → Hired</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-2">
                {PIPELINE_STAGES.map((stage, idx) => {
                  const count = pipelineCounts[stage.key] || 0;
                  const StageIcon = stage.icon;
                  return (
                    <React.Fragment key={stage.key}>
                      <div className="flex-1 text-center">
                        <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border-2 ${
                          count > 0 ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-muted border-muted-foreground/20 text-muted-foreground'
                        }`}>
                          {count}
                        </div>
                        <div className="mt-1.5 flex items-center justify-center gap-1">
                          <StageIcon className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">{stage.label}</span>
                        </div>
                      </div>
                      {idx < PIPELINE_STAGES.length - 1 && (
                        <ChevronRight className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Distribution */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Department Distribution</CardTitle>
                <CardDescription>Employees by department</CardDescription>
              </CardHeader>
              <CardContent>
                {departmentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={departmentData}
                        cx="50%"
                        cy="45%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {departmentData.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={DEPT_COLORS[index % DEPT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">No department data</div>
                )}
              </CardContent>
            </Card>

            {/* Payroll Status */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Payroll Overview</CardTitle>
                <CardDescription>
                  Total: KES {(payrollOverview?.totalAmount ?? 0).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={[
                    { name: 'Pending', value: payrollOverview?.pending ?? 0, fill: '#f59e0b' },
                    { name: 'Processed', value: payrollOverview?.processed ?? 0, fill: '#3b82f6' },
                    { name: 'Paid', value: payrollOverview?.paid ?? 0, fill: '#10b981' },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {[
                        { fill: '#f59e0b' },
                        { fill: '#3b82f6' },
                        { fill: '#10b981' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Employee Activity Logs + Attendance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity Logs */}
            <Card className="border shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Employee Activity Logs</CardTitle>
                    <CardDescription>Recent workforce events</CardDescription>
                  </div>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activityLogs.length > 0 ? activityLogs.map(log => (
                    <div key={log.id} className="flex items-start gap-3 text-sm">
                      <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                        log.type === 'hire' ? 'bg-emerald-500' :
                        log.type === 'leave' ? 'bg-amber-500' :
                        log.type === 'termination' ? 'bg-red-500' :
                        'bg-blue-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{log.employee}</p>
                        <p className="text-xs text-muted-foreground">{log.description}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(log.date).toLocaleDateString()}
                      </span>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">No recent activity</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Attendance Tracking (Future Biometric) */}
            <Card className="border shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Attendance Tracking</CardTitle>
                    <CardDescription>Today's workforce status</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-700 bg-amber-50">
                    Biometric Ready
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <div className="text-xl font-bold text-emerald-700">{stats?.overview.activeEmployees ?? 0}</div>
                      <div className="text-[10px] text-emerald-600">Present</div>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <div className="text-xl font-bold text-amber-700">{onLeaveCount}</div>
                      <div className="text-[10px] text-amber-600">On Leave</div>
                    </div>
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <div className="text-xl font-bold text-red-700">
                        {Math.max(0, (stats?.overview.totalEmployees ?? 0) - (stats?.overview.activeEmployees ?? 0) - onLeaveCount)}
                      </div>
                      <div className="text-[10px] text-red-600">Absent</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground text-center p-2 bg-muted/50 rounded">
                    Future: Biometric integration for clock-in/clock-out tracking
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Jobs Preview */}
          <Card className="border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Open Positions</CardTitle>
                  <CardDescription>Active job postings</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('recruitment')} className="gap-1 text-xs">
                  View All <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Applications</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Posted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentJobs.length > 0 ? (
                      recentJobs.map((job) => (
                        <TableRow key={job._id}>
                          <TableCell className="font-mono text-xs">{job.jobId}</TableCell>
                          <TableCell className="text-sm font-medium">{job.title}</TableCell>
                          <TableCell className="text-sm">{job.department}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${job.applicationCount === 0 ? 'border-red-200 text-red-600' : ''}`}>
                              {job.applicationCount}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusBadge(job.status)}`}>
                              {getStatusIcon(job.status)}
                              <span className="ml-1">{job.status.replace('_', ' ')}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(job.postedDate).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">No job postings</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          EMPLOYEES TAB
          ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'employees' && (
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">All Employees</CardTitle>
                <CardDescription>Role, status, and performance tracking</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={handleExportEmployees}>
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
                <Button size="sm" className="gap-1" onClick={handleCreateEmployee}>
                  <Plus className="h-3.5 w-3.5" /> Add Employee
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs h-9"
              />
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value as any)}
                className="h-9 px-3 border rounded-lg text-sm bg-background"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="inactive">Inactive</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role / Position</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead className="text-right">Salary (KES)</TableHead>
                    <TableHead>Hired</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map(emp => (
                      <TableRow key={emp._id} className={emp.status === 'on_leave' ? 'bg-amber-50/50' : emp.status === 'terminated' ? 'bg-red-50/30' : ''}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{emp.employeeId}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{emp.position}</TableCell>
                        <TableCell className="text-sm">{emp.department}</TableCell>
                        <TableCell>
                          <span className="text-xs capitalize">{emp.employmentType.replace('_', ' ')}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusBadge(emp.status)}`}>
                            {getStatusIcon(emp.status)}
                            <span className="ml-1">{emp.status.replace('_', ' ')}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {emp.performanceScore !== undefined ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    emp.performanceScore >= 90 ? 'bg-emerald-500' :
                                    emp.performanceScore >= 70 ? 'bg-blue-500' :
                                    emp.performanceScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${emp.performanceScore}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono text-muted-foreground">{emp.performanceScore}</span>
                              {emp.performanceScore >= 90 && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Pending</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{emp.salary.toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(emp.hireDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-0.5">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Calculate Payroll" onClick={() => handlePayrollCalc(emp._id)}>
                              <Calculator className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No employees found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          RECRUITMENT TAB
          ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'recruitment' && (
        <>
          {/* Pipeline Funnel (repeated for recruitment tab) */}
          <Card className="border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recruitment Pipeline</CardTitle>
                  <CardDescription>Track candidates through hiring stages</CardDescription>
                </div>
                <Button size="sm" className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Post Job
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-2 mb-6">
                {PIPELINE_STAGES.map((stage, idx) => {
                  const count = pipelineCounts[stage.key] || 0;
                  const StageIcon = stage.icon;
                  return (
                    <React.Fragment key={stage.key}>
                      <div className="flex-1 text-center">
                        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold border-2 ${
                          count > 0 ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-muted border-muted-foreground/20 text-muted-foreground'
                        }`}>
                          {count}
                        </div>
                        <div className="mt-2 flex items-center justify-center gap-1">
                          <StageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">{stage.label}</span>
                        </div>
                      </div>
                      {idx < PIPELINE_STAGES.length - 1 && (
                        <ChevronRight className="h-6 w-6 text-muted-foreground/40 shrink-0" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Applications Table */}
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">All Applications</CardTitle>
              <CardDescription>Candidate tracking and status management</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Application ID</TableHead>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Pipeline Stage</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentApplications.length > 0 ? (
                      recentApplications.map(app => (
                        <TableRow key={app._id}>
                          <TableCell className="font-mono text-xs">{app.applicationId}</TableCell>
                          <TableCell className="text-sm font-medium">{app.applicantName}</TableCell>
                          <TableCell className="text-sm">{app.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusBadge(app.status)}`}>
                              {getStatusIcon(app.status)}
                              <span className="ml-1 capitalize">{app.status.replace('_', ' ')}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(app.appliedDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Review">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          No applications yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Job Postings */}
          <Card className="border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Job Postings</CardTitle>
                  <CardDescription>Manage open positions</CardDescription>
                </div>
                <Button size="sm" className="gap-1" onClick={handleCreateJob}>
                  <Plus className="h-3.5 w-3.5" /> New Position
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Applications</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Posted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentJobs.length > 0 ? (
                      recentJobs.map(job => (
                        <TableRow key={job._id}>
                          <TableCell className="font-mono text-xs">{job.jobId}</TableCell>
                          <TableCell className="text-sm font-medium">{job.title}</TableCell>
                          <TableCell className="text-sm">{job.department}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${job.applicationCount === 0 ? 'border-red-200 text-red-600' : ''}`}>
                              {job.applicationCount}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusBadge(job.status)}`}>
                              {getStatusIcon(job.status)}
                              <span className="ml-1">{job.status.replace('_', ' ')}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(job.postedDate).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">No postings</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          CONTRACTS TAB
          ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'contracts' && (
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Employee Contracts</CardTitle>
                <CardDescription>Contract management and renewals</CardDescription>
              </div>
              <Button size="sm" className="gap-1">
                <Plus className="h-3.5 w-3.5" /> New Contract
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract ID</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead className="text-right">Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.length > 0 ? (
                    contracts.map(contract => {
                      const daysLeft = contract.endDate
                        ? Math.ceil((new Date(contract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                        : null;
                      const isExpiring = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
                      const isExpired = daysLeft !== null && daysLeft < 0;

                      return (
                        <TableRow key={contract._id} className={isExpiring ? 'bg-amber-50/50' : isExpired ? 'bg-red-50/30' : ''}>
                          <TableCell className="font-mono text-xs">{contract.contractId}</TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{contract.employeeId?.firstName} {contract.employeeId?.lastName}</p>
                              <p className="text-[10px] text-muted-foreground">{contract.employeeId?.department}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs capitalize">{contract.contractType?.replace('_', ' ')}</TableCell>
                          <TableCell className="text-sm">{contract.title}</TableCell>
                          <TableCell className="text-xs">{new Date(contract.startDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-xs">
                            {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Permanent'}
                          </TableCell>
                          <TableCell>
                            {daysLeft !== null ? (
                              <span className={`text-xs font-medium ${
                                isExpired ? 'text-red-600' : isExpiring ? 'text-amber-600' : 'text-muted-foreground'
                              }`}>
                                {isExpired ? `${Math.abs(daysLeft)}d expired` : `${daysLeft}d`}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {contract.currency} {contract.salary?.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusBadge(contract.status)}`}>
                              {contract.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {contract.status === 'draft' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => {
                                    setSelectedContract(contract);
                                    setContractOfferOpen(true);
                                  }}
                                >
                                  Send Offer
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Eye className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No contracts found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          PAYSLIPS TAB
          ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'payslips' && (
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Employee Payslips</CardTitle>
                <CardDescription>Payroll processing and payment tracking</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Generate Bulk
                </Button>
                <Button size="sm" className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> New Payslip
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payslip ID</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Pay Period</TableHead>
                    <TableHead>Pay Date</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payslips.length > 0 ? (
                    payslips.map(payslip => (
                      <TableRow key={payslip._id}>
                        <TableCell className="font-mono text-xs">{payslip.payslipId}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{payslip.employeeId?.firstName} {payslip.employeeId?.lastName}</p>
                            <p className="text-[10px] text-muted-foreground">{payslip.employeeId?.department}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {new Date(payslip.payPeriod?.year, payslip.payPeriod?.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-xs">{new Date(payslip.payDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-medium">
                          {payslip.currency} {payslip.netPay?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusBadge(payslip.status)}`}>
                            {getStatusIcon(payslip.status)}
                            <span className="ml-1">{payslip.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-0.5">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {(payslip.status === 'draft' || payslip.status === 'pending') && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Approve">
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No payslips found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MY CONTRACTS TAB (Employee View)
          ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'my-contracts' && (
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">My Employment Contracts</CardTitle>
                <CardDescription>View and sign your employment contracts</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contracts.length > 0 ? (
                contracts.map(contract => (
                  <Card key={contract._id} className="border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm">{contract.title}</CardTitle>
                          <CardDescription className="text-xs">
                            Contract ID: {contract.contractId}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className={`text-[10px] px-2 py-1 ${getStatusBadge(contract.status)}`}>
                          {contract.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-muted-foreground">Salary:</span>
                          <span className="font-mono font-medium ml-2">{contract.currency} {contract.salary?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Start Date:</span>
                          <span className="ml-2">{new Date(contract.startDate).toLocaleDateString()}</span>
                        </div>
                        {contract.endDate && (
                          <div>
                            <span className="text-muted-foreground">End Date:</span>
                            <span className="ml-2">{new Date(contract.endDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Type:</span>
                          <span className="ml-2 capitalize">{contract.contractType?.replace('_', ' ')}</span>
                        </div>
                      </div>

                      {contract.leaveEntitlements && (
                        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                          <h4 className="text-sm font-medium mb-2">Leave Entitlements</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Annual Leave:</span>
                              <span>{contract.leaveEntitlements.annualLeave} days</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Sick Leave:</span>
                              <span>{contract.leaveEntitlements.sickLeave} days</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Maternity Leave:</span>
                              <span>{contract.leaveEntitlements.maternityLeave} days</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Paternity Leave:</span>
                              <span>{contract.leaveEntitlements.paternityLeave} days</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Compassionate Leave:</span>
                              <span>{contract.leaveEntitlements.compassionateLeave} days</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-2">
                        {contract.status === 'offered' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedContract(contract);
                              setContractSignOpen(true);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            Sign Contract
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No contracts found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MY PAYSLIPS TAB (Employee View)
          ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'my-payslips' && (
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">My Payslips</CardTitle>
                <CardDescription>View your salary slips and payment history</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payslip ID</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Pay Date</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payslips.length > 0 ? (
                    payslips.map(payslip => (
                      <TableRow key={payslip._id}>
                        <TableCell className="font-mono text-xs">{payslip.payslipId}</TableCell>
                        <TableCell className="text-xs">
                          {new Date(payslip.payPeriod?.year, payslip.payPeriod?.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-xs">{new Date(payslip.payDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-medium">
                          {payslip.currency} {payslip.netPay?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusBadge(payslip.status)}`}>
                            {getStatusIcon(payslip.status)}
                            <span className="ml-1">{payslip.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No payslips found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
