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
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { apiFetch } from '@/lib/api';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Download,
  FileText,
  Eye,
  Clock,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Send,
  Wallet,
  Receipt,
  RefreshCw,
  BookOpen,
  ArrowUpDown,
  Banknote,
  PiggyBank,
  FileSpreadsheet,
  Layers,
  BarChart3,
  Shield,
  Trash2,
  Lightbulb,
  Package,
  Star,
  Calendar,
  AlertTriangle,
  MoreHorizontal,
} from 'lucide-react';
import { InsightActionCard, InsightItem } from '@/components/ui/InsightActionCard';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AccountingStats {
  totalExpenses: number;
  totalRevenue: number;
  profit: number;
  netIncome?: number;
  outstandingPayments: number;
  profitMargin: number;
  totalAssets?: number;
  totalLiabilities?: number;
  totalEquity?: number;
  cashBalance: number;
  expensesByCategory?: Array<{ category: string; amount: number }>;
}

interface Transaction {
  _id: string;
  transactionId: string;
  transactionNumber?: string;
  transactionType?: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  totalAmount?: number;
  date: string;
  transactionDate?: string;
  status: 'completed' | 'pending' | 'failed' | 'posted' | 'recorded' | 'cancelled';
  reference?: string;
  referenceNumber?: string;
  referenceType?: string;
  accountName: string;
  expenseId?: string;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  clientName: string;
  supplierName?: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'unpaid' | 'overdue' | 'partial';
  paidAmount: number;
  createdAt: string;
}

interface JournalEntry {
  _id: string;
  entryNumber: string;
  transactionDate: string;
  description: string;
  referenceType?: string;
  referenceNumber?: string;
  lines: Array<{
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    description?: string;
  }>;
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
  status: 'draft' | 'posted' | 'reversed';
}

interface MonthlyData {
  month: string;
  expenses: number;
  revenue: number;
}

interface CashFlowData {
  date: string;
  inflow: number;
  outflow: number;
  balance: number;
}



const EXPENSE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'];

