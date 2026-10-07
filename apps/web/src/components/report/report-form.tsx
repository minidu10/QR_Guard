'use client';

import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useActionState } from 'react';
import { reportAction, type ReportState } from '@/app/report/actions';
import { FormError } from '@/components/auth/field';
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export function ReportForm({ scanId }: { scanId?: string }) {
  const [state, action, pending] = useActionState<ReportState, FormData>(reportAction, {});

  if (state.done) {
    return (
      <div className="grid gap-4 text-center" role="status">
        <CheckCircle2 className="mx-auto size-12 text-safe" aria-hidden />
        <p className="text-lg font-semibold">Thank you. Your report was sent.</p>
        <p className="text-muted-foreground">
          The bank team and the shop owner have been told. Do not pay with that QR code.
        </p>
        <Link href="/scan" className={buttonVariants({ size: 'lg' })}>
          Check another QR code
        </Link>
      </div>
    );
  }

  const error = state.fieldErrors?.description;
  return (
    <form action={action} className="grid gap-4">
      <FormError message={state.error} />
      {scanId && <input type="hidden" name="scanId" value={scanId} />}
      <div className="grid gap-2">
        <Label htmlFor="description">What did you see?</Label>
        <textarea
          id="description"
          name="description"
          rows={5}
          maxLength={500}
          defaultValue={state.values?.description}
          placeholder="For example: the QR sticker looks new and is stuck over the old one."
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'description-error' : undefined}
          className="rounded-md border bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-danger md:text-sm"
        />
        {error && (
          <p id="description-error" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Sending…' : 'Send report'}
      </Button>
    </form>
  );
}
