import React from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function ConfirmPassword() {
  const [, setLocation] = useLocation();
  const { confirmPasswordReset } = useAuth();
  const { toast } = useToast();

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  const [newPassword, setNewPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({ title: 'Invalid link', description: 'No confirmation token provided', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirm) {
      toast({ title: 'Password mismatch', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    const strong = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}/;
    if (!strong.test(newPassword)) {
      toast({ title: 'Weak password', description: 'Use at least 12 chars, including upper/lower/number/symbol.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const ok = await confirmPasswordReset(token, newPassword);
    setSubmitting(false);
    if (ok) {
      setLocation('/login');
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <h2 className="text-2xl font-bold mb-4">Set a new password</h2>
      <p className="text-sm text-muted-foreground mb-4">Provide a strong new password to finish the change.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-md border px-3 py-2" required />
        <input type="password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-md border px-3 py-2" required />
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={submitting}>{submitting ? 'Setting…' : 'Set new password'}</Button>
          <Button variant="outline" onClick={() => setLocation('/')}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
