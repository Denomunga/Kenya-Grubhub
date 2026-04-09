import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';
import { Upload, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface UnmatchedTransaction {
  transactionId: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
}

export default function BankReconciliationTab() {
  const { toast } = useToast();
  const [bankAccountCode, setBankAccountCode] = useState('1000');
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<UnmatchedTransaction | null>(null);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [matchEntity, setMatchEntity] = useState({ entityType: 'Invoice', entityId: '', entityRef: '' });
  const [statementId, setStatementId] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/v1/accounting/reconciliation/status/${bankAccountCode}`);
      const data = await res.json();
      setStatus(data.data);
      if (data.data?.pendingStatement) setStatementId(data.data.pendingStatement.statementId);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch reconciliation status', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [bankAccountCode]);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('statement', file);
    formData.append('bankAccountCode', bankAccountCode);
    setUploading(true);
    try {
      const res = await apiFetch('/api/v1/accounting/reconciliation/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        toast({ title: 'Upload successful', description: 'Statement processed. AI matching in progress.' });
        fetchStatus();
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      toast({ title: 'Upload failed', description: 'Please try again', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'] } });

  const handleAutoMatch = async () => {
    if (!statementId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/v1/accounting/reconciliation/${statementId}/auto-match`, { method: 'POST' });
      if (res.ok) {
        toast({ title: 'Auto-match completed', description: 'Matched transactions updated.' });
        fetchStatus();
      } else {
        throw new Error('Auto-match failed');
      }
    } catch (error) {
      toast({ title: 'Auto-match failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleManualMatch = async () => {
    if (!selectedTxn || !statementId) return;
    try {
      const res = await apiFetch(`/api/v1/accounting/reconciliation/${statementId}/transactions/${selectedTxn.transactionId}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchEntity)
      });
      if (res.ok) {
        toast({ title: 'Matched successfully' });
        setMatchDialogOpen(false);
        fetchStatus();
      } else {
        throw new Error('Match failed');
      }
    } catch (error) {
      toast({ title: 'Match failed', variant: 'destructive' });
    }
  };

  const handleAdjustment = async () => {
    if (!statementId) return;
    const amount = prompt('Enter adjustment amount (positive or negative):');
    if (!amount) return;
    const description = prompt('Adjustment description:');
    if (!description) return;
    try {
      const res = await apiFetch(`/api/v1/accounting/reconciliation/${statementId}/adjustment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount), description })
      });
      if (res.ok) {
        toast({ title: 'Adjustment created', description: 'Journal entry posted.' });
        fetchStatus();
      } else {
        throw new Error('Adjustment failed');
      }
    } catch (error) {
      toast({ title: 'Adjustment failed', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Bank Reconciliation</h3>
        <Button variant="outline" onClick={fetchStatus} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Bank Account Selector & Upload */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-sm font-medium">Bank Account</label>
          <select
            value={bankAccountCode}
            onChange={(e) => setBankAccountCode(e.target.value)}
            className="border rounded-md p-2 text-sm bg-background"
          >
            <option value="1000">Cash (1000)</option>
            <option value="1010">Bank - M-Pesa (1010)</option>
            <option value="1020">Bank - Equity (1020)</option>
          </select>
        </div>
        <div {...getRootProps()} className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
          <input {...getInputProps()} />
          {uploading ? 'Uploading...' : isDragActive ? 'Drop CSV here' : 'Upload Bank Statement (CSV)'}
          <Upload className="inline ml-2 h-4 w-4" />
        </div>
        {statementId && (
          <>
            <Button size="sm" onClick={handleAutoMatch} disabled={loading}>
              <CheckCircle className="mr-1 h-3.5 w-3.5" /> Auto-Match (AI)
            </Button>
            <Button size="sm" variant="outline" onClick={handleAdjustment}>
              <AlertCircle className="mr-1 h-3.5 w-3.5" /> Create Adjustment
            </Button>
          </>
        )}
      </div>

      {/* Reconciliation Summary Cards */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Book Balance</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KES {status.bookBalance?.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Last Reconciled Balance</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KES {status.lastReconciledBalance?.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Difference</CardTitle></CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${status.difference !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                KES {status.difference?.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending Statement Details */}
      {status?.pendingStatement && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Statement: {status.pendingStatement.statementId}</CardTitle>
            <div className="text-sm text-muted-foreground">
              Statement Ending Balance: <strong>KES {status.pendingStatement.endingBalance?.toLocaleString()}</strong> &nbsp;|&nbsp;
              Matched: {status.pendingStatement.matchedCount} / {status.pendingStatement.totalCount}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount (KES)</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {status.unmatchedTransactions?.map((txn: UnmatchedTransaction) => (
                  <TableRow key={txn.transactionId}>
                    <TableCell>{new Date(txn.date).toLocaleDateString()}</TableCell>
                    <TableCell>{txn.description}</TableCell>
                    <TableCell className={`text-right font-mono ${txn.type === 'debit' ? 'text-red-600' : 'text-green-600'}`}>
                      {txn.type === 'debit' ? `-${txn.amount.toLocaleString()}` : `+${txn.amount.toLocaleString()}`}
                    </TableCell>
                    <TableCell className="capitalize">{txn.type}</TableCell>
                    <TableCell><Badge variant="outline" className="bg-yellow-100">Unmatched</Badge></TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedTxn(txn); setMatchDialogOpen(true); }}>
                        Match Manually
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!status.unmatchedTransactions || status.unmatchedTransactions.length === 0) && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">All transactions matched ✓</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Manual Match Dialog */}
      <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Match Bank Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">Transaction: <strong>{selectedTxn?.description}</strong> – KES {selectedTxn?.amount}</p>
            <div>
              <label className="text-sm font-medium">Entity Type</label>
              <select
                className="w-full border rounded-md p-2 text-sm mt-1"
                value={matchEntity.entityType}
                onChange={(e) => setMatchEntity({ ...matchEntity, entityType: e.target.value })}
              >
                <option value="Invoice">Invoice</option>
                <option value="Expense">Expense</option>
                <option value="Payment">Payment</option>
                <option value="JournalEntry">Journal Entry</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Entity Reference (ID or Number)</label>
              <Input
                placeholder="e.g. INV-001 or expense ID"
                value={matchEntity.entityRef}
                onChange={(e) => setMatchEntity({ ...matchEntity, entityRef: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setMatchDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleManualMatch}>Match</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}