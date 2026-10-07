'use client';

import { CheckCircle2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { payAction } from '@/app/scan/actions';
import { FormError } from '@/components/auth/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatLkr } from '@/lib/format';

// "Pay" after a safe scan. A fake payment: no real money moves.
export function DemoPay({ merchantId, shopName }: { merchantId: string; shopName: string }) {
  const [amount, setAmount] = useState('500');
  const [paid, setPaid] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function pay(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isInteger(value) || value < 10 || value > 100000) {
      setError('Enter a whole amount between LKR 10 and LKR 100,000.');
      return;
    }
    startTransition(async () => {
      const res = await payAction(merchantId, value);
      if (res.ok) {
        setPaid(value);
        setError(undefined);
      } else {
        setError(res.error);
      }
    });
  }

  if (paid !== null) {
    return (
      <p className="flex items-center gap-2 rounded-xl border p-4 text-sm" role="status">
        <CheckCircle2 className="size-5 text-safe" aria-hidden />
        Paid {formatLkr(paid)} to {shopName}. (Demo payment - no real money.)
      </p>
    );
  }

  return (
    <form onSubmit={pay} className="grid gap-2 rounded-xl border p-4">
      <label htmlFor="amount" className="text-sm font-medium">
        Pay this shop (demo)
      </label>
      <FormError message={error} />
      <div className="flex gap-2">
        <Input
          id="amount"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-describedby="amount-hint"
        />
        <Button type="submit" disabled={pending}>
          {pending ? 'Paying…' : 'Pay'}
        </Button>
      </div>
      <p id="amount-hint" className="text-xs text-muted-foreground">
        LKR, whole rupees. This is a fake payment for the demo.
      </p>
    </form>
  );
}
