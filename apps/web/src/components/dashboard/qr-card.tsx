'use client';

import type { QrCodeListItem, Shop } from '@qrguard/types';
import { Download, RefreshCw } from 'lucide-react';
import { useState, useTransition } from 'react';
import { rotateQrAction } from '@/app/dashboard/actions';
import { FormError } from '@/components/auth/field';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// The shop's current QR code, with download and "make a new one".
export function QrCard({ shop, qrCodes }: { shop: Shop; qrCodes: QrCodeListItem[] }) {
  const active = qrCodes.find((q) => q.status === 'active' && q.qrImage);
  const revoked = qrCodes.filter((q) => q.status === 'revoked').length;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function rotate() {
    const sure = window.confirm(
      'Make a new QR code? The old QR code will stop working. Print and put up the new one.',
    );
    if (!sure) return;
    startTransition(async () => {
      const res = await rotateQrAction(shop.id);
      setError(res.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your QR code</CardTitle>
        <CardDescription>
          Print this and put it on your counter. Customers check it with QRGuard before paying.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <FormError message={error} />
        {active?.qrImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL from the API */}
            <img
              src={active.qrImage}
              alt={`QR code for ${shop.name}`}
              className="mx-auto w-full max-w-56 rounded-lg border bg-white p-2"
            />
            <p className="text-center text-sm text-muted-foreground">
              Merchant ID <span className="font-mono text-foreground">{active.merchantId}</span>
            </p>
            <a
              href={active.qrImage}
              download={`qrguard-${active.merchantId}.png`}
              className={buttonVariants({ variant: 'outline' })}
            >
              <Download className="size-4" aria-hidden /> Download QR code
            </a>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">This shop has no active QR code.</p>
        )}
        <Button variant="outline" onClick={rotate} disabled={pending}>
          <RefreshCw className={`size-4 ${pending ? 'animate-spin' : ''}`} aria-hidden />
          {active ? 'Make a new QR code' : 'Create a QR code'}
        </Button>
        {revoked > 0 && (
          <p className="text-xs text-muted-foreground">
            {revoked} old QR code{revoked === 1 ? '' : 's'} no longer work. If a customer scans one,
            you get an alert.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
