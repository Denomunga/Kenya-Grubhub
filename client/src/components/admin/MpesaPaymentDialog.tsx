import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { formatPriceKSHS } from '@/lib/format';

interface MpesaPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  saleId: string;
  onPaymentConfirmed: () => void;
}

export default function MpesaPaymentDialog({ 
  open, 
  onClose, 
  amount, 
  saleId,
  onPaymentConfirmed 
}: MpesaPaymentDialogProps) {
  const [status, setStatus] = useState<'waiting' | 'confirmed' | 'timeout' | 'error'>('waiting');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  // Use the status and timeLeft props to avoid unused warnings
  useEffect(() => {
    if (status !== 'waiting') return;
    setTimeLeft(Math.max(0, timeLeft));
  }, [timeLeft]);

  useEffect(() => {
    if (!open || status !== 'waiting') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, status]);

  useEffect(() => {
    if (!open) return;

    // Poll for payment status every 5 seconds
    const pollInterval = setInterval(async () => {
      if (status !== 'waiting') return;
      
      try {
        const response = await fetch(`/api/mpesa/status/${saleId}`);
        const data = await response.json();
        
        if (data.status === 'not_found') {
          // Still waiting
          return;
        }
        
        if (data.status === 'waiting') {
          // Update time left from server
          setTimeLeft(data.timeLeft || timeLeft);
          return;
        }
        
        if (data.status === 'completed') {
          setStatus('confirmed');
          onPaymentConfirmed();
          setTimeout(() => onClose(), 2000);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [open, status, saleId, onPaymentConfirmed, onClose, timeLeft]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    switch (status) {
      case 'waiting': return 'bg-yellow-500';
      case 'confirmed': return 'bg-green-500';
      case 'timeout': return 'bg-red-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'waiting': return <Clock className="w-8 h-8" />;
      case 'confirmed': return <CheckCircle className="w-8 h-8" />;
      case 'timeout': return <XCircle className="w-8 h-8" />;
      case 'error': return <XCircle className="w-8 h-8" />;
      default: return <Clock className="w-8 h-8" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'waiting': return 'Waiting for M-Pesa Payment...';
      case 'confirmed': return 'Payment Confirmed!';
      case 'timeout': return 'Payment Timeout';
      case 'error': return 'Payment Error';
      default: return 'Checking Payment...';
    }
  };

  const handleRetry = () => {
    setStatus('waiting');
    setTimeLeft(300);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">M-Pesa Payment</DialogTitle>
        </DialogHeader>
        
        <div className="text-center space-y-6">
          {/* Amount Display */}
          <div className="bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-900 mb-1">Amount to Pay</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatPriceKSHS(amount)}
            </p>
          </div>

          {/* Status */}
          <div className={`inline-flex items-center gap-3 px-4 py-3 rounded-full ${getStatusColor()} text-black`}>
            {getStatusIcon()}
            <span className="font-medium">{getStatusText()}</span>
          </div>

          {/* Timer */}
          {status === 'waiting' && (
            <div className="space-y-2">
              <p className="text-sm text-black">Time remaining</p>
              <div className="text-2xl font-mono font-bold text-gray-900">
                {formatTime(timeLeft)}
              </div>
              <p className="text-xs text-gray-500">
                Please make payment to your M-Pesa business number
              </p>
            </div>
          )}

          {/* Instructions */}
          {status === 'waiting' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <h4 className="font-medium text-blue-900 mb-2">Payment Instructions:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Go to M-Pesa menu on your phone</li>
                <li>Select "Send Money" or "Lipa na M-Pesa"</li>
                <li>Enter your business M-Pesa number</li>
                <li>Enter amount: {formatPriceKSHS(amount)}</li>
                <li>Enter your M-Pesa PIN</li>
                <li>Confirm payment</li>
              </ol>
            </div>
          )}

          {/* Success Message */}
          {status === 'confirmed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">
                Payment received successfully! Receipt will be generated automatically.
              </p>
            </div>
          )}

          {/* Error Message */}
          {(status === 'timeout' || status === 'error') && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium mb-3">
                {status === 'timeout' 
                  ? 'Payment was not received within the time limit.'
                  : 'There was an error processing your payment.'
                }
              </p>
              <Button onClick={handleRetry} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            {status === 'waiting' && (
              <Button 
                variant="outline" 
                onClick={onClose}
              >
                Cancel
              </Button>
            )}
            
            {status === 'confirmed' && (
              <Button onClick={onClose}>
                Continue
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
