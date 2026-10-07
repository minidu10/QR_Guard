'use client';

import type { Shop } from '@qrguard/types';
import { ExternalLink, Play, TrendingDown, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { addPaymentsAction, paymentDropAction, resumeAction } from '@/app/demo/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Log = { ok: boolean; text: string; at: string };

// Buttons that act out each scam for the live presentation.
export function DemoControls({ shops }: { shops: Shop[] }) {
  const [shopId, setShopId] = useState(
    shops.find((s) => s.name === 'Perera Grocery')?.id ?? shops[0]?.id ?? '',
  );
  const [log, setLog] = useState<Log[]>([]);
  const [pending, startTransition] = useTransition();
  const shop = shops.find((s) => s.id === shopId);

  function note(ok: boolean, text: string) {
    const at = new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLog((l) => [{ ok, text, at }, ...l].slice(0, 8));
  }

  function act(fn: () => Promise<void>) {
    startTransition(fn);
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm font-medium">
          Shop
          <select
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
            className="h-10 min-w-56 rounded-md border bg-background px-3"
          >
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <Link
          href={`/dashboard?shop=${shopId}`}
          target="_blank"
          className="inline-flex h-10 items-center gap-1 text-sm underline underline-offset-4"
        >
          Open its dashboard <ExternalLink className="size-3" aria-hidden />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="size-5" aria-hidden /> Payment drop
            </CardTitle>
            <CardDescription>
              A fake QR has been taking this shop&apos;s money for the last hour. We remove that
              hour&apos;s payments and run the check now.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button
              disabled={pending || !shop}
              onClick={() =>
                act(async () => {
                  const res = await paymentDropAction(shopId);
                  if (!res.ok) return note(false, res.error);
                  const { result, removed, alert } = res.data;
                  if (result.drop) {
                    note(
                      true,
                      `${shop?.name}: removed ${removed} payments. Last hour ${result.current} vs normal ${result.normal}. ${alert ? 'Alert sent.' : ''}`,
                    );
                  } else {
                    note(
                      false,
                      `${shop?.name}: no drop alert. Normal is only ${result.normal} payments at this time (needs 5+). Try a busier shop or time.`,
                    );
                  }
                })
              }
            >
              Simulate payment drop
            </Button>
            <Button
              variant="outline"
              disabled={pending || !shop}
              onClick={() =>
                act(async () => {
                  const res = await resumeAction(shopId);
                  note(res.ok, res.ok ? `${shop?.name}: normal payments again.` : res.error);
                })
              }
            >
              <Play className="size-4" aria-hidden /> Back to normal payments
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-5" aria-hidden /> Fake payments
            </CardTitle>
            <CardDescription>
              Customers pay the shop. Watch them appear live on its dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {[1, 5, 20].map((n) => (
              <Button
                key={n}
                variant="outline"
                disabled={pending || !shop}
                onClick={() =>
                  act(async () => {
                    const res = await addPaymentsAction(shopId, n);
                    note(res.ok, res.ok ? `${shop?.name}: ${n} fake payment(s) made.` : res.error);
                  })
                }
              >
                Add {n} payment{n === 1 ? '' : 's'}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <section aria-live="polite" className="grid gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">What happened</h2>
        {log.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
        <ul className="grid gap-1 text-sm">
          {log.map((l, i) => (
            <li key={i} className={cn('rounded-md border px-3 py-2', !l.ok && 'border-danger/40')}>
              <span className="mr-2 tabular-nums text-muted-foreground">{l.at}</span>
              {l.text}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
