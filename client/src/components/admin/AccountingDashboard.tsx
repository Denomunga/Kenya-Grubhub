import React, { useEffect, useState, useMemo } from 'react';
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
} from 'lucide-react';
import { InsightActionCard, InsightItem } from '@/components/ui/InsightActionCard';
import { useToast } from '@/hooks/use-toast';

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
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'invoices' | 'journal'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [loading, setLoading] = useState(true);
  const [journalDialogOpen, setJournalDialogOpen] = useState(false);
  const [autoJournalSource, setAutoJournalSource] = useState<'orders' | 'procurement' | null>(null);

  useEffect(() => {
    fetchAccountingData();
  }, []);

  const fetchAccountingData = async () => {
    try {
      const [statsRes, transactionsRes, invoicesRes, monthlyRes, cashFlowRes, journalRes] = await Promise.all([
        apiFetch('/api/v1/accounting/stats'),
        apiFetch('/api/v1/accounting/transactions?page=1&limit=50'),
        apiFetch('/api/v1/accounting/invoices?status=unpaid'),
        apiFetch('/api/v1/accounting/monthly?months=12'),
        apiFetch('/api/v1/accounting/cashflow?days=30'),
        apiFetch('/api/v1/accounting/journal-entries?page=1&limit=20'),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data);
      }

      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        setTransactions(data.data?.transactions || data.data || []);
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

  // ─── Computed values ────────────────────────────────────────────────────

  const accountsPayable = useMemo(() => stats?.totalLiabilities ?? 0, [stats]);
  const accountsReceivable = useMemo(() => {
    const unpaid = invoices.filter(i => i.status === 'unpaid' || i.status === 'overdue' || i.status === 'partial');
    return unpaid.reduce((sum, i) => sum + (i.amount - i.paidAmount), 0);
  }, [invoices]);
  const cashBalance = useMemo(() => (stats?.totalAssets ?? 0) - (stats?.totalLiabilities ?? 0), [stats]);

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
    return transactions.filter((txn) => {
      const id = txn.transactionId || txn.transactionNumber || '';
      const matchesSearch =
        id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.category.toLowerCase().includes(searchTerm.toLowerCase());

      if (filterType === 'all') return matchesSearch;
      return matchesSearch && txn.type === filterType;
    });
  }, [transactions, searchTerm, filterType]);

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

  const handleExport = (format: 'pdf' | 'excel') => {
    if (format === 'excel') {
      // Export transactions as CSV (Excel-compatible)
      const headers = ['Date', 'ID', 'Type', 'Account', 'Description', 'Debit', 'Credit', 'Status'];
      const rows = transactions.map(t => {
        const date = new Date(t.transactionDate || t.date).toLocaleDateString();
        const id = t.transactionNumber || t.transactionId;
        const amt = t.totalAmount || t.amount;
        return [
          date, id, t.type || t.transactionType || '', t.accountName || t.category,
          t.description, t.type === 'expense' ? amt : '', t.type === 'income' ? amt : '', t.status
        ].join(',');
      });
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accounting-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Exported', description: 'Transactions exported as Excel/CSV' });
    } else {
      // Trigger PDF export via print
      window.print();
      toast({ title: 'PDF Export', description: 'Print dialog opened — save as PDF' });
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
              {((stats?.totalRevenue ?? 0) / 1000000).toFixed(1)}M
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
              <ArrowUpRight className="h-2.5 w-2.5 text-emerald-500" />
              KES {(stats?.totalRevenue ?? 0).toLocaleString()}
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
              {((stats?.totalExpenses ?? 0) / 1000000).toFixed(1)}M
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
              <ArrowDownRight className="h-2.5 w-2.5 text-red-500" />
              KES {(stats?.totalExpenses ?? 0).toLocaleString()}
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
              {((stats?.profit ?? stats?.netIncome ?? 0) / 1000000).toFixed(1)}M
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
              {(cashBalance / 1000000).toFixed(1)}M
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              KES {cashBalance.toLocaleString()}
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
              {(accountsPayable / 1000).toFixed(0)}K
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
              {(accountsReceivable / 1000).toFixed(0)}K
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
              This will automatically create double-entry journal entries from {autoJournalSource === 'orders' ? 'recent orders (Sales Revenue ↔ Accounts Receivable)' : 'procurement transactions (Inventory ↔ Accounts Payable)'}.
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

      {/* ═══════════════════════════════════════════════════════════════════
          TAB NAVIGATION
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex gap-1 border-b">
        {([
          { key: 'overview', label: 'Overview', icon: Eye },
          { key: 'transactions', label: 'Transactions', icon: CreditCard },
          { key: 'invoices', label: 'Invoices', icon: FileText },
          { key: 'journal', label: 'Journal', icon: BookOpen },
        ] as const).map(tab => (
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
        ))}
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
                <Button size="sm" className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> New
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
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
            </div>
          </CardHeader>
          <CardContent>
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
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((txn) => {
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
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {txn.status === 'pending' && (
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Approve">
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
                <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('excel')}>
                  <Download className="h-3.5 w-3.5" /> Export
                </Button>
                <Button size="sm" className="gap-1">
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
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client / Supplier</TableHead>
                    <TableHead className="text-right">Amount (KES)</TableHead>
                    <TableHead className="text-right">Paid (KES)</TableHead>
                    <TableHead className="text-right">Balance (KES)</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
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
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Record Payment">
                                <DollarSign className="h-3.5 w-3.5" />
                              </Button>
                              {isOverdue && (
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Send Reminder">
                                  <Send className="h-3.5 w-3.5 text-red-500" />
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
    </div>
  );
}