export default function AccountingDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState<AccountingStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [, setExpenses] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'invoices' | 'journal' | 'coa' | 'reports' | 'aging' | 'tax' | 'audit' | 'forecast' | 'inventory'>('overview');
  // New tab data
  const [accounts, setAccounts] = useState<any[]>([]);
  const [incomeStatement, setIncomeStatement] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [cashFlowReport, setCashFlowReport] = useState<any>(null);
  const [trialBalance, setTrialBalance] = useState<any>(null);
  const [arAging, setArAging] = useState<any>(null);
  const [apAging, setApAging] = useState<any>(null);
  const [taxRates, setTaxRates] = useState<any[]>([]);
  const [taxSummary, setTaxSummary] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [cashForecast, setCashForecast] = useState<any>(null);
  const [stockOverview, setStockOverview] = useState<any>(null);
  const [cogsData, setCogsData] = useState<any>(null);
  const [recurringExpenses, setRecurringExpenses] = useState<any[]>([]);
  const [transactionView, setTransactionView] = useState<'transactions' | 'recurring'>('transactions');
  const [reportPeriod, setReportPeriod] = useState({ startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0] });
  const [reportTab, setReportTab] = useState<'pl' | 'bs' | 'cf' | 'tb'>('pl');
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({ code: '', name: '', category: 'asset' as string, subcategory: '', description: '', normalBalance: 'debit' as string, balance: 0 });
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [submittingAccount, setSubmittingAccount] = useState(false);
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [submittingRecurring, setSubmittingRecurring] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [txnPage, setTxnPage] = useState(1);
  const txnPerPage = 15;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [loading, setLoading] = useState(true);
  const [journalDialogOpen, setJournalDialogOpen] = useState(false);
  const [autoJournalSource, setAutoJournalSource] = useState<'orders' | 'procurement' | null>(null);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [recurringExpenseDialogOpen, setRecurringExpenseDialogOpen] = useState(false);
  const [viewExpenseDialogOpen, setViewExpenseDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [viewRecurringDialogOpen, setViewRecurringDialogOpen] = useState(false);
  const [editRecurringDialogOpen, setEditRecurringDialogOpen] = useState(false);
  const [selectedRecurringExpense, setSelectedRecurringExpense] = useState<any>(null);
  const [expenseForm, setExpenseForm] = useState({
    expenseType: 'other',
    amount: '',
    description: '',
    vendor: '',
    paymentMethod: 'bank_transfer',
    dueDate: '',
    category: 'Operating Expenses',
    accountCode: '5200',
  });
  const [recurringExpenseForm, setRecurringExpenseForm] = useState({
    expenseType: 'rent',
    amount: '',
    description: '',
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    vendor: '',
    paymentMethod: 'bank_transfer',
    category: 'Operating Expenses',
    accountCode: '5200',
    autoGenerate: true,
    isActive: true,
  });
   // ✅ ADD THESE THREE HERE (inside the component)
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    clientName: '',
    amount: '',
    dueDate: '',
    description: '',
    status: 'unpaid',
  });
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const { user, isAdmin, isAccountant, isStaff } = useHybridAuth();

  useEffect(() => {
    if (user) fetchAccountingData();
  }, [user]);

  const fetchAccountingData = async () => {
    try {
      const [statsRes, transactionsRes, expensesRes, invoicesRes, monthlyRes, cashFlowRes, journalRes, recurringRes] = await Promise.all([
        apiFetch('/api/v1/accounting/stats'),
        apiFetch('/api/v1/accounting/transactions?page=1&limit=50'),
        apiFetch('/api/v1/accounting/expenses?page=1&limit=50'),
        apiFetch('/api/v1/accounting/invoices'),
        apiFetch('/api/v1/accounting/monthly?months=12'),
        apiFetch('/api/v1/accounting/cashflow?days=30'),
        apiFetch('/api/v1/accounting/journal-entries?page=1&limit=20'),
        apiFetch('/api/v1/accounting/recurring-expenses'),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data);
      }

      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        const txns = data.data?.transactions || data.data || [];
        
        // Fetch and merge expenses
        if (expensesRes.ok) {
          const expData = await expensesRes.json();
          const exps = expData.data?.expenses || expData.data || [];
          setExpenses(exps);
          
          // Merge expenses into transactions for display
          const expensesAsTxns = exps.map((exp: any) => ({
            ...exp,
            transactionId: exp.expenseId,
            transactionNumber: exp.expenseId,
            transactionDate: exp.expenseDate,
            type: 'expense',
            date: exp.expenseDate,
            category: exp.category || exp.expenseType,
            accountName: exp.category || exp.expenseType,
            status: exp.status || 'pending'
          }));
          
          setTransactions([...txns, ...expensesAsTxns]);
        } else {
          setTransactions(txns);
        }
      }

      if (invoicesRes.ok) {
        const data = await invoicesRes.json();
        setInvoices(data.data?.invoices || data.data || []);
      }

      if (monthlyRes.ok) {
        const data = await monthlyRes.json();
        setMonthlyData(data.data || []);
      }

      if (cashFlowRes.ok) {
        const data = await cashFlowRes.json();
        setCashFlowData(data.data || []);
      }

      if (journalRes.ok) {
        const data = await journalRes.json();
        setJournalEntries(data.data || []);
      }

      if (recurringRes.ok) {
        const data = await recurringRes.json();
        setRecurringExpenses(data.data?.recurringExpenses || data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch accounting data:', error);
      // Set mock data for demo
      setStats({
        totalExpenses: 2450000,
        totalRevenue: 5890000,
        profit: 3440000,
        netIncome: 3440000,
        outstandingPayments: 890000,
        profitMargin: 58.4,
        totalAssets: 8200000,
        totalLiabilities: 1560000,
        totalEquity: 6640000,
        cashBalance: 4200000,
        expensesByCategory: [
          { category: 'Salaries', amount: 980000 },
          { category: 'Cost of Goods', amount: 620000 },
          { category: 'Rent', amount: 350000 },
          { category: 'Utilities', amount: 180000 },
          { category: 'Supplies', amount: 120000 },
          { category: 'Other', amount: 200000 },
        ]
      });
      
      setMonthlyData([
        { month: 'Jan', expenses: 180000, revenue: 420000 },
        { month: 'Feb', expenses: 195000, revenue: 450000 },
        { month: 'Mar', expenses: 210000, revenue: 480000 },
        { month: 'Apr', expenses: 185000, revenue: 510000 },
        { month: 'May', expenses: 220000, revenue: 490000 },
        { month: 'Jun', expenses: 205000, revenue: 520000 },
        { month: 'Jul', expenses: 230000, revenue: 550000 },
        { month: 'Aug', expenses: 215000, revenue: 580000 },
        { month: 'Sep', expenses: 240000, revenue: 610000 },
        { month: 'Oct', expenses: 225000, revenue: 590000 },
        { month: 'Nov', expenses: 195000, revenue: 620000 },
        { month: 'Dec', expenses: 150000, revenue: 570000 },
      ]);

      setCashFlowData([
        { date: 'Week 1', inflow: 145000, outflow: 85000, balance: 60000 },
        { date: 'Week 2', inflow: 180000, outflow: 120000, balance: 120000 },
        { date: 'Week 3', inflow: 165000, outflow: 95000, balance: 190000 },
        { date: 'Week 4', inflow: 210000, outflow: 140000, balance: 260000 },
      ]);

      setTransactions([
        { _id: '1', transactionId: 'TXN-001', type: 'income', category: 'Sales', description: 'Product sales revenue', amount: 125000, date: '2024-01-15', status: 'completed', accountName: 'Sales Account' },
        { _id: '2', transactionId: 'TXN-002', type: 'expense', category: 'Supplies', description: 'Office supplies purchase', amount: 15000, date: '2024-01-14', status: 'completed', accountName: 'Operating Expenses' },
        { _id: '3', transactionId: 'TXN-003', type: 'income', category: 'Services', description: 'Consulting services', amount: 85000, date: '2024-01-13', status: 'pending', accountName: 'Service Revenue' },
        { _id: '4', transactionId: 'TXN-004', type: 'expense', category: 'Utilities', description: 'Electricity bill', amount: 12000, date: '2024-01-12', status: 'completed', accountName: 'Utilities' },
        { _id: '5', transactionId: 'TXN-005', type: 'expense', category: 'Salaries', description: 'Staff salaries', amount: 180000, date: '2024-01-10', status: 'completed', accountName: 'Payroll' },
      ]);

      setInvoices([
        { _id: '1', invoiceNumber: 'INV-001', clientName: 'ABC Corp', amount: 250000, dueDate: '2024-01-25', status: 'unpaid', paidAmount: 0, createdAt: '2024-01-10' },
        { _id: '2', invoiceNumber: 'INV-002', clientName: 'XYZ Ltd', amount: 180000, dueDate: '2024-01-20', status: 'overdue', paidAmount: 0, createdAt: '2024-01-05' },
        { _id: '3', invoiceNumber: 'INV-003', clientName: 'Tech Solutions', amount: 320000, dueDate: '2024-01-30', status: 'partial', paidAmount: 150000, createdAt: '2024-01-12' },
        { _id: '4', invoiceNumber: 'INV-004', clientName: 'Global Foods', amount: 95000, dueDate: '2024-02-05', status: 'unpaid', paidAmount: 0, createdAt: '2024-01-15' },
      ]);

      setJournalEntries([
        {
          _id: 'je1', entryNumber: 'JE-001', transactionDate: '2024-01-15', description: 'Purchase Order PO-001',
          referenceType: 'PurchaseOrder', referenceNumber: 'PO-001', totalDebit: 125000, totalCredit: 125000,
          balanced: true, status: 'posted',
          lines: [
            { accountCode: '1300', accountName: 'Inventory', debit: 125000, credit: 0 },
            { accountCode: '2000', accountName: 'Accounts Payable', debit: 0, credit: 125000 },
          ]
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Fetch functions for new tabs ───────────────────────────────────────

  const fetchAccounts = async () => {
    try {
      const res = await apiFetch('/api/v1/accounting/accounts');
      if (res.ok) { const d = await res.json(); setAccounts(d.data || []); }
    } catch (e) { console.error('Fetch accounts error:', e); }
  };

  const fetchReports = async () => {
    try {
      const qs = `?startDate=${reportPeriod.startDate}&endDate=${reportPeriod.endDate}`;
      const [plRes, bsRes, cfRes, tbRes] = await Promise.all([
        apiFetch(`/api/v1/accounting/reports/income-statement${qs}`),
        apiFetch(`/api/v1/accounting/reports/balance-sheet?asOfDate=${reportPeriod.endDate}`),
        apiFetch(`/api/v1/accounting/reports/cash-flow${qs}`),
        apiFetch(`/api/v1/accounting/reports/trial-balance?asOfDate=${reportPeriod.endDate}`),
      ]);
      if (plRes.ok) { const d = await plRes.json(); setIncomeStatement(d.data); }
      if (bsRes.ok) { const d = await bsRes.json(); setBalanceSheet(d.data); }
      if (cfRes.ok) { const d = await cfRes.json(); setCashFlowReport(d.data); }
      if (tbRes.ok) { const d = await tbRes.json(); setTrialBalance(d.data); }
    } catch (e) { console.error('Fetch reports error:', e); }
  };

  const fetchAging = async () => {
    try {
      const [arRes, apRes] = await Promise.all([
        apiFetch('/api/v1/accounting/aging/receivable'),
        apiFetch('/api/v1/accounting/aging/payable'),
      ]);
      if (arRes.ok) { const d = await arRes.json(); setArAging(d.data); }
      if (apRes.ok) { const d = await apRes.json(); setApAging(d.data); }
    } catch (e) { console.error('Fetch aging error:', e); }
  };

  const fetchTax = async () => {
    try {
      const [ratesRes, summaryRes] = await Promise.all([
        apiFetch('/api/v1/accounting/tax/rates'),
        apiFetch(`/api/v1/accounting/tax/summary?startDate=${reportPeriod.startDate}&endDate=${reportPeriod.endDate}`),
      ]);
      if (ratesRes.ok) { const d = await ratesRes.json(); setTaxRates(d.data || []); }
      if (summaryRes.ok) { const d = await summaryRes.json(); setTaxSummary(d.data); }
    } catch (e) { console.error('Fetch tax error:', e); }
  };

  const fetchAudit = async () => {
    try {
      const res = await apiFetch('/api/v1/accounting/audit-logs?limit=100');
      if (res.ok) { const d = await res.json(); setAuditLogs(d.data || []); }
    } catch (e) { console.error('Fetch audit error:', e); }
  };

  const fetchInsights = async () => {
    try {
      const res = await apiFetch('/api/v1/accounting/insights');
      if (res.ok) { const d = await res.json(); setInsights(d.data || []); }
    } catch (e) { console.error('Fetch insights error:', e); }
  };

  const fetchCashForecast = async () => {
    try {
      const res = await apiFetch('/api/v1/accounting/cash-flow-forecast?days=30');
      if (res.ok) { const d = await res.json(); setCashForecast(d.data); }
    } catch (e) { console.error('Fetch cash forecast error:', e); }
  };

  const fetchStockOverview = async () => {
    try {
      const res = await apiFetch('/api/v1/accounting/inventory/stock-overview');
      if (res.ok) { const d = await res.json(); setStockOverview(d.data); }
    } catch (e) { console.error('Fetch stock overview error:', e); }
  };

  const fetchCOGS = async () => {
    try {
      const qs = `?startDate=${reportPeriod.startDate}&endDate=${reportPeriod.endDate}`;
      const res = await apiFetch(`/api/v1/accounting/inventory/cogs${qs}`);
      if (res.ok) { const d = await res.json(); setCogsData(d.data); }
    } catch (e) { console.error('Fetch COGS error:', e); }
  };

  const fetchRecurringExpenses = async () => {
    try {
      const res = await apiFetch('/api/v1/accounting/recurring-expenses');
      if (res.ok) { const d = await res.json(); setRecurringExpenses(d.data?.recurringExpenses || []); }
    } catch (e) { console.error('Fetch recurring expenses error:', e); }
  };

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === 'coa') fetchAccounts();
    else if (activeTab === 'reports') fetchReports();
    else if (activeTab === 'aging') fetchAging();
    else if (activeTab === 'tax') fetchTax();
    else if (activeTab === 'audit') fetchAudit();
    else if (activeTab === 'forecast') fetchCashForecast();
    else if (activeTab === 'inventory') { fetchStockOverview(); fetchCOGS(); }
    else if (activeTab === 'overview') fetchInsights();
    else if (activeTab === 'transactions') fetchRecurringExpenses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ─── New tab handlers ─────────────────────────────────────────────────

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAccount(true);
    try {
      const res = await apiFetch('/api/v1/accounting/accounts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountForm),
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Account created' });
        setAccountDialogOpen(false);
        setAccountForm({ code: '', name: '', category: 'asset', subcategory: '', description: '', normalBalance: 'debit', balance: 0 });
        fetchAccounts();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Error', description: err.error || 'Failed to create account', variant: 'destructive' });
      }
    } catch { toast({ title: 'Error', description: 'Network error', variant: 'destructive' }); }
    finally { setSubmittingAccount(false); }
  };

  const handleDeactivateAccount = async (id: string) => {
    try {
      const res = await apiFetch(`/api/v1/accounting/accounts/${id}`, { method: 'DELETE' });
      if (res.ok) { toast({ title: 'Account deactivated' }); fetchAccounts(); }
      else { toast({ title: 'Error', description: 'Failed to deactivate', variant: 'destructive' }); }
    } catch { toast({ title: 'Error', description: 'Network error', variant: 'destructive' }); }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`/api/v1/accounting/invoices/${paymentInvoiceId}/payment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(paymentAmount) }),
      });
      if (res.ok) {
        toast({ title: 'Payment recorded' });
        setPaymentDialogOpen(false);
        setPaymentAmount('');
        fetchAccountingData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Error', description: err.error || 'Failed', variant: 'destructive' });
      }
    } catch { toast({ title: 'Error', description: 'Network error', variant: 'destructive' }); }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm('Delete this invoice?')) return;
    try {
      const res = await apiFetch(`/api/v1/accounting/invoices/${id}`, { method: 'DELETE' });
      if (res.ok) { toast({ title: 'Invoice deleted' }); fetchAccountingData(); }
      else { const err = await res.json().catch(() => ({})); toast({ title: 'Error', description: err.error || 'Failed', variant: 'destructive' }); }
    } catch { toast({ title: 'Error', description: 'Network error', variant: 'destructive' }); }
  };

  const handleBulkInvoiceStatus = async (status: string) => {
    if (selectedInvoices.length === 0) return;
    try {
      const res = await apiFetch('/api/v1/accounting/invoices/bulk-status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedInvoices, status }),
      });
      if (res.ok) { toast({ title: `${selectedInvoices.length} invoices updated` }); setSelectedInvoices([]); fetchAccountingData(); }
      else { toast({ title: 'Error', description: 'Bulk update failed', variant: 'destructive' }); }
    } catch { toast({ title: 'Error', description: 'Network error', variant: 'destructive' }); }
  };

  const toggleInvoiceSelect = (id: string) => {
    setSelectedInvoices(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // ─── Computed values ────────────────────────────────────────────────────

  const accountsPayable = useMemo(() => stats?.totalLiabilities ?? 0, [stats]);
  const accountsReceivable = useMemo(() => {
    const unpaid = invoices.filter(i => i.status === 'unpaid' || i.status === 'overdue' || i.status === 'partial');
    return unpaid.reduce((sum, i) => sum + (i.amount - i.paidAmount), 0);
  }, [invoices]);
  const cashBalance = useMemo(() => stats?.cashBalance ?? 0, [stats]);

  const expensePieData = useMemo(() => {
    if (stats?.expensesByCategory && stats.expensesByCategory.length > 0) {
      return stats.expensesByCategory.map(e => ({ name: e.category, value: e.amount }));
    }
    // Fallback from transactions
    const catMap: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + (t.totalAmount || t.amount);
    });
    return Object.entries(catMap).map(([name, value]) => ({ name, value }));
  }, [stats, transactions]);

  const filteredTransactions = useMemo(() => {
    const result = transactions.filter((txn) => {
      const id = txn.transactionId || txn.transactionNumber || '';
      const matchesSearch =
        id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.category.toLowerCase().includes(searchTerm.toLowerCase());

      if (filterType === 'all') return matchesSearch;
      return matchesSearch && txn.type === filterType;
    });
    return result;
  }, [transactions, searchTerm, filterType]);

  const totalTxnPages = Math.max(1, Math.ceil(filteredTransactions.length / txnPerPage));
  const paginatedTransactions = useMemo(() => {
    const start = (txnPage - 1) * txnPerPage;
    return filteredTransactions.slice(start, start + txnPerPage);
  }, [filteredTransactions, txnPage, txnPerPage]);

  // ─── Status helpers ─────────────────────────────────────────────────────

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      completed: 'bg-green-100 text-green-800 border-green-200',
      posted: 'bg-green-100 text-green-800 border-green-200',
      recorded: 'bg-blue-100 text-blue-800 border-blue-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      paid: 'bg-green-100 text-green-800 border-green-200',
      unpaid: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      overdue: 'bg-red-100 text-red-800 border-red-200',
      partial: 'bg-blue-100 text-blue-800 border-blue-200',
      reversed: 'bg-orange-100 text-orange-800 border-orange-200',
    };
    return variants[status] || variants.pending;
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      completed: <CheckCircle size={14} />,
      posted: <CheckCircle size={14} />,
      recorded: <BookOpen size={14} />,
      pending: <Clock size={14} />,
      draft: <FileText size={14} />,
      failed: <AlertCircle size={14} />,
      cancelled: <AlertCircle size={14} />,
      paid: <CheckCircle size={14} />,
      unpaid: <Clock size={14} />,
      overdue: <AlertCircle size={14} />,
      partial: <DollarSign size={14} />,
      reversed: <ArrowUpDown size={14} />,
    };
    return icons[status] || icons.pending;
  };

  // ─── Smart Actions ──────────────────────────────────────────────────────

  const handleAutoJournal = async (source: 'orders' | 'procurement') => {
    setAutoJournalSource(source);
    setJournalDialogOpen(true);
  };

  const handleConfirmAutoJournal = async () => {
    if (!autoJournalSource) return;
    try {
      const endpoint = autoJournalSource === 'orders'
        ? '/api/v1/accounting/auto-journal/orders'
        : '/api/v1/accounting/auto-journal/procurement';
      const res = await apiFetch(endpoint, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        toast({ title: 'Journal Entries Created', description: `${data.data?.count ?? 0} entries generated from ${autoJournalSource}` });
        fetchAccountingData();
      } else {
        toast({ title: 'Auto-Journal Failed', description: 'Could not create journal entries', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setJournalDialogOpen(false);
      setAutoJournalSource(null);
    }
  };

  const exportCSV = (filename: string, headers: string[], rows: string[][]) => {
    const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = (title: string, headers: string[], rows: string[][]) => {
    const w = window.open('', '_blank');
    if (!w) { toast({ title: 'Error', description: 'Please allow popups for PDF export', variant: 'destructive' }); return; }
    const tableRows = rows.map(r => `<tr>${r.map(c => `<td style="border:1px solid #ddd;padding:6px 10px;font-size:12px">${c}</td>`).join('')}</tr>`).join('');
    w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
      body{font-family:Arial,sans-serif;margin:20px}
      h1{font-size:18px;margin-bottom:4px}
      .meta{color:#666;font-size:12px;margin-bottom:16px}
      table{border-collapse:collapse;width:100%}
      th{border:1px solid #333;padding:8px 10px;background:#f3f4f6;font-size:12px;text-align:left}
      @media print{body{margin:0}button{display:none}}
    </style></head><body>
      <h1>${title}</h1>
      <div class="meta">Generated: ${new Date().toLocaleString()} | Period: ${reportPeriod.startDate} to ${reportPeriod.endDate}</div>
      <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table>
      <br><button onclick="window.print()" style="padding:8px 16px;cursor:pointer">Print / Save as PDF</button>
    </body></html>`);
    w.document.close();
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    const date = new Date().toISOString().slice(0, 10);
    let headers: string[] = [];
    let rows: string[][] = [];
    let title = 'Accounting Report';
    let filename = `accounting-${date}.csv`;

    if (activeTab === 'transactions' || activeTab === 'overview') {
      title = 'Transaction Report';
      filename = `transactions-${date}.csv`;
      headers = ['Date', 'ID', 'Type', 'Account', 'Description', 'Debit (KES)', 'Credit (KES)', 'Status'];
      rows = filteredTransactions.map(t => {
        const amt = t.totalAmount || t.amount;
        return [
          new Date(t.transactionDate || t.date).toLocaleDateString(),
          t.transactionNumber || t.transactionId || '', t.type || t.transactionType || '',
          t.accountName || t.category, t.description,
          t.type === 'expense' ? String(amt) : '', t.type === 'income' ? String(amt) : '', t.status
        ];
      });
    } else if (activeTab === 'invoices') {
      title = 'Invoice Report';
      filename = `invoices-${date}.csv`;
      headers = ['Invoice #', 'Client', 'Amount (KES)', 'Tax (KES)', 'Total (KES)', 'Paid (KES)', 'Balance (KES)', 'Due Date', 'Status'];
      rows = invoices.map(inv => [
        inv.invoiceNumber, inv.supplierName || inv.clientName, String(inv.amount),
        String((inv as any).taxAmount || 0), String((inv as any).totalAmount || inv.amount),
        String(inv.paidAmount), String(inv.amount - inv.paidAmount),
        new Date(inv.dueDate).toLocaleDateString(), inv.status
      ]);
    } else if (activeTab === 'journal') {
      title = 'Journal Entries';
      filename = `journal-entries-${date}.csv`;
      headers = ['Entry #', 'Date', 'Description', 'Total Debit', 'Total Credit', 'Status'];
      rows = journalEntries.map(je => [
        je.entryNumber, new Date(je.transactionDate).toLocaleDateString(),
        je.description, String(je.totalDebit), String(je.totalCredit), je.status
      ]);
    } else if (activeTab === 'coa') {
      title = 'Chart of Accounts';
      filename = `chart-of-accounts-${date}.csv`;
      headers = ['Code', 'Name', 'Category', 'Subcategory', 'Normal Balance', 'Balance (KES)', 'Status'];
      rows = accounts.map(a => [a.code, a.name, a.category, a.subcategory || '', a.normalBalance, String(a.balance), a.status]);
    } else if (activeTab === 'reports') {
      title = reportTab === 'pl' ? 'Income Statement' : reportTab === 'bs' ? 'Balance Sheet' : reportTab === 'cf' ? 'Cash Flow Statement' : 'Trial Balance';
      filename = `${title.toLowerCase().replace(/ /g, '-')}-${date}.csv`;
      if (reportTab === 'tb' && trialBalance) {
        headers = ['Code', 'Account', 'Category', 'Debit (KES)', 'Credit (KES)'];
        rows = (trialBalance.accounts || []).map((a: any) => [a.code, a.name, a.category, String(a.debit || 0), String(a.credit || 0)]);
      } else if (reportTab === 'pl' && incomeStatement) {
        headers = ['Category', 'Amount (KES)'];
        rows = [['Total Revenue', String(incomeStatement.totalRevenue || 0)], ['Total Expenses', String(incomeStatement.totalExpenses || 0)], ['Net Income', String(incomeStatement.netIncome || 0)]];
      } else if (reportTab === 'bs' && balanceSheet) {
        headers = ['Category', 'Amount (KES)'];
        rows = [['Total Assets', String(balanceSheet.totalAssets || 0)], ['Total Liabilities', String(balanceSheet.totalLiabilities || 0)], ['Total Equity', String(balanceSheet.totalEquity || 0)]];
      } else {
        headers = ['Info']; rows = [['No data to export']];
      }
    } else if (activeTab === 'aging') {
      title = 'Aging Report';
      filename = `aging-report-${date}.csv`;
      headers = ['Type', 'Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Total'];
      rows = [];
      if (arAging) rows.push(['Accounts Receivable', String(arAging.current || 0), String(arAging.days30 || 0), String(arAging.days60 || 0), String(arAging.days90 || 0), String(arAging.days90Plus || 0), String(arAging.total || 0)]);
      if (apAging) rows.push(['Accounts Payable', String(apAging.current || 0), String(apAging.days30 || 0), String(apAging.days60 || 0), String(apAging.days90 || 0), String(apAging.days90Plus || 0), String(apAging.total || 0)]);
    } else if (activeTab === 'tax') {
      title = 'Tax Rates';
      filename = `tax-rates-${date}.csv`;
      headers = ['Name', 'Code', 'Type', 'Rate (%)', 'Default', 'Status'];
      rows = taxRates.map((tr: any) => [tr.name, tr.code, tr.type, String(tr.rate), tr.isDefault ? 'Yes' : 'No', tr.isActive ? 'Active' : 'Inactive']);
    } else if (activeTab === 'audit') {
      title = 'Audit Trail';
      filename = `audit-trail-${date}.csv`;
      headers = ['Date', 'Action', 'Entity Type', 'Entity Ref', 'User'];
      rows = auditLogs.map((log: any) => [new Date(log.createdAt).toLocaleString(), log.action, log.entityType, log.entityRef || '', log.userId || '']);
    }

    if (format === 'excel') {
      exportCSV(filename, headers, rows);
      toast({ title: 'Exported', description: `${title} exported as CSV/Excel` });
    } else {
      exportPDF(title, headers, rows);
      toast({ title: 'PDF Export', description: `${title} PDF opened in new tab` });
    }
  };

  const handleCreateExpense = () => {
    setExpenseForm({
      expenseType: 'other',
      amount: '',
      description: '',
      vendor: '',
      paymentMethod: 'bank_transfer',
      dueDate: '',
      category: 'Operating Expenses',
      accountCode: '5200',
    });
    setExpenseDialogOpen(true);
  };

  const handleCreateRecurringExpense = () => {
    setRecurringExpenseForm({
      expenseType: 'rent',
      amount: '',
      description: '',
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      vendor: '',
      paymentMethod: 'bank_transfer',
      category: 'Operating Expenses',
      accountCode: '5200',
      autoGenerate: true,
      isActive: true,
    });
    setRecurringExpenseDialogOpen(true);
  };


const handleSubmitInvoice = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmittingInvoice(true);
  try {
    const payload = {
      clientName: invoiceForm.clientName,
      amount: parseFloat(invoiceForm.amount),
      dueDate: new Date(invoiceForm.dueDate).toISOString(),
      description: invoiceForm.description,
      status: invoiceForm.status,
    };
    const res = await apiFetch('/api/v1/accounting/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast({ title: 'Success', description: 'Invoice created successfully' });
      setInvoiceDialogOpen(false);
      // Reset form
      setInvoiceForm({
        clientName: '',
        amount: '',
        dueDate: '',
        description: '',
        status: 'unpaid',
      });
      // Refresh invoices (and possibly stats)
      await fetchAccountingData();
    } else {
      const errorData = await res.json().catch(() => ({}));
      toast({
        title: 'Error',
        description: errorData.message || 'Failed to create invoice',
        variant: 'destructive',
      });
    }
  } catch (error) {
    console.error('Invoice creation error:', error);
    toast({
      title: 'Error',
      description: 'Network error while creating invoice',
      variant: 'destructive',
    });
  } finally {
    setSubmittingInvoice(false);
  }
};


  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingExpense(true);
    try {
      const res = await apiFetch('/api/v1/accounting/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...expenseForm,
          amount: parseFloat(expenseForm.amount),
          dueDate: expenseForm.dueDate ? new Date(expenseForm.dueDate).toISOString() : undefined,
        }),
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Expense created successfully' });
        setExpenseDialogOpen(false);
        fetchAccountingData();
      } else {
        toast({ title: 'Error', description: 'Failed to create expense', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create expense', variant: 'destructive' });
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleSubmitRecurringExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRecurring(true);
    try {
      const res = await apiFetch('/api/v1/accounting/recurring-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: recurringExpenseForm.description, // Backend requires 'name'
          ...recurringExpenseForm,
          amount: parseFloat(recurringExpenseForm.amount),
          startDate: new Date(recurringExpenseForm.startDate).toISOString(),
          endDate: recurringExpenseForm.endDate ? new Date(recurringExpenseForm.endDate).toISOString() : undefined,
        }),
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Recurring expense created successfully' });
        setRecurringExpenseDialogOpen(false);
        fetchAccountingData();
        fetchRecurringExpenses();
      } else {
        toast({ title: 'Error', description: 'Failed to create recurring expense', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create recurring expense', variant: 'destructive' });
    } finally {
      setSubmittingRecurring(false);
    }
  };

  const handleViewExpense = (expense: any) => {
    setSelectedExpense(expense);
    setViewExpenseDialogOpen(true);
  };

  const handleApproveExpense = async (expenseId: string) => {
    try {
      const res = await apiFetch(`/api/v1/accounting/expenses/${expenseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Expense approved successfully' });
        fetchAccountingData();
      } else {
        toast({ title: 'Error', description: 'Failed to approve expense', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to approve expense', variant: 'destructive' });
    }
  };

  const handleViewRecurringExpense = (rec: any) => {
    setSelectedRecurringExpense(rec);
    setViewRecurringDialogOpen(true);
  };

  const handleEditRecurringExpense = (rec: any) => {
    setSelectedRecurringExpense(rec);
    setRecurringExpenseForm({
      expenseType: rec.expenseType || 'rent',
      amount: String(rec.amount || ''),
      description: rec.description || rec.name || '',
      frequency: rec.frequency || 'monthly',
      startDate: rec.startDate ? new Date(rec.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: rec.endDate ? new Date(rec.endDate).toISOString().split('T')[0] : '',
      vendor: rec.vendor || '',
      paymentMethod: rec.paymentMethod || 'bank_transfer',
      category: rec.category || 'Operating Expenses',
      accountCode: rec.accountCode || '5200',
      autoGenerate: rec.autoGenerate !== false,
      isActive: rec.isActive !== false,
    });
    setEditRecurringDialogOpen(true);
  };

  const handleUpdateRecurringExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecurringExpense) return;
    setSubmittingRecurring(true);
    try {
      const res = await apiFetch(`/api/v1/accounting/recurring-expenses/${selectedRecurringExpense._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: recurringExpenseForm.description,
          ...recurringExpenseForm,
          amount: parseFloat(recurringExpenseForm.amount),
          startDate: new Date(recurringExpenseForm.startDate).toISOString(),
          endDate: recurringExpenseForm.endDate ? new Date(recurringExpenseForm.endDate).toISOString() : undefined,
        }),
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Recurring expense updated successfully' });
        setEditRecurringDialogOpen(false);
        fetchRecurringExpenses();
      } else {
        toast({ title: 'Error', description: 'Failed to update recurring expense', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update recurring expense', variant: 'destructive' });
    } finally {
      setSubmittingRecurring(false);
    }
  };

  const handleDeleteRecurringExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recurring expense?')) return;
    try {
      const res = await apiFetch(`/api/v1/accounting/recurring-expenses/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Recurring expense deleted successfully' });
        fetchRecurringExpenses();
      } else {
        toast({ title: 'Error', description: 'Failed to delete recurring expense', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete recurring expense', variant: 'destructive' });
    }
  };

  // ─── Insights ───────────────────────────────────────────────────────────

  const overdueInvoices = invoices.filter(inv => inv.status === 'overdue');
  const pendingTransactions = transactions.filter(txn => txn.status === 'pending');

  const accountingInsights: InsightItem[] = [];

  if (overdueInvoices.length > 0) {
    const overdueTotal = overdueInvoices.reduce((sum, inv) => sum + (inv.amount - inv.paidAmount), 0);
    accountingInsights.push({
      id: 'overdue-invoices',
      severity: 'critical',
      title: 'Overdue Invoices',
      metric: `${overdueInvoices.length} (KES ${overdueTotal.toLocaleString()})`,
      description: `${overdueInvoices.slice(0, 2).map(i => i.clientName).join(', ')} have overdue payments`,
      action: {
        label: 'Send Reminders',
        onClick: () => setActiveTab('invoices'),
        icon: Send,
      },
    });
  }

  if (accountsPayable > 500000) {
    accountingInsights.push({
      id: 'high-ap',
      severity: 'warning',
      title: 'High Accounts Payable',
      metric: `KES ${accountsPayable.toLocaleString()}`,
      description: 'Outstanding payables exceed recommended threshold',
      action: {
        label: 'Review Payables',
        onClick: () => setActiveTab('invoices'),
        icon: Wallet,
        variant: 'outline',
      },
    });
  }

  if (pendingTransactions.length > 0) {
    const pendingTotal = pendingTransactions.reduce((sum, txn) => sum + (txn.totalAmount || txn.amount), 0);
    accountingInsights.push({
      id: 'pending-transactions',
      severity: 'info',
      title: 'Pending Transactions',
      metric: `${pendingTransactions.length} (KES ${pendingTotal.toLocaleString()})`,
      description: 'Transactions awaiting approval or processing',
      action: {
        label: 'Approve Transactions',
        onClick: () => setActiveTab('transactions'),
        icon: CheckCircle,
        variant: 'outline',
      },
    });
  }

  if (stats && stats.profitMargin < 20) {
    accountingInsights.push({
      id: 'low-margin',
      severity: 'warning',
      title: 'Low Profit Margin',
      metric: `${stats.profitMargin}%`,
      description: 'Profit margin is below the 20% target — review expenses',
      action: {
        label: 'Review Expenses',
        onClick: () => setActiveTab('transactions'),
        icon: Receipt,
        variant: 'outline',
      },
    });
  }

  if (accountingInsights.length === 0 && stats) {
    accountingInsights.push({
      id: 'finances-healthy',
      severity: 'success',
      title: 'Finances Healthy',
      metric: `${stats.profitMargin}% margin`,
      description: 'All financial metrics are within acceptable ranges',
      action: {
        label: 'View Reports',
        onClick: () => setActiveTab('overview'),
        variant: 'outline',
      },
    });
  }

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {[...Array(6)].map((_, i) => (
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
          SMART CARDS (6 cards)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Revenue */}
        <Card className="border shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl font-bold text-emerald-700">
              KES {(stats?.totalRevenue ?? 0).toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
              <ArrowUpRight className="h-2.5 w-2.5 text-emerald-500" />
              Revenue in KES
            </p>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="border shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl font-bold text-red-600">
              KES {(stats?.totalExpenses ?? 0).toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
              <ArrowDownRight className="h-2.5 w-2.5 text-red-500" />
              Expenses in KES
            </p>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className={`border shadow-sm hover:shadow-md transition-all ${(stats?.profit ?? 0) > 0 ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Net Profit</CardTitle>
            <DollarSign className={`h-4 w-4 ${(stats?.profit ?? 0) > 0 ? 'text-emerald-500' : 'text-red-500'}`} />
          </CardHeader>
          <CardContent className="pb-3">
            <div className={`text-xl font-bold ${(stats?.profit ?? 0) > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              KES {(stats?.profit ?? stats?.netIncome ?? 0).toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Margin: {stats?.profitMargin ?? 0}%
            </p>
          </CardContent>
        </Card>

        {/* Cash Balance */}
        <Card className="border shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Cash Balance</CardTitle>
            <PiggyBank className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-xl font-bold">
              KES {cashBalance.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Cash balance in KES
            </p>
          </CardContent>
        </Card>

        {/* Accounts Payable (NEW) */}
        <Card className={`border shadow-sm hover:shadow-md transition-all cursor-pointer ${accountsPayable > 0 ? 'border-orange-200 bg-orange-50/50' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Accts Payable</CardTitle>
            <Wallet className={`h-4 w-4 ${accountsPayable > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent className="pb-3">
            <div className={`text-xl font-bold ${accountsPayable > 0 ? 'text-orange-700' : ''}`}>
              KES {accountsPayable.toLocaleString()}
            </div>
            <p className="text-[10px] text-orange-600 mt-0.5">
              {accountsPayable > 0 ? 'Owed to suppliers' : 'All clear'}
            </p>
          </CardContent>
        </Card>

        {/* Accounts Receivable (NEW) */}
        <Card className={`border shadow-sm hover:shadow-md transition-all cursor-pointer ${accountsReceivable > 0 ? 'border-blue-200 bg-blue-50/50' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Accts Receivable</CardTitle>
            <Banknote className={`h-4 w-4 ${accountsReceivable > 0 ? 'text-blue-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent className="pb-3">
            <div className={`text-xl font-bold ${accountsReceivable > 0 ? 'text-blue-700' : ''}`}>
              KES {accountsReceivable.toLocaleString()}
            </div>
            <p className="text-[10px] text-blue-600 mt-0.5">
              {overdueInvoices.length > 0 ? `${overdueInvoices.length} overdue` : 'Owed to you'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Data -> Insight -> Action Panel */}
      <InsightActionCard insights={accountingInsights} title="Financial Alerts" />

      {/* ═══════════════════════════════════════════════════════════════════
          ACTION TOOLBAR
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => fetchAccountingData()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleAutoJournal('orders')}>
          <BookOpen className="h-3.5 w-3.5" />
          Auto-Journal: Orders
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleAutoJournal('procurement')}>
          <BookOpen className="h-3.5 w-3.5" />
          Auto-Journal: Procurement
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport('excel')}>
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Export Excel
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport('pdf')}>
          <Download className="h-3.5 w-3.5" />
          Export PDF
        </Button>
        <div className="ml-auto text-xs text-muted-foreground">
          {transactions.length} transactions &middot; {invoices.length} invoices &middot; {journalEntries.length} journal entries
        </div>
      </div>

      {/* Auto-Journal Confirmation Dialog */}
      <Dialog open={journalDialogOpen} onOpenChange={setJournalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Auto Journal Entries</DialogTitle>
            <DialogDescription>
              This will automatically create double-entry journal entries from {autoJournalSource === 'orders' ? 'recent orders and POS sales (Sales Revenue ↔ Accounts Receivable). Includes both online orders and in-store POS transactions from the last 30 days.' : 'procurement transactions (Inventory ↔ Accounts Payable)'}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setJournalDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleConfirmAutoJournal} className="gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Generate Entries
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Expense Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Expense</DialogTitle>
            <DialogDescription>Record a business expense</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmitExpense}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Expense Type</label>
                <select
                  className="w-full h-9 px-3 border rounded-lg text-sm"
                  value={expenseForm.expenseType}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expenseType: e.target.value })}
                  required
                >
                  <option value="rent">Rent</option>
                  <option value="electricity">Electricity</option>
                  <option value="water">Water</option>
                  <option value="internet">Internet</option>
                  <option value="insurance">Insurance</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="supplies">Supplies</option>
                  <option value="marketing">Marketing</option>
                  <option value="travel">Travel</option>
                  <option value="professional_services">Professional Services</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Amount (KES)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="Expense description"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Vendor</label>
                <Input
                  placeholder="Vendor name"
                  value={expenseForm.vendor}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Payment Method</label>
                <select
                  className="w-full h-9 px-3 border rounded-lg text-sm"
                  value={expenseForm.paymentMethod}
                  onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="cheque">Cheque</option>
                  <option value="mpesa">M-Pesa</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Due Date (Optional)</label>
              <Input
                type="date"
                value={expenseForm.dueDate}
                onChange={(e) => setExpenseForm({ ...expenseForm, dueDate: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" type="button" onClick={() => setExpenseDialogOpen(false)} disabled={submittingExpense}>Cancel</Button>
              <Button type="submit" disabled={submittingExpense}>{submittingExpense ? 'Creating...' : 'Create Expense'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>


      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Create New Invoice</DialogTitle>
      <DialogDescription>Enter invoice details to send to client.</DialogDescription>
    </DialogHeader>
    <form onSubmit={handleSubmitInvoice} className="space-y-4">
      {/* Client Name */}
      <div>
        <label className="text-sm font-medium">Client Name</label>
        <Input
          placeholder="Client or company name"
          value={invoiceForm.clientName}
          onChange={(e) => setInvoiceForm({ ...invoiceForm, clientName: e.target.value })}
          required
        />
      </div>

      {/* Amount */}
      <div>
        <label className="text-sm font-medium">Amount (KES)</label>
        <Input
          type="number"
          step="0.01"
          placeholder="0.00"
          value={invoiceForm.amount}
          onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
          required
        />
      </div>

      {/* Due Date */}
      <div>
        <label className="text-sm font-medium">Due Date</label>
        <Input
          type="date"
          value={invoiceForm.dueDate}
          onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
          required
        />
      </div>

      {/* Description (Optional) */}
      <div>
        <label className="text-sm font-medium">Description (Optional)</label>
        <Input
          placeholder="Service or product description"
          value={invoiceForm.description}
          onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
        />
      </div>

      {/* Status dropdown (optional, default unpaid) */}
      <div>
        <label className="text-sm font-medium">Status</label>
        <select
          className="w-full h-9 px-3 border rounded-lg text-sm bg-background"
          value={invoiceForm.status}
          onChange={(e) => setInvoiceForm({ ...invoiceForm, status: e.target.value })}
        >
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="partial">Partial</option>
        </select>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          variant="outline"
          type="button"
          onClick={() => setInvoiceDialogOpen(false)}
          disabled={submittingInvoice}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submittingInvoice}>
          {submittingInvoice ? 'Creating...' : 'Create Invoice'}
        </Button>
      </div>
    </form>
  </DialogContent>
</Dialog>

      {/* Create Recurring Expense Dialog */}
      <Dialog open={recurringExpenseDialogOpen} onOpenChange={setRecurringExpenseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Recurring Expense</DialogTitle>
            <DialogDescription>Set up a recurring business expense like rent</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmitRecurringExpense}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Expense Type</label>
                <select
                  className="w-full h-9 px-3 border rounded-lg text-sm"
                  value={recurringExpenseForm.expenseType}
                  onChange={(e) => setRecurringExpenseForm({ ...recurringExpenseForm, expenseType: e.target.value })}
                  required
                >
                  <option value="rent">Rent</option>
                  <option value="electricity">Electricity</option>
                  <option value="water">Water</option>
                  <option value="internet">Internet</option>
                  <option value="insurance">Insurance</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="subscription">Subscription</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Amount (KES)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={recurringExpenseForm.amount}
                  onChange={(e) => setRecurringExpenseForm({ ...recurringExpenseForm, amount: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="Expense description"
                value={recurringExpenseForm.description}
                onChange={(e) => setRecurringExpenseForm({ ...recurringExpenseForm, description: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Frequency</label>
                <select
                  className="w-full h-9 px-3 border rounded-lg text-sm"
                  value={recurringExpenseForm.frequency}
                  onChange={(e) => setRecurringExpenseForm({ ...recurringExpenseForm, frequency: e.target.value })}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={recurringExpenseForm.startDate}
                  onChange={(e) => setRecurringExpenseForm({ ...recurringExpenseForm, startDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Vendor</label>
                <Input
                  placeholder="Vendor name"
                  value={recurringExpenseForm.vendor}
                  onChange={(e) => setRecurringExpenseForm({ ...recurringExpenseForm, vendor: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Payment Method</label>
                <select
                  className="w-full h-9 px-3 border rounded-lg text-sm"
                  value={recurringExpenseForm.paymentMethod}
                  onChange={(e) => setRecurringExpenseForm({ ...recurringExpenseForm, paymentMethod: e.target.value })}
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="cheque">Cheque</option>
                  <option value="mpesa">M-Pesa</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">End Date (Optional)</label>
              <Input
                type="date"
                value={recurringExpenseForm.endDate}
                onChange={(e) => setRecurringExpenseForm({ ...recurringExpenseForm, endDate: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoGenerate"
                checked={recurringExpenseForm.autoGenerate}
                onChange={(e) => setRecurringExpenseForm({ ...recurringExpenseForm, autoGenerate: e.target.checked })}
              />
              <label htmlFor="autoGenerate" className="text-sm">Auto-generate expenses</label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" type="button" onClick={() => setRecurringExpenseDialogOpen(false)} disabled={submittingRecurring}>Cancel</Button>
              <Button type="submit" disabled={submittingRecurring}>{submittingRecurring ? 'Creating...' : 'Create Recurring Expense'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Expense Details Dialog */}
      <Dialog open={viewExpenseDialogOpen} onOpenChange={setViewExpenseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Expense ID</label>
                  <p className="text-sm font-mono">{selectedExpense.expenseId || selectedExpense.transactionId}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge variant={selectedExpense.status === 'approved' ? 'default' : 'secondary'}>
                      {selectedExpense.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Description</label>
                <p className="text-sm">{selectedExpense.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Amount</label>
                  <p className="text-sm font-semibold text-red-600">KES {(selectedExpense.amount || selectedExpense.totalAmount)?.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Type</label>
                  <p className="text-sm capitalize">{selectedExpense.expenseType || selectedExpense.type}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Date</label>
                  <p className="text-sm">{new Date(selectedExpense.expenseDate || selectedExpense.transactionDate || selectedExpense.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Payment Method</label>
                  <p className="text-sm capitalize">{selectedExpense.paymentMethod?.replace('_', ' ') || '—'}</p>
                </div>
              </div>
              {selectedExpense.vendor && (
                <div>
                  <label className="text-xs text-muted-foreground">Vendor</label>
                  <p className="text-sm">{selectedExpense.vendor}</p>
                </div>
              )}
              {selectedExpense.category && (
                <div>
                  <label className="text-xs text-muted-foreground">Category</label>
                  <p className="text-sm">{selectedExpense.category}</p>
                </div>
              )}
              {selectedExpense.referenceNumber && (
                <div>
                  <label className="text-xs text-muted-foreground">Reference Number</label>
                  <p className="text-sm font-mono">{selectedExpense.referenceNumber}</p>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            {selectedExpense?.status === 'pending' && selectedExpense?.expenseId && (
              <Button 
                onClick={() => {
                  handleApproveExpense(selectedExpense._id);
                  setViewExpenseDialogOpen(false);
                }}
                className="gap-1"
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </Button>
            )}
            <Button variant="outline" onClick={() => setViewExpenseDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Recurring Expense Dialog */}
      <Dialog open={viewRecurringDialogOpen} onOpenChange={setViewRecurringDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Recurring Expense Details</DialogTitle>
          </DialogHeader>
          {selectedRecurringExpense && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Recurring ID</label>
                  <p className="text-sm font-mono">{selectedRecurringExpense.recurringId}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge variant={selectedRecurringExpense.isActive ? 'default' : 'secondary'}>
                      {selectedRecurringExpense.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Name/Description</label>
                <p className="text-sm">{selectedRecurringExpense.name || selectedRecurringExpense.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Amount</label>
                  <p className="text-sm font-semibold text-red-600">KES {selectedRecurringExpense.amount?.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Frequency</label>
                  <p className="text-sm capitalize">{selectedRecurringExpense.frequency}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Expense Type</label>
                  <p className="text-sm capitalize">{selectedRecurringExpense.expenseType}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Payment Method</label>
                  <p className="text-sm capitalize">{selectedRecurringExpense.paymentMethod?.replace('_', ' ') || '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Start Date</label>
                  <p className="text-sm">{new Date(selectedRecurringExpense.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Next Due Date</label>
                  <p className="text-sm">{selectedRecurringExpense.nextDueDate ? new Date(selectedRecurringExpense.nextDueDate).toLocaleDateString() : '—'}</p>
                </div>
              </div>
              {selectedRecurringExpense.endDate && (
                <div>
                  <label className="text-xs text-muted-foreground">End Date</label>
                  <p className="text-sm">{new Date(selectedRecurringExpense.endDate).toLocaleDateString()}</p>
                </div>
              )}
              {selectedRecurringExpense.vendor && (
                <div>
                  <label className="text-xs text-muted-foreground">Vendor</label>
                  <p className="text-sm">{selectedRecurringExpense.vendor}</p>
                </div>
              )}
              {selectedRecurringExpense.category && (
                <div>
                  <label className="text-xs text-muted-foreground">Category</label>
                  <p className="text-sm">{selectedRecurringExpense.category}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Auto-Generate</label>
                  <p className="text-sm">{selectedRecurringExpense.autoGenerate ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Account Code</label>
                  <p className="text-sm font-mono">{selectedRecurringExpense.accountCode || '—'}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setViewRecurringDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Recurring Expense Dialog */}
      <Dialog open={editRecurringDialogOpen} onOpenChange={setEditRecurringDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Recurring Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateRecurringExpense} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Description/Name *</label>
              <Input
                value={recurringExpenseForm.description}
                onChange={(e) => setRecurringExpenseForm({ ...recurringExpenseForm, description: e.target.value })}
                placeholder="e.g., Office Rent"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Amount (KES) *</label>
                <Input
                  type="number"
                  value={recurringExpenseForm.amount}
                  onChange={(e) => setRecurringExpenseForm({ ...recurringExpenseForm, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Frequency *</label>
                <select
                  value={recurringExpenseForm.frequency}
                  onChange={(e) => setRecurringExpenseForm({ ...recurringExpenseForm, frequency: e.target.value })}
                  className="w-full h-9 px-3 border rounded-lg text-sm bg-background"
                  required
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Expense Type *</label>
                <select
                  value={recurringExpenseForm.expenseType}
                  onChange={(e) => setRecurringExpenseForm({ ...recurringExpenseForm, expenseType: e.target.value })}
                  className="w-full h-9 px-3 border rounded-lg text-sm bg-background"
                  required
                >
                  <option value="rent">Rent</option>
                  <option value="utilities">Utilities</option>
                  <option value="salaries">Salaries</option>
                  <option value="subscriptions">Subscriptions</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="insurance">Insurance</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Payment Method</label>
                <select
                  value={recurringExpenseForm.paymentMethod}
                  onChange={(e) => setRecurringExpenseForm({ ...recurringExpenseForm, paymentMethod: e.target.value })}
                  className="w-full h-9 px-3 border rounded-lg text-sm bg-background"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Vendor</label>
              <Input
                value={recurringExpenseForm.vendor}
                onChange={(e) => setRecurringExpenseForm({ ...recurringExpenseForm, vendor: e.target.value })}
                placeholder="Vendor name (optional)"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Start Date *</label>
                <Input
                  type="date"
                  value={recurringExpenseForm.startDate}
                  onChange={(e) => setRecurringExpenseForm({ ...recurringExpenseForm, startDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date (Optional)</label>
                <Input
                  type="date"
                  value={recurringExpenseForm.endDate}
                  onChange={(e) => setRecurringExpenseForm({ ...recurringExpenseForm, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editIsActive"
                checked={recurringExpenseForm.isActive}
                onChange={(e) => setRecurringExpenseForm({ ...recurringExpenseForm, isActive: e.target.checked })}
              />
              <label htmlFor="editIsActive" className="text-sm">Active</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editAutoGenerate"
                checked={recurringExpenseForm.autoGenerate}
                onChange={(e) => setRecurringExpenseForm({ ...recurringExpenseForm, autoGenerate: e.target.checked })}
              />
              <label htmlFor="editAutoGenerate" className="text-sm">Auto-generate expenses</label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" type="button" onClick={() => setEditRecurringDialogOpen(false)} disabled={submittingRecurring}>Cancel</Button>
              <Button type="submit" disabled={submittingRecurring}>{submittingRecurring ? 'Updating...' : 'Update Recurring Expense'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════
          TAB NAVIGATION - Overview + More Menu
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex gap-1 border-b items-center">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('overview')}
          size="sm"
          className="gap-1.5 rounded-b-none"
        >
          <Eye className="h-3.5 w-3.5" />
          Overview
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 rounded-b-none"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
              More
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {([
              { key: 'transactions', label: 'Transactions', icon: CreditCard, minRole: 'staff' },
              { key: 'invoices', label: 'Invoices', icon: FileText, minRole: 'staff' },
              { key: 'journal', label: 'Journal', icon: BookOpen, minRole: 'accountant' },
              { key: 'coa', label: 'Chart of Accounts', icon: Layers, minRole: 'accountant' },
              { key: 'reports', label: 'Reports', icon: BarChart3, minRole: 'accountant' },
              { key: 'aging', label: 'Aging', icon: Clock, minRole: 'accountant' },
              { key: 'forecast', label: 'Cash Forecast', icon: TrendingUp, minRole: 'accountant' },
              { key: 'inventory', label: 'Inventory', icon: Package, minRole: 'accountant' },
              { key: 'tax', label: 'Tax', icon: Receipt, minRole: 'accountant' },
              { key: 'audit', label: 'Audit', icon: Shield, minRole: 'admin' },
            ] as const).filter(tab => {
              if (tab.minRole === 'admin') return isAdmin;
              if (tab.minRole === 'accountant') return isAdmin || isAccountant;
              return isAdmin || isAccountant || isStaff;
            }).map(tab => (
              <DropdownMenuItem key={tab.key} onClick={() => setActiveTab(tab.key)}>
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          OVERVIEW TAB
          ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* Charts: Cash Flow Timeline + Expense Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cash Flow Timeline */}
            <Card className="border shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Cash Flow Timeline</CardTitle>
                <CardDescription>30-day inflow vs outflow</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={cashFlowData}>
                    <defs>
                      <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      formatter={(value: number) => `KES ${value.toLocaleString()}`}
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="inflow" stroke="#10b981" fillOpacity={1} fill="url(#colorInflow)" name="Inflow" />
                    <Area type="monotone" dataKey="outflow" stroke="#ef4444" fillOpacity={1} fill="url(#colorOutflow)" name="Outflow" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Expense Breakdown Pie Chart */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Expense Breakdown</CardTitle>
                <CardDescription>By category</CardDescription>
              </CardHeader>
              <CardContent>
                {expensePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={expensePieData}
                        cx="50%"
                        cy="45%"
                        innerRadius={45}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {expensePieData.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `KES ${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">No expense data</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Smart Insights */}
          {insights.length > 0 && (
            <Card className="border shadow-sm bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Smart Insights
                </CardTitle>
                <CardDescription>AI-powered business intelligence</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.map((insight: any, idx: number) => {
                    const Icon = insight.icon === 'TrendingUp' ? TrendingUp : insight.icon === 'TrendingDown' ? TrendingDown : insight.icon === 'Star' ? Star : insight.icon === 'Clock' ? Clock : insight.icon === 'Calendar' ? Calendar : AlertTriangle;
                    const colorClass = insight.type === 'warning' ? 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-200' : insight.type === 'success' ? 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-200' : insight.type === 'danger' ? 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900 dark:border-red-700 dark:text-red-200' : 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200';
                    return (
                      <div key={idx} className={`p-3 rounded-lg border ${colorClass}`}>
                        <div className="flex items-start gap-2">
                          <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{insight.message}</p>
                            {insight.detail && <p className="text-xs mt-1 opacity-80">{insight.detail}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Monthly Revenue vs Expenses */}
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Monthly Financial Overview</CardTitle>
              <CardDescription>Revenue vs Expenses (12 months)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    formatter={(value: number) => `KES ${value.toLocaleString()}`}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Transactions Preview */}
          <Card className="border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recent Transactions</CardTitle>
                  <CardDescription>Latest financial activities</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('transactions')} className="gap-1 text-xs">
                  View All <ArrowUpRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.slice(0, 5).map((txn) => {
                      const amt = txn.totalAmount || txn.amount;
                      return (
                        <TableRow key={txn._id}>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(txn.transactionDate || txn.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-sm">{txn.accountName || txn.category}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{txn.description}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-red-600">
                            {txn.type === 'expense' ? amt.toLocaleString() : '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-emerald-600">
                            {txn.type === 'income' ? amt.toLocaleString() : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusBadge(txn.status)}`}>
                              {getStatusIcon(txn.status)}
                              <span className="ml-1">{txn.status}</span>
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TRANSACTIONS TAB
          ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'transactions' && (
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">All Transactions</CardTitle>
                <CardDescription>Date, Account, Debit/Credit ledger view</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('excel')}>
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
                <Button size="sm" className="gap-1" onClick={handleCreateRecurringExpense}>
                  <Plus className="h-3.5 w-3.5" /> Recurring
                </Button>
                <Button size="sm" className="gap-1" onClick={handleCreateExpense}>
                  <Plus className="h-3.5 w-3.5" /> New Expense
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              <div className="flex gap-1 border rounded-lg p-1">
                <Button
                  variant={transactionView === 'transactions' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTransactionView('transactions')}
                  className="h-7"
                >
                  Transactions
                </Button>
                <Button
                  variant={transactionView === 'recurring' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTransactionView('recurring')}
                  className="h-7"
                >
                  Recurring Expenses
                </Button>
              </div>
              {transactionView === 'transactions' && (
                <>
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-xs h-9"
                  />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="h-9 px-3 border rounded-lg text-sm bg-background"
                  >
                    <option value="all">All Types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {transactionView === 'transactions' ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Ref</TableHead>
                      <TableHead className="text-right">Debit (KES)</TableHead>
                      <TableHead className="text-right">Credit (KES)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-16">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransactions.length > 0 ? (
                      paginatedTransactions.map((txn) => {
                        const amt = txn.totalAmount || txn.amount;
                        return (
                          <TableRow key={txn._id}>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(txn.transactionDate || txn.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{txn.transactionNumber || txn.transactionId}</TableCell>
                            <TableCell className="text-sm">{txn.accountName || txn.category}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{txn.description}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{txn.referenceNumber || txn.reference || '—'}</TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {txn.type === 'expense' ? <span className="text-red-600">{amt.toLocaleString()}</span> : '—'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {txn.type === 'income' ? <span className="text-emerald-600">{amt.toLocaleString()}</span> : '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusBadge(txn.status)}`}>
                                {getStatusIcon(txn.status)}
                                <span className="ml-1">{txn.status}</span>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-0.5">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 w-7 p-0" 
                                  title="View"
                                  onClick={() => handleViewExpense(txn)}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                {txn.status === 'pending' && txn.expenseId && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 w-7 p-0" 
                                    title="Approve"
                                    onClick={() => handleApproveExpense(txn._id)}
                                  >
                                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          No transactions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead className="text-right">Amount (KES)</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Next Due</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Auto-Gen</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recurringExpenses.length > 0 ? (
                      recurringExpenses.map((rec: any) => (
                        <TableRow key={rec._id}>
                          <TableCell className="font-medium">{rec.name || rec.description}</TableCell>
                          <TableCell className="text-sm capitalize">{rec.expenseType}</TableCell>
                          <TableCell className="text-sm capitalize">{rec.frequency}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            <span className="text-red-600">{rec.amount?.toLocaleString()}</span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(rec.startDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {rec.nextDueDate ? new Date(rec.nextDueDate).toLocaleDateString() : '—'}
                          </TableCell>
                          <TableCell className="text-sm">{rec.vendor || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={rec.isActive ? 'default' : 'secondary'} className="text-[10px]">
                              {rec.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {rec.autoGenerate ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <span className="text-xs text-muted-foreground">Manual</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-0.5">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0" 
                                title="View"
                                onClick={() => handleViewRecurringExpense(rec)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0" 
                                title="Edit"
                                onClick={() => handleEditRecurringExpense(rec)}
                              >
                                <FileText className="h-3.5 w-3.5 text-blue-600" />
                              </Button>
                              {isAdmin && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 w-7 p-0" 
                                  title="Delete"
                                  onClick={() => handleDeleteRecurringExpense(rec._id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          No recurring expenses found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            {/* Pagination Controls */}
            {transactionView === 'transactions' && filteredTransactions.length > txnPerPage && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-xs text-muted-foreground">
                  Showing {((txnPage - 1) * txnPerPage) + 1}–{Math.min(txnPage * txnPerPage, filteredTransactions.length)} of {filteredTransactions.length}
                </span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={txnPage <= 1} onClick={() => setTxnPage(1)}>First</Button>
                  <Button variant="outline" size="sm" disabled={txnPage <= 1} onClick={() => setTxnPage(p => p - 1)}>Prev</Button>
                  <span className="px-3 py-1 text-sm font-medium">{txnPage} / {totalTxnPages}</span>
                  <Button variant="outline" size="sm" disabled={txnPage >= totalTxnPages} onClick={() => setTxnPage(p => p + 1)}>Next</Button>
                  <Button variant="outline" size="sm" disabled={txnPage >= totalTxnPages} onClick={() => setTxnPage(totalTxnPages)}>Last</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          INVOICES TAB
          ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'invoices' && (
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Invoices</CardTitle>
                <CardDescription>Supplier, status, and due date tracking</CardDescription>
              </div>
              <div className="flex gap-2">
                {selectedInvoices.length > 0 && (
                  <>
                    <span className="text-xs text-muted-foreground self-center">{selectedInvoices.length} selected</span>
                    <Button variant="outline" size="sm" className="gap-1 text-green-600" onClick={() => handleBulkInvoiceStatus('paid')}>
                      <CheckCircle className="h-3.5 w-3.5" /> Mark Paid
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1 text-red-600" onClick={() => handleBulkInvoiceStatus('overdue')}>
                      <AlertCircle className="h-3.5 w-3.5" /> Mark Overdue
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('excel')}>
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
                <Button size="sm" className="gap-1" onClick={() => setInvoiceDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5" /> New Invoice
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <input type="checkbox" checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                        onChange={e => setSelectedInvoices(e.target.checked ? invoices.map(i => i._id) : [])} />
                    </TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client / Supplier</TableHead>
                    <TableHead className="text-right">Amount (KES)</TableHead>
                    <TableHead className="text-right">Paid (KES)</TableHead>
                    <TableHead className="text-right">Balance (KES)</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length > 0 ? (
                    invoices.map((invoice) => {
                      const balance = invoice.amount - invoice.paidAmount;
                      const daysUntilDue = Math.ceil((new Date(invoice.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const isOverdue = daysUntilDue < 0 && invoice.status !== 'paid';

                      return (
                        <TableRow key={invoice._id} className={isOverdue ? 'bg-red-50/50' : ''}>
                          <TableCell>
                            <input type="checkbox" checked={selectedInvoices.includes(invoice._id)}
                              onChange={() => toggleInvoiceSelect(invoice._id)} />
                          </TableCell>
                          <TableCell className="font-mono text-xs font-medium">{invoice.invoiceNumber}</TableCell>
                          <TableCell className="text-sm">{invoice.supplierName || invoice.clientName}</TableCell>
                          <TableCell className="text-right text-sm font-mono">{invoice.amount.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-sm font-mono text-emerald-600">{invoice.paidAmount.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-sm font-mono font-medium text-orange-600">
                            {balance.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs">{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {invoice.status !== 'paid' && (
                              <span className={`text-xs font-medium ${isOverdue ? 'text-red-600' : daysUntilDue <= 3 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                {isOverdue ? `${Math.abs(daysUntilDue)}d late` : `${daysUntilDue}d`}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusBadge(invoice.status)}`}>
                              {getStatusIcon(invoice.status)}
                              <span className="ml-1">{invoice.status}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-0.5">
                              {invoice.status !== 'paid' && (
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Record Payment"
                                  onClick={() => { setPaymentInvoiceId(invoice._id); setPaymentDialogOpen(true); }}>
                                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                                </Button>
                              )}
                              {isOverdue && (
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Send Reminder">
                                  <Send className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              )}
                              {isAdmin && (
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Delete"
                                  onClick={() => handleDeleteInvoice(invoice._id)}>
                                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No invoices found
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
          JOURNAL ENTRIES TAB
          ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'journal' && (
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Journal Entries</CardTitle>
                <CardDescription>Double-entry bookkeeping ledger</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('excel')}>
                  <Download className="h-3.5 w-3.5" /> Excel
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('pdf')}>
                  <FileText className="h-3.5 w-3.5" /> PDF
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => handleAutoJournal('orders')}>
                  <BookOpen className="h-3.5 w-3.5" /> Auto from Orders
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => handleAutoJournal('procurement')}>
                  <BookOpen className="h-3.5 w-3.5" /> Auto from Procurement
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {journalEntries.length > 0 ? (
                journalEntries.map(je => (
                  <div key={je._id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium">{je.entryNumber}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusBadge(je.status)}`}>
                          {getStatusIcon(je.status)}
                          <span className="ml-1">{je.status}</span>
                        </Badge>
                        {je.balanced && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">
                            Balanced
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(je.transactionDate).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{je.description}</p>
                    {je.referenceNumber && (
                      <p className="text-xs text-muted-foreground">Ref: {je.referenceType} — {je.referenceNumber}</p>
                    )}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Account</TableHead>
                          <TableHead className="text-xs text-right">Debit</TableHead>
                          <TableHead className="text-xs text-right">Credit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {je.lines.map((line, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs py-1">
                              <span className="font-mono text-muted-foreground mr-1">{line.accountCode}</span>
                              {line.accountName}
                            </TableCell>
                            <TableCell className="text-right text-xs py-1 font-mono">
                              {line.debit > 0 ? <span className="text-red-600">{line.debit.toLocaleString()}</span> : '—'}
                            </TableCell>
                            <TableCell className="text-right text-xs py-1 font-mono">
                              {line.credit > 0 ? <span className="text-emerald-600">{line.credit.toLocaleString()}</span> : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2">
                          <TableCell className="text-xs py-1 font-medium">Total</TableCell>
                          <TableCell className="text-right text-xs py-1 font-mono font-medium">{je.totalDebit.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-xs py-1 font-mono font-medium">{je.totalCredit.toLocaleString()}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No journal entries yet</p>
                  <p className="text-xs mt-1">Use auto-journal to generate entries from orders or procurement</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          CHART OF ACCOUNTS TAB
          ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'coa' && (
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Chart of Accounts</CardTitle>
                <CardDescription>Manage your account structure</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('excel')}>
                  <Download className="h-3.5 w-3.5" /> Excel
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('pdf')}>
                  <FileText className="h-3.5 w-3.5" /> PDF
                </Button>
                <Button size="sm" className="gap-1" onClick={() => setAccountDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5" /> New Account
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Subcategory</TableHead>
                    <TableHead>Normal Balance</TableHead>
                    <TableHead className="text-right">Balance (KES)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.length > 0 ? accounts.map(acct => (
                    <TableRow key={acct._id}>
                      <TableCell className="font-mono text-xs font-medium">{acct.code}</TableCell>
                      <TableCell className="text-sm">{acct.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">{acct.category}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{acct.subcategory || '—'}</TableCell>
                      <TableCell className="text-xs capitalize">{acct.normalBalance}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{(acct.balance || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${acct.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                          {acct.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {acct.status === 'active' && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Deactivate" onClick={() => handleDeactivateAccount(acct._id)}>
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No accounts found. Initialize chart of accounts first.
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
          REPORTS TAB (P&L, Balance Sheet, Cash Flow, Trial Balance)
          ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {/* Period selector + sub-tabs */}
          <Card className="border shadow-sm">
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">From:</label>
                  <Input type="date" className="h-8 w-40" value={reportPeriod.startDate}
                    onChange={e => setReportPeriod(p => ({ ...p, startDate: e.target.value }))} />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">To:</label>
                  <Input type="date" className="h-8 w-40" value={reportPeriod.endDate}
                    onChange={e => setReportPeriod(p => ({ ...p, endDate: e.target.value }))} />
                </div>
                <Button size="sm" onClick={fetchReports} className="gap-1">
                  <RefreshCw className="h-3.5 w-3.5" /> Generate
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('excel')}>
                  <Download className="h-3.5 w-3.5" /> Excel
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('pdf')}>
                  <FileText className="h-3.5 w-3.5" /> PDF
                </Button>
                <div className="ml-auto flex gap-1">
                  {([
                    { key: 'pl', label: 'P&L' },
                    { key: 'bs', label: 'Balance Sheet' },
                    { key: 'cf', label: 'Cash Flow' },
                    { key: 'tb', label: 'Trial Balance' },
                  ] as const).map(rt => (
                    <Button key={rt.key} size="sm" variant={reportTab === rt.key ? 'default' : 'outline'}
                      onClick={() => setReportTab(rt.key)}>{rt.label}</Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* P&L */}
          {reportTab === 'pl' && incomeStatement && (
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Income Statement (Profit & Loss)</CardTitle>
                <CardDescription>{reportPeriod.startDate} to {reportPeriod.endDate}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-700 mb-2">Revenue</h4>
                    <Table>
                      <TableBody>
                        {incomeStatement.revenue?.map((r: any) => (
                          <TableRow key={r.code}>
                            <TableCell className="font-mono text-xs w-20">{r.code}</TableCell>
                            <TableCell className="text-sm">{r.name}</TableCell>
                            <TableCell className="text-right font-mono text-sm text-emerald-600">{r.amount.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2 font-bold">
                          <TableCell colSpan={2} className="text-sm">Total Revenue</TableCell>
                          <TableCell className="text-right font-mono text-sm text-emerald-700">{(incomeStatement.totalRevenue || 0).toLocaleString()}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-red-700 mb-2">Expenses</h4>
                    <Table>
                      <TableBody>
                        {incomeStatement.expenses?.map((e: any) => (
                          <TableRow key={e.code}>
                            <TableCell className="font-mono text-xs w-20">{e.code}</TableCell>
                            <TableCell className="text-sm">{e.name}</TableCell>
                            <TableCell className="text-right font-mono text-sm text-red-600">{e.amount.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2 font-bold">
                          <TableCell colSpan={2} className="text-sm">Total Expenses</TableCell>
                          <TableCell className="text-right font-mono text-sm text-red-700">{(incomeStatement.totalExpenses || 0).toLocaleString()}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  <div className="border-t-4 pt-3 flex justify-between items-center">
                    <span className="text-base font-bold">Net Income</span>
                    <span className={`text-xl font-bold font-mono ${(incomeStatement.netIncome || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      KES {(incomeStatement.netIncome || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Balance Sheet */}
          {reportTab === 'bs' && balanceSheet && (
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Balance Sheet</CardTitle>
                <CardDescription>As of {reportPeriod.endDate}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-blue-700 mb-2">Assets</h4>
                    <Table><TableBody>
                      {balanceSheet.assets?.map((a: any) => (
                        <TableRow key={a.code}>
                          <TableCell className="font-mono text-xs">{a.code}</TableCell>
                          <TableCell className="text-sm">{a.name}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{a.balance.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2 font-bold">
                        <TableCell colSpan={2}>Total Assets</TableCell>
                        <TableCell className="text-right font-mono">{(balanceSheet.totalAssets || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody></Table>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-orange-700 mb-2">Liabilities</h4>
                      <Table><TableBody>
                        {balanceSheet.liabilities?.map((l: any) => (
                          <TableRow key={l.code}>
                            <TableCell className="font-mono text-xs">{l.code}</TableCell>
                            <TableCell className="text-sm">{l.name}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{l.balance.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2 font-bold">
                          <TableCell colSpan={2}>Total Liabilities</TableCell>
                          <TableCell className="text-right font-mono">{(balanceSheet.totalLiabilities || 0).toLocaleString()}</TableCell>
                        </TableRow>
                      </TableBody></Table>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-purple-700 mb-2">Equity</h4>
                      <Table><TableBody>
                        {balanceSheet.equity?.map((e: any) => (
                          <TableRow key={e.code}>
                            <TableCell className="font-mono text-xs">{e.code}</TableCell>
                            <TableCell className="text-sm">{e.name}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{e.balance.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell className="font-mono text-xs">—</TableCell>
                          <TableCell className="text-sm italic">Retained Earnings</TableCell>
                          <TableCell className="text-right font-mono text-sm">{(balanceSheet.retainedEarnings || 0).toLocaleString()}</TableCell>
                        </TableRow>
                        <TableRow className="border-t-2 font-bold">
                          <TableCell colSpan={2}>Total Equity</TableCell>
                          <TableCell className="text-right font-mono">{(balanceSheet.totalEquity || 0).toLocaleString()}</TableCell>
                        </TableRow>
                      </TableBody></Table>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                  <span className="text-sm font-medium">Balance Check: Assets = Liabilities + Equity</span>
                  <Badge variant="outline" className={balanceSheet.balanced ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}>
                    {balanceSheet.balanced ? 'Balanced ✓' : 'Not Balanced ✗'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cash Flow */}
          {reportTab === 'cf' && cashFlowReport && (
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Cash Flow Statement</CardTitle>
                <CardDescription>{reportPeriod.startDate} to {reportPeriod.endDate}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(['operating', 'investing', 'financing'] as const).map(section => (
                    <div key={section} className="border rounded-lg p-4">
                      <h4 className="text-sm font-semibold capitalize mb-2">{section} Activities</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div><span className="text-muted-foreground">Inflow:</span> <span className="font-mono text-emerald-600 ml-1">{(cashFlowReport[section]?.inflow || 0).toLocaleString()}</span></div>
                        <div><span className="text-muted-foreground">Outflow:</span> <span className="font-mono text-red-600 ml-1">{(cashFlowReport[section]?.outflow || 0).toLocaleString()}</span></div>
                        <div><span className="text-muted-foreground">Net:</span> <span className={`font-mono font-bold ml-1 ${(cashFlowReport[section]?.net || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{(cashFlowReport[section]?.net || 0).toLocaleString()}</span></div>
                      </div>
                    </div>
                  ))}
                  <div className="border-t-4 pt-3 flex justify-between items-center">
                    <span className="font-bold">Net Cash Change</span>
                    <span className={`text-lg font-bold font-mono ${(cashFlowReport.netCashChange || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      KES {(cashFlowReport.netCashChange || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Ending Cash Balance</span>
                    <span className="font-mono font-bold">KES {(cashFlowReport.endingCashBalance || 0).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trial Balance */}
          {reportTab === 'tb' && trialBalance && (
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Trial Balance</CardTitle>
                <CardDescription>As of {trialBalance.asOfDate ? new Date(trialBalance.asOfDate).toLocaleDateString() : reportPeriod.endDate}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Account Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Debit (KES)</TableHead>
                        <TableHead className="text-right">Credit (KES)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trialBalance.accounts?.map((a: any) => (
                        <TableRow key={a.accountCode}>
                          <TableCell className="font-mono text-xs">{a.accountCode}</TableCell>
                          <TableCell className="text-sm">{a.accountName}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px] capitalize">{a.category}</Badge></TableCell>
                          <TableCell className="text-right font-mono text-sm">{a.debitBalance > 0 ? a.debitBalance.toLocaleString() : '—'}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{a.creditBalance > 0 ? a.creditBalance.toLocaleString() : '—'}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-4 font-bold">
                        <TableCell colSpan={3}>Totals</TableCell>
                        <TableCell className="text-right font-mono">{(trialBalance.totalDebits || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono">{(trialBalance.totalCredits || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-3 flex justify-end">
                  <Badge variant="outline" className={trialBalance.balanced ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}>
                    {trialBalance.balanced ? 'Balanced ✓' : 'Not Balanced ✗'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {!incomeStatement && !balanceSheet && !cashFlowReport && !trialBalance && (
            <Card className="border shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a date range and click Generate to view reports</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          AGING TAB
          ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'aging' && (
        <div className="space-y-6">
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('excel')}>
              <Download className="h-3.5 w-3.5" /> Excel
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('pdf')}>
              <FileText className="h-3.5 w-3.5" /> PDF
            </Button>
          </div>
          {/* AR Aging */}
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Accounts Receivable Aging</CardTitle>
              <CardDescription>Outstanding invoices by age bucket</CardDescription>
            </CardHeader>
            <CardContent>
              {arAging ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { label: 'Current', value: arAging.summary?.current, color: 'text-green-700 bg-green-50' },
                      { label: '1-30 Days', value: arAging.summary?.days30, color: 'text-yellow-700 bg-yellow-50' },
                      { label: '31-60 Days', value: arAging.summary?.days60, color: 'text-orange-700 bg-orange-50' },
                      { label: '61-90 Days', value: arAging.summary?.days90, color: 'text-red-600 bg-red-50' },
                      { label: '90+ Days', value: arAging.summary?.over90, color: 'text-red-800 bg-red-100' },
                    ].map(b => (
                      <div key={b.label} className={`p-3 rounded-lg ${b.color}`}>
                        <div className="text-xs font-medium">{b.label}</div>
                        <div className="text-lg font-bold font-mono">KES {(b.value || 0).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-sm font-medium">Total Outstanding: <span className="font-mono">KES {(arAging.total || 0).toLocaleString()}</span></div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Days Overdue</TableHead>
                        <TableHead>Bucket</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {arAging.details?.slice(0, 20).map((d: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{d.invoiceNumber}</TableCell>
                          <TableCell className="text-sm">{d.clientName}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{d.amount?.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-sm font-medium text-orange-600">{d.outstanding?.toLocaleString()}</TableCell>
                          <TableCell className="text-xs">{new Date(d.dueDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-xs">{d.daysOverdue > 0 ? `${d.daysOverdue}d` : '—'}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{d.bucket}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">Loading AR aging data...</div>
              )}
            </CardContent>
          </Card>

          {/* AP Aging */}
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Accounts Payable Aging</CardTitle>
              <CardDescription>Outstanding expenses by age bucket</CardDescription>
            </CardHeader>
            <CardContent>
              {apAging ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { label: 'Current', value: apAging.summary?.current, color: 'text-green-700 bg-green-50' },
                      { label: '1-30 Days', value: apAging.summary?.days30, color: 'text-yellow-700 bg-yellow-50' },
                      { label: '31-60 Days', value: apAging.summary?.days60, color: 'text-orange-700 bg-orange-50' },
                      { label: '61-90 Days', value: apAging.summary?.days90, color: 'text-red-600 bg-red-50' },
                      { label: '90+ Days', value: apAging.summary?.over90, color: 'text-red-800 bg-red-100' },
                    ].map(b => (
                      <div key={b.label} className={`p-3 rounded-lg ${b.color}`}>
                        <div className="text-xs font-medium">{b.label}</div>
                        <div className="text-lg font-bold font-mono">KES {(b.value || 0).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-sm font-medium">Total Payable: <span className="font-mono">KES {(apAging.total || 0).toLocaleString()}</span></div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Expense ID</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Days Overdue</TableHead>
                        <TableHead>Bucket</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apAging.details?.slice(0, 20).map((d: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{d.expenseId}</TableCell>
                          <TableCell className="text-sm">{d.vendor || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">{d.description}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{d.amount?.toLocaleString()}</TableCell>
                          <TableCell className="text-xs">{d.dueDate ? new Date(d.dueDate).toLocaleDateString() : '—'}</TableCell>
                          <TableCell className="text-xs">{d.daysOverdue > 0 ? `${d.daysOverdue}d` : '—'}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{d.bucket}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">Loading AP aging data...</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TAX TAB
          ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'tax' && (
        <div className="space-y-6">
          {/* Tax Summary */}
          {taxSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border shadow-sm">
                <CardContent className="pt-4 pb-3">
                  <div className="text-xs text-muted-foreground">Output VAT (Sales)</div>
                  <div className="text-xl font-bold font-mono text-orange-600">KES {(taxSummary.outputVAT || 0).toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">{taxSummary.invoiceCount} invoices</div>
                </CardContent>
              </Card>
              <Card className="border shadow-sm">
                <CardContent className="pt-4 pb-3">
                  <div className="text-xs text-muted-foreground">Input VAT (Purchases)</div>
                  <div className="text-xl font-bold font-mono text-blue-600">KES {(taxSummary.inputVAT || 0).toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">{taxSummary.expenseCount} expenses</div>
                </CardContent>
              </Card>
              <Card className="border shadow-sm">
                <CardContent className="pt-4 pb-3">
                  <div className="text-xs text-muted-foreground">Net VAT Payable</div>
                  <div className={`text-xl font-bold font-mono ${(taxSummary.netVAT || 0) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    KES {(taxSummary.netVAT || 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Rate: {taxSummary.vatRate}%</div>
                </CardContent>
              </Card>
              <Card className="border shadow-sm">
                <CardContent className="pt-4 pb-3">
                  <div className="text-xs text-muted-foreground">Period</div>
                  <div className="text-sm font-medium mt-1">{reportPeriod.startDate}</div>
                  <div className="text-sm font-medium">to {reportPeriod.endDate}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tax Rates */}
          <Card className="border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Tax Rates</CardTitle>
                  <CardDescription>Configured tax rates</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('excel')}>
                    <Download className="h-3.5 w-3.5" /> Excel
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('pdf')}>
                    <FileText className="h-3.5 w-3.5" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={fetchTax} className="gap-1">
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Rate (%)</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead className="w-20">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxRates.length > 0 ? taxRates.map((tr: any) => (
                    <TableRow key={tr._id}>
                      <TableCell className="text-sm font-medium">{tr.name}</TableCell>
                      <TableCell className="font-mono text-xs">{tr.code}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] capitalize">{tr.type}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-sm">{tr.rate}%</TableCell>
                      <TableCell>{tr.isDefault ? <CheckCircle className="h-4 w-4 text-green-500" /> : '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${tr.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                          {tr.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Delete"
                            onClick={async () => {
                              if (!confirm('Delete this tax rate?')) return;
                              const res = await apiFetch(`/api/v1/accounting/tax/rates/${tr._id}`, { method: 'DELETE' });
                              if (res.ok) { toast({ title: 'Deleted', description: 'Tax rate removed' }); fetchTax(); }
                            }}>
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                        No tax rates configured
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          AUDIT TRAIL TAB
          ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'audit' && (
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Audit Trail</CardTitle>
                <CardDescription>Record of all accounting changes</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('excel')}>
                  <Download className="h-3.5 w-3.5" /> Excel
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('pdf')}>
                  <FileText className="h-3.5 w-3.5" /> PDF
                </Button>
                <Button size="sm" variant="outline" onClick={fetchAudit} className="gap-1">
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.length > 0 ? auditLogs.map((log: any) => (
                    <TableRow key={log._id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">{log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{log.entityType}</TableCell>
                      <TableCell className="font-mono text-xs">{log.entityRef || '—'}</TableCell>
                      <TableCell className="text-sm">{log.userName || (log.userId?.firstName ? `${log.userId.firstName} ${log.userId.lastName}` : '—')}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {log.changes ? JSON.stringify(log.changes).slice(0, 80) : '—'}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        No audit logs yet
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
          CASH FORECAST TAB
          ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'forecast' && cashForecast && (
        <div className="space-y-6">
          {/* Warning Banner */}
          {cashForecast.warning && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 dark:bg-red-950 dark:border-red-800">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900 dark:text-red-100">{cashForecast.warning}</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">Review your upcoming expenses and expected income to avoid cash shortfall.</p>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Current Cash</CardTitle>
                <CardDescription className="text-[10px] mt-1">
                  {cashForecast.salesCash ? `POS: ${(cashForecast.salesCash || 0).toLocaleString()}` : ''} {cashForecast.orderCash && cashForecast.salesCash ? '•' : ''} {cashForecast.orderCash ? `Orders: ${(cashForecast.orderCash || 0).toLocaleString()}` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">KES {cashForecast.currentCash?.toLocaleString() || 0}</p>
              </CardContent>
            </Card>
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Expected Income</CardTitle>
                <CardDescription className="text-[10px] mt-1">From unpaid invoices</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">+{cashForecast.expectedIncome?.toLocaleString() || 0}</p>
              </CardContent>
            </Card>
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Expected Expenses</CardTitle>
                <CardDescription className="text-[10px] mt-1">Recurring + pending</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">-{cashForecast.expectedExpenses?.toLocaleString() || 0}</p>
              </CardContent>
            </Card>
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Projected Balance</CardTitle>
                <CardDescription className="text-[10px] mt-1">30-day outlook</CardDescription>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${cashForecast.projectedBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  KES {cashForecast.projectedBalance?.toLocaleString() || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Forecast Chart */}
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">30-Day Cash Flow Forecast</CardTitle>
              <CardDescription>Projected daily cash position</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={cashForecast.dailyForecast || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip formatter={(value: number) => `KES ${value.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} name="Cash Balance" dot={false} />
                  <Line type="monotone" dataKey="inflow" stroke="#10b981" strokeWidth={1} strokeDasharray="5 5" name="Daily Inflow" dot={false} />
                  <Line type="monotone" dataKey="outflow" stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" name="Daily Outflow" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Upcoming Recurring Expenses */}
          {cashForecast.recurringExpenses?.length > 0 && (
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Upcoming Recurring Expenses</CardTitle>
                <CardDescription>Scheduled payments in the next 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {cashForecast.recurringExpenses.map((exp: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{exp.name}</p>
                          <p className="text-xs text-muted-foreground">Due: {new Date(exp.dueDate).toLocaleDateString()} • {exp.frequency}</p>
                        </div>
                      </div>
                      <p className="font-semibold">KES {exp.amount?.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          INVENTORY TAB
          ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Stock Overview Cards */}
          {stockOverview?.summary && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">Total Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stockOverview.summary.totalItems}</p>
                </CardContent>
              </Card>
              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">Stock Value (Cost)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">KES {stockOverview.summary.totalValue?.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">Retail Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">KES {stockOverview.summary.totalRetailValue?.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="border shadow-sm bg-yellow-50 dark:bg-yellow-950">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">Low Stock Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-yellow-600">{stockOverview.summary.lowStockCount}</p>
                </CardContent>
              </Card>
              <Card className="border shadow-sm bg-red-50 dark:bg-red-950">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">Out of Stock</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">{stockOverview.summary.outOfStockCount}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* COGS & Profitability */}
          {cogsData && (
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Cost of Goods Sold (COGS) & Profitability</CardTitle>
                <CardDescription>
                  Period: {reportPeriod.startDate} to {reportPeriod.endDate} • Includes completed POS sales & delivered orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 rounded-lg dark:bg-blue-950">
                    <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
                    <p className="text-xl font-bold">KES {cogsData.totalRevenue?.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground mt-2">From POS + Orders</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg dark:bg-red-950">
                    <p className="text-xs text-muted-foreground mb-1">Total COGS</p>
                    <p className="text-xl font-bold text-red-600">KES {cogsData.totalCOGS?.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground mt-2">Cost of inventory sold</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg dark:bg-green-950">
                    <p className="text-xs text-muted-foreground mb-1">Gross Profit</p>
                    <p className="text-xl font-bold text-green-600">KES {cogsData.grossProfit?.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground mt-2">Revenue - COGS</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg dark:bg-purple-950">
                    <p className="text-xs text-muted-foreground mb-1">Gross Margin</p>
                    <p className="text-xl font-bold text-purple-600">{cogsData.grossMargin?.toFixed(1)}%</p>
                    <p className="text-[10px] text-muted-foreground mt-2">Profit / Revenue ratio</p>
                  </div>
                </div>

                {/* Top Products by Profit */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Top Products by Profit
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty Sold</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">COGS</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-right">Margin %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cogsData.products && cogsData.products.length > 0 ? (
                        cogsData.products.slice(0, 10).map((p: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell className="text-right">{p.quantity}</TableCell>
                            <TableCell className="text-right">KES {p.revenue?.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-red-600">KES {p.cogs?.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600">KES {p.profit?.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-medium">{p.margin?.toFixed(1)}%</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                            No sales data available for the selected period. Complete a POS sale or deliver an order to see profitability metrics.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Low Stock Alerts */}
          {stockOverview?.lowStockAlerts?.length > 0 && (
            <Card className="border shadow-sm border-yellow-200 dark:border-yellow-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  Low Stock Alerts
                </CardTitle>
                <CardDescription>Items at or below minimum stock level</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Current Stock</TableHead>
                      <TableHead className="text-right">Min Stock</TableHead>
                      <TableHead className="text-right">Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockOverview.lowStockAlerts.map((item: any) => (
                      <TableRow key={item._id}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                        <TableCell className="text-right font-semibold text-yellow-600">{item.currentStock}</TableCell>
                        <TableCell className="text-right">{item.minimumStock}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{item.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          CREATE ACCOUNT DIALOG
          ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
            <DialogDescription>Add an account to the chart of accounts</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Account Code</label>
                <Input placeholder="e.g. 1100" value={accountForm.code} onChange={e => setAccountForm(f => ({ ...f, code: e.target.value }))} required />
              </div>
              <div>
                <label className="text-sm font-medium">Account Name</label>
                <Input placeholder="e.g. Petty Cash" value={accountForm.name} onChange={e => setAccountForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Category</label>
                <select className="w-full h-9 px-3 border rounded-lg text-sm bg-background" value={accountForm.category}
                  onChange={e => {
                    const cat = e.target.value;
                    const nb = ['asset', 'expense'].includes(cat) ? 'debit' : 'credit';
                    setAccountForm(f => ({ ...f, category: cat, normalBalance: nb }));
                  }}>
                  <option value="asset">Asset</option>
                  <option value="liability">Liability</option>
                  <option value="equity">Equity</option>
                  <option value="revenue">Revenue</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Normal Balance</label>
                <select className="w-full h-9 px-3 border rounded-lg text-sm bg-background" value={accountForm.normalBalance}
                  onChange={e => setAccountForm(f => ({ ...f, normalBalance: e.target.value }))}>
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Initial Balance (KES)</label>
              <Input type="number" placeholder="0.00" value={accountForm.balance} onChange={e => setAccountForm(f => ({ ...f, balance: parseFloat(e.target.value) || 0 }))} />
              <p className="text-xs text-muted-foreground mt-1">Opening balance for this account</p>
            </div>
            <div>
              <label className="text-sm font-medium">Subcategory (optional)</label>
              <Input placeholder="e.g. current_asset" value={accountForm.subcategory} onChange={e => setAccountForm(f => ({ ...f, subcategory: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Input placeholder="Account description" value={accountForm.description} onChange={e => setAccountForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" type="button" onClick={() => setAccountDialogOpen(false)} disabled={submittingAccount}>Cancel</Button>
              <Button type="submit" disabled={submittingAccount}>{submittingAccount ? 'Creating...' : 'Create Account'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════
          RECORD PAYMENT DIALOG
          ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Enter the payment amount for this invoice</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Amount (KES)</label>
              <Input type="number" step="0.01" placeholder="0.00" value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)} required />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Record Payment</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
