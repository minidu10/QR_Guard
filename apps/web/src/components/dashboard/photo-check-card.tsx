'use client';

import type { PhotoCheck } from '@qrguard/types';
import { Camera, CheckCircle2, Clock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useState, useTransition } from 'react';
import { uploadPhotoAction } from '@/app/dashboard/actions';
import { FormError } from '@/components/auth/field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

const MAX_MB = 5;
const SL_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const slDay = (ms: number) => Math.floor((ms + SL_OFFSET_MS) / 86_400_000);

function Result({ check }: { check: PhotoCheck }) {
  const real = check.result === 'real';
  const Icon = real ? ShieldCheck : ShieldAlert;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-medium text-white',
        real ? 'bg-safe' : 'bg-danger',
      )}
    >
      <Icon className="size-4" aria-hidden /> {real ? 'Looks real' : 'Looks tampered'} ·{' '}
      {Math.round(check.confidence * 100)}%
    </span>
  );
}

// Daily photo of the QR stand. The AI says if the sticker looks real or tampered.
export function PhotoCheckCard({
  shopId,
  initialChecks,
}: {
  shopId: string;
  initialChecks: PhotoCheck[];
}) {
  const [checks, setChecks] = useState(initialChecks);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const latest = checks[0];
  const doneToday = latest && slDay(Date.parse(latest.createdAt)) === slDay(Date.now());

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const file = form.get('photo');
    if (!(file instanceof File) || file.size === 0) return setError('Choose a photo first.');
    if (file.size > MAX_MB * 1024 * 1024) return setError(`The photo must be under ${MAX_MB} MB.`);
    const target = e.currentTarget;
    startTransition(async () => {
      const res = await uploadPhotoAction(shopId, form);
      if (res.ok) {
        setChecks((list) => [res.check, ...list]);
        setError(undefined);
        target.reset();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily QR photo check</CardTitle>
        <CardDescription>
          Take a photo of your QR stand every day. Our AI checks it for a fake sticker.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="flex items-center gap-2 text-sm">
          {doneToday ? (
            <>
              <CheckCircle2 className="size-4 text-safe" aria-hidden /> Today&apos;s photo is done.
            </>
          ) : (
            <>
              <Clock className="size-4 text-muted-foreground" aria-hidden /> No photo yet today.
            </>
          )}
        </p>

        {latest && (
          <div className="grid gap-2 rounded-lg border p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- private photo through our proxy */}
            <img
              src={`/photo-checks/${latest.id}/image`}
              alt="Latest photo of the QR stand"
              className="aspect-video w-full rounded-md bg-muted object-cover"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Result check={latest} />
              <span className="text-xs text-muted-foreground">
                {timeAgo(latest.createdAt)}
                {latest.modelMode === 'mock' ? ' · test AI' : ''}
              </span>
            </div>
          </div>
        )}

        <FormError message={error} />
        <form onSubmit={onSubmit} className="grid gap-2">
          <label className="grid gap-1 text-sm font-medium">
            Photo of your QR stand
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5"
            />
          </label>
          <Button type="submit" disabled={pending}>
            <Camera className="size-4" aria-hidden />
            {pending ? 'Checking…' : 'Check photo'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
