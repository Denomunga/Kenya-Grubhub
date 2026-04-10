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
import { Upload, RefreshCw, CheckCircle, AlertCircle, History, Eye, Search, Loader2 } from 'lucide-react';

// ============ TYPES ============
interface UnmatchedTransaction {
  transactionId: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
}

interface ReconciliationStatus {
  bankAccountCode: string;
  bookBalance: number;
  lastReconciledBalance: number;
  pendingStatement: {
    statementId: string;
    statementDate: string;
    endingBalance: number;
    matchedCount: number;
    totalCount: number;
  } | null;
  unmatchedTransactions: UnmatchedTransaction[];
  difference: number;
}

interface BankStatement {
  _id: string;
  statementId: string;
  fileName: string;
  statementDate: string;
  bankAccountCode: string;
  startingBalance: number;
  endingBalance: number;
  status: 'pending' | 'matched' | 'reconciled';
  transactions: Array<{
    transactionId: string;
    date: string;
    description: string;
    amount: number;
    type: 'debit' | 'credit';
    isMatched: boolean;
    matchedTo?: {
      entityType: string;
      entityId: string;
      entityRef: string;
      matchConfidence: number;
    };
  }>;
}

interface SearchResult {
  id: string;
  ref: string;
  description: string;
  amount: number;
  date: string;
}

