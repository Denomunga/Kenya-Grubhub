import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';
import { useHybridAuth } from '@/lib/hybrid-auth';
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface LeaveBalance {
  entitlements: {
    annualLeave: number;
    sickLeave: number;
    maternityLeave: number;
    paternityLeave: number;
    compassionateLeave: number;
  };
  used: Record<string, number>;
  remaining: Record<string, number>;
}

interface LeaveRequest {
  _id: string;
  leaveId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  doctorLetterUrl?: string;
  status: string;
  reviewedBy?: { firstName: string; lastName: string };
  reviewNotes?: string;
  createdAt: string;
}

const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual Leave', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'sick', label: 'Sick Leave', color: 'text-red-600 bg-red-50 border-red-200' },
  { value: 'maternity', label: 'Maternity Leave', color: 'text-pink-600 bg-pink-50 border-pink-200' },
  { value: 'paternity', label: 'Paternity Leave', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { value: 'compassionate', label: 'Compassionate Leave', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'unpaid', label: 'Unpaid Leave', color: 'text-gray-600 bg-gray-50 border-gray-200' },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending': return 'text-amber-700 bg-amber-50 border-amber-200';
    case 'approved': return 'text-green-700 bg-green-50 border-green-200';
    case 'rejected': return 'text-red-700 bg-red-50 border-red-200';
    case 'cancelled': return 'text-gray-700 bg-gray-50 border-gray-200';
    default: return '';
  }
};

export default function LeavePage() {
  const { toast } = useToast();
  const { user } = useHybridAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
    doctorLetterUrl: '',
  });
  const [doctorFileName, setDoctorFileName] = useState('');

  const fetchData = async () => {
    try {
      const [leavesRes, balanceRes] = await Promise.all([
        apiFetch('/api/v1/hr/leaves/my'),
        apiFetch('/api/v1/hr/leaves/my/balance'),
      ]);

      if (leavesRes.ok) {
        const data = await leavesRes.json();
        setLeaves(data.data || []);
      }
      if (balanceRes.ok) {
        const data = await balanceRes.json();
        setBalance(data.data || null);
      }
    } catch (error) {
      console.error('Failed to fetch leave data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUploadDoctorLetter = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('doctorLetter', file);

      const res = await apiFetch('/api/v1/hr/leaves/upload-doctor-letter', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setForm(prev => ({ ...prev, doctorLetterUrl: data.data.url }));
        setDoctorFileName(data.data.filename || file.name);
        toast({ title: 'Uploaded', description: 'Doctor letter uploaded successfully' });
      } else {
        toast({ title: 'Error', description: 'Failed to upload doctor letter', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to upload file', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.leaveType === 'sick' && !form.doctorLetterUrl) {
      toast({ title: 'Required', description: 'Please upload a doctor letter for sick leave', variant: 'destructive' });
      return;
    }

    try {
      const res = await apiFetch('/api/v1/hr/leaves/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast({ title: 'Submitted', description: 'Leave application submitted successfully' });
        setApplyOpen(false);
        setForm({ leaveType: 'annual', startDate: '', endDate: '', reason: '', doctorLetterUrl: '' });
        setDoctorFileName('');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Error', description: err.error || 'Failed to apply for leave', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to apply for leave', variant: 'destructive' });
    }
  };

  const handleCancelLeave = async (leave: LeaveRequest) => {
    try {
      const res = await apiFetch(`/api/v1/hr/leaves/${leave._id}/cancel`, { method: 'POST' });
      if (res.ok) {
        toast({ title: 'Cancelled', description: 'Leave request cancelled' });
        fetchData();
      } else {
        toast({ title: 'Error', description: 'Failed to cancel leave', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to cancel leave', variant: 'destructive' });
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <h2 className="text-lg font-semibold mb-2">Login Required</h2>
            <p className="text-muted-foreground">Please log in to access leave management.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leave Management</h1>
          <p className="text-muted-foreground text-sm">Apply and track your leave requests</p>
        </div>
        <Button className="gap-2" onClick={() => setApplyOpen(true)}>
          <Plus className="h-4 w-4" /> Apply for Leave
        </Button>
      </div>

      {/* Leave Balance Cards */}
      {balance && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Annual', total: balance.entitlements.annualLeave, used: balance.used.annual, remaining: balance.remaining.annual, icon: Calendar, color: 'text-blue-600' },
            { label: 'Sick', total: balance.entitlements.sickLeave, used: balance.used.sick, remaining: balance.remaining.sick, icon: AlertTriangle, color: 'text-red-600' },
            { label: 'Maternity', total: balance.entitlements.maternityLeave, used: balance.used.maternity, remaining: balance.remaining.maternity, icon: Clock, color: 'text-pink-600' },
            { label: 'Paternity', total: balance.entitlements.paternityLeave, used: balance.used.paternity, remaining: balance.remaining.paternity, icon: Clock, color: 'text-purple-600' },
            { label: 'Compassionate', total: balance.entitlements.compassionateLeave, used: balance.used.compassionate, remaining: balance.remaining.compassionate, icon: Clock, color: 'text-amber-600' },
          ].map(item => (
            <Card key={item.label} className="border shadow-sm">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-2">
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
                <div className="text-2xl font-bold">{item.remaining}</div>
                <div className="text-[10px] text-muted-foreground">
                  {item.used} used of {item.total} days
                </div>
                <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.remaining <= 0 ? 'bg-red-500' : item.remaining <= 3 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.max(0, Math.min(100, (item.remaining / item.total) * 100))}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Leave History */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Leave History</CardTitle>
          <CardDescription>Your leave requests and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="text-center">Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.length > 0 ? (
                  leaves.map(leave => {
                    const typeInfo = LEAVE_TYPES.find(t => t.value === leave.leaveType);
                    return (
                      <TableRow key={leave._id}>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${typeInfo?.color || ''}`}>
                            {typeInfo?.label || leave.leaveType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {new Date(leave.startDate).toLocaleDateString()} — {new Date(leave.endDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-center font-medium">{leave.totalDays}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{leave.reason}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${getStatusBadge(leave.status)}`}>
                            {leave.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                            {leave.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {leave.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                            {leave.status}
                          </Badge>
                          {leave.reviewedBy && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              by {leave.reviewedBy.firstName} {leave.reviewedBy.lastName}
                            </p>
                          )}
                          {leave.reviewNotes && (
                            <p className="text-[10px] text-muted-foreground italic">{leave.reviewNotes}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {leave.doctorLetterUrl && (
                              <a href={leave.doctorLetterUrl} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View Doctor Letter">
                                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                                </Button>
                              </a>
                            )}
                            {leave.status === 'pending' && (
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-red-600" onClick={() => handleCancelLeave(leave)}>
                                Cancel
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No leave requests yet. Click "Apply for Leave" to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Apply for Leave Dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
            <DialogDescription>Submit a new leave request for approval</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleApplyLeave}>
            <div>
              <label className="text-sm font-medium">Leave Type</label>
              <select
                className="w-full h-9 px-3 border rounded-lg text-sm bg-background text-foreground"
                value={form.leaveType}
                onChange={(e) => {
                  setForm({ ...form, leaveType: e.target.value, doctorLetterUrl: '' });
                  setDoctorFileName('');
                }}
                required
              >
                {LEAVE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {balance && form.leaveType !== 'unpaid' && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Remaining: {balance.remaining[form.leaveType] ?? '—'} days
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  min={form.startDate}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Reason</label>
              <textarea
                className="w-full h-20 px-3 py-2 border rounded-lg text-sm bg-background text-foreground"
                placeholder="Describe the reason for your leave request..."
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                required
              />
            </div>

            {/* Doctor Letter Upload - shown for sick leave */}
            {form.leaveType === 'sick' && (
              <div>
                <label className="text-sm font-medium flex items-center gap-1">
                  Doctor's Letter <span className="text-red-500">*</span>
                </label>
                <p className="text-[10px] text-muted-foreground mb-2">Upload a doctor's letter as PDF or image (required for sick leave)</p>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  {form.doctorLetterUrl ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-green-700 font-medium">{doctorFileName}</span>
                      <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] text-red-600" onClick={() => { setForm({ ...form, doctorLetterUrl: '' }); setDoctorFileName(''); }}>
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        {uploading ? 'Uploading...' : 'Click to upload PDF or image'}
                      </p>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={handleUploadDoctorLetter}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setApplyOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.leaveType === 'sick' && !form.doctorLetterUrl}>
                Submit Application
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
