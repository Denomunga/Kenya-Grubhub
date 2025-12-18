import React from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function ConfirmPhone() {
  const [, setLocation] = useLocation();
  const { confirmPhoneChange } = useAuth();
  const { toast } = useToast();

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({ title: 'Invalid link', description: 'No confirmation token provided', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const ok = await confirmPhoneChange(token);
    setSubmitting(false);
    if (ok) {
      setLocation('/profile');
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <h2 className="text-2xl font-bold mb-4">Confirm phone number change</h2>
      <p className="text-sm text-muted-foreground mb-4">Click the button below to confirm your new phone number.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Button type="submit" className="flex-1" disabled={submitting}>{submitting ? 'Confirming…' : 'Confirm Phone Change'}</Button>
        </div>
        <div>
          <Button variant="outline" onClick={() => setLocation('/')}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