// ============ COMPONENT ============
export default function BankReconciliationTab() {
  const { toast } = useToast();
  const [bankAccountCode, setBankAccountCode] = useState('1000');
  const [status, setStatus] = useState<ReconciliationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<UnmatchedTransaction | null>(null);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [matchEntity, setMatchEntity] = useState({ entityType: 'Invoice', entityId: '', entityRef: '' });
  const [matchSearchLoading, setMatchSearchLoading] = useState(false);
  const [matchSearchResults, setMatchSearchResults] = useState<SearchResult[]>([]);
  const [matchSearchQuery, setMatchSearchQuery] = useState('');
  const [statementId, setStatementId] = useState<string | null>(null);
  const [allStatements, setAllStatements] = useState<BankStatement[]>([]);
  const [statementDetails, setStatementDetails] = useState<BankStatement | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // ============ FETCH FUNCTIONS ============
  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/v1/accounting/reconciliation/status/${bankAccountCode}`);
      const data = await res.json();
      setStatus(data.data);
      setStatementId(data.data?.pendingStatement?.statementId || null);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch reconciliation status', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [bankAccountCode]);

  const fetchAllStatements = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/accounting/reconciliation/statements?limit=50');
      const data = await res.json();
      setAllStatements(data.data);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch statement history', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStatementDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/v1/accounting/reconciliation/statement/${id}`);
      const data = await res.json();
      setStatementDetails(data.data);
      setShowDetails(true);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch statement details', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ============ SEARCH FOR MATCHING ENTITIES ============
  const handleSearchEntities = async () => {
    if (!selectedTxn) return;
    setMatchSearchLoading(true);
    try {
      const params = new URLSearchParams({
        type: matchEntity.entityType,
        amountMin: (selectedTxn.amount * 0.95).toFixed(2),
        amountMax: (selectedTxn.amount * 1.05).toFixed(2),
        dateFrom: new Date(new Date(selectedTxn.date).setDate(new Date(selectedTxn.date).getDate() - 3)).toISOString(),
        dateTo: new Date(new Date(selectedTxn.date).setDate(new Date(selectedTxn.date).getDate() + 3)).toISOString(),
        limit: '20'
      });
      if (matchSearchQuery) params.append('q', matchSearchQuery);

      const res = await apiFetch(`/api/v1/accounting/search/entities?${params}`);
      const data = await res.json();
      setMatchSearchResults(data.data || []);
    } catch (error) {
      toast({ title: 'Search failed', description: 'Could not fetch entities', variant: 'destructive' });
      setMatchSearchResults([]);
    } finally {
      setMatchSearchLoading(false);
    }
  };

  // Auto-search when dialog opens or entity type changes
  useEffect(() => {
    if (matchDialogOpen && selectedTxn) {
      handleSearchEntities();
    } else {
      setMatchSearchResults([]);
      setMatchSearchQuery('');
    }
  }, [matchDialogOpen, matchEntity.entityType, selectedTxn]);

  const selectMatchEntity = (entity: SearchResult) => {
    setMatchEntity({
      ...matchEntity,
      entityId: entity.id,
      entityRef: entity.ref
    });
    setMatchSearchResults([]);
    setMatchSearchQuery('');
  };

  // ============ FILE UPLOAD ============
  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
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
        const error = await res.json();
        throw new Error(error.error || 'Upload failed');
      }
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message || 'Please try again', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1
  });

  // ============ ACTIONS ============
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
      toast({ title: 'Auto-match failed', description: 'Please try again', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleManualMatch = async () => {
    if (!selectedTxn || !statementId) return;
    try {
      const res = await apiFetch(
        `/api/v1/accounting/reconciliation/${statementId}/transactions/${selectedTxn.transactionId}/match`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(matchEntity)
        }
      );
      if (res.ok) {
        toast({ title: 'Matched successfully' });
        setMatchDialogOpen(false);
        setSelectedTxn(null);
        setMatchEntity({ entityType: 'Invoice', entityId: '', entityRef: '' });
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

  const handleFinalize = async () => {
    if (!statementId) return;
    const adjustmentAmount = prompt('Enter adjustment amount if any (leave blank for none):');
    const adjustmentDescription = adjustmentAmount ? prompt('Adjustment description:') : undefined;
    const payload: any = {};
    if (adjustmentAmount) {
      payload.adjustmentAmount = parseFloat(adjustmentAmount);
      payload.adjustmentDescription = adjustmentDescription || 'Reconciliation adjustment';
    }
    try {
      const res = await apiFetch(`/api/v1/accounting/reconciliation/${statementId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast({ title: 'Reconciliation finalized' });
        fetchStatus();
        setStatementId(null);
      } else {
        throw new Error('Finalization failed');
      }
    } catch (error) {
      toast({ title: 'Finalization failed', variant: 'destructive' });
    }
  };

  // ============ RENDER ============
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Bank Reconciliation</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setShowHistory(!showHistory); if (!showHistory) fetchAllStatements(); }}>
            <History className="mr-2 h-4 w-4" /> History
          </Button>
          <Button variant="outline" onClick={fetchStatus} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Bank Account & Upload */}
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
        <div
          {...getRootProps()}
          className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
        >
          <input {...getInputProps()} />
          {uploading ? (
            'Uploading...'
          ) : isDragActive ? (
            'Drop CSV here'
          ) : (
            <>
              Upload Bank Statement (CSV)
              <Upload className="inline ml-2 h-4 w-4" />
            </>
          )}
        </div>
        {statementId && (
          <>
            <Button size="sm" onClick={handleAutoMatch} disabled={loading}>
              <CheckCircle className="mr-1 h-3.5 w-3.5" /> Auto-Match (AI)
            </Button>
            <Button size="sm" variant="outline" onClick={handleAdjustment}>
              <AlertCircle className="mr-1 h-3.5 w-3.5" /> Create Adjustment
            </Button>
            <Button size="sm" variant="default" onClick={handleFinalize}>
              Finalize
            </Button>
          </>
        )}
      </div>

      {/* Summary Cards */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Book Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KES {status.bookBalance?.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Last Reconciled Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KES {status.lastReconciledBalance?.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Difference</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${status.difference !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                KES {status.difference?.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending Statement */}
      {status?.pendingStatement && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Statement: {status.pendingStatement.statementId}</CardTitle>
            <div className="text-sm text-muted-foreground">
              Statement Ending Balance: <strong>KES {status.pendingStatement.endingBalance?.toLocaleString()}</strong>{' '}
              &nbsp;|&nbsp; Matched: {status.pendingStatement.matchedCount} / {status.pendingStatement.totalCount}
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
                {status.unmatchedTransactions?.map((txn) => (
                  <TableRow key={txn.transactionId}>
                    <TableCell>{new Date(txn.date).toLocaleDateString()}</TableCell>
                    <TableCell>{txn.description}</TableCell>
                    <TableCell
                      className={`text-right font-mono ${txn.type === 'debit' ? 'text-red-600' : 'text-green-600'}`}
                    >
                      {txn.type === 'debit' ? `-${txn.amount.toLocaleString()}` : `+${txn.amount.toLocaleString()}`}
                    </TableCell>
                    <TableCell className="capitalize">{txn.type}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-yellow-100">Unmatched</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedTxn(txn);
                          setMatchEntity({ entityType: 'Invoice', entityId: '', entityRef: '' });
                          setMatchDialogOpen(true);
                        }}
                      >
                        Match Manually
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!status.unmatchedTransactions || status.unmatchedTransactions.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      All transactions matched ✓
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Statement History */}
      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statement History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Statement ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Bank Account</TableHead>
                  <TableHead>Ending Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allStatements.map((stmt) => (
                  <TableRow key={stmt.statementId}>
                    <TableCell>{stmt.statementId}</TableCell>
                    <TableCell>{new Date(stmt.statementDate).toLocaleDateString()}</TableCell>
                    <TableCell>{stmt.bankAccountCode}</TableCell>
                    <TableCell>KES {stmt.endingBalance?.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={stmt.status === 'reconciled' ? 'default' : 'outline'}>{stmt.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => fetchStatementDetails(stmt.statementId)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {allStatements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No statements found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Manual Match Dialog */}
      <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Match Bank Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm font-medium">Transaction Details</p>
              <p className="text-sm">Description: <strong>{selectedTxn?.description}</strong></p>
              <p className="text-sm">Amount: <strong>KES {selectedTxn?.amount?.toLocaleString()}</strong> ({selectedTxn?.type})</p>
              <p className="text-sm">Date: <strong>{selectedTxn?.date ? new Date(selectedTxn.date).toLocaleDateString() : ''}</strong></p>
            </div>

            <div>
              <label className="text-sm font-medium">Entity Type</label>
              <select
                className="w-full border rounded-md p-2 text-sm mt-1"
                value={matchEntity.entityType}
                onChange={(e) => setMatchEntity({ ...matchEntity, entityType: e.target.value, entityId: '', entityRef: '' })}
              >
                <option value="Invoice">Invoice</option>
                <option value="Expense">Expense</option>
                <option value="Payment">Payment</option>
                <option value="JournalEntry">Journal Entry</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Search {matchEntity.entityType}s</label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder={`Search by reference or description...`}
                  value={matchSearchQuery}
                  onChange={(e) => setMatchSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchEntities()}
                />
                <Button variant="outline" onClick={handleSearchEntities} disabled={matchSearchLoading}>
                  {matchSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {matchSearchResults.length > 0 && (
              <div className="border rounded-md max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchSearchResults.map((entity) => (
                      <TableRow
                        key={entity.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => selectMatchEntity(entity)}
                      >
                        <TableCell className="font-medium">{entity.ref}</TableCell>
                        <TableCell>{entity.description}</TableCell>
                        <TableCell>KES {entity.amount.toLocaleString()}</TableCell>
                        <TableCell>{new Date(entity.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost">Select</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Selected Entity Reference</label>
              <Input
                placeholder="Selected entity reference will appear here"
                value={matchEntity.entityRef}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setMatchDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleManualMatch} disabled={!matchEntity.entityRef}>Match</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Statement Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Statement Details: {statementDetails?.statementId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p><strong>File:</strong> {statementDetails?.fileName}</p>
            <p><strong>Starting Balance:</strong> KES {statementDetails?.startingBalance?.toLocaleString()}</p>
            <p><strong>Ending Balance:</strong> KES {statementDetails?.endingBalance?.toLocaleString()}</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Matched To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statementDetails?.transactions?.map((tx) => (
                  <TableRow key={tx.transactionId}>
                    <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                    <TableCell>{tx.description}</TableCell>
                    <TableCell>KES {tx.amount}</TableCell>
                    <TableCell>
                      {tx.isMatched ? `${tx.matchedTo?.entityType} ${tx.matchedTo?.entityRef}` : 'Unmatched'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}