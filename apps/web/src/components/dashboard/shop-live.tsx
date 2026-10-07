'use client';

import type { Alert, Payment, PaymentSummary, Shop } from '@qrguard/types';
import { BellRing, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { markAlertReadAction } from '@/app/dashboard/actions';
import { LiveBadge } from '@/components/realtime/live-badge';
import { useRealtime } from '@/components/realtime/use-realtime';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ALERT_LABEL, formatLkr, slHour, slTime } from '@/lib/format';
import { AlertList } from './alert-list';
import { PaymentsChart } from './payments-chart';

const MAX_ITEMS = 20;

// Re-render every 30 s so "5 min ago" stays right.
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'danger' }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone === 'danger' ? 'text-danger' : ''}`}>
        {value}
      </p>
    </div>
  );
}

/** Everything on the shop dashboard that updates live. */
export function ShopLive({
  shop,
  realtimeUrl,
  initialAlerts,
  initialPayments,
  initialSummary,
  extraStat,
}: {
  shop: Shop;
  realtimeUrl: string;
  initialAlerts: Alert[];
  initialPayments: Payment[];
  initialSummary: PaymentSummary;
  extraStat?: React.ReactNode;
}) {
  const now = useNow();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [payments, setPayments] = useState(initialPayments);
  const [summary, setSummary] = useState(initialSummary);
  const [toast, setToast] = useState<Alert | null>(null);

  const status = useRealtime(realtimeUrl, {
    onAlert(alert) {
      if (alert.shopId !== shop.id) return;
      setAlerts((list) => [alert, ...list].slice(0, MAX_ITEMS));
      setToast(alert);
    },
    onPayment(p) {
      if (p.shopId !== shop.id) return;
      setPayments((list) => [p, ...list].slice(0, MAX_ITEMS));
      if (p.status !== 'success') return;
      const hour = slHour(p.createdAt);
      setSummary((s) => ({
        today: { count: s.today.count + 1, total: s.today.total + p.amount },
        hourly: s.hourly.map((h) => (h.hour === hour ? { ...h, count: h.count + 1 } : h)),
      }));
    },
  });

  // Hide the pop-up after a few seconds.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(t);
  }, [toast]);

  async function markRead(id: string) {
    setAlerts((list) => list.map((a) => (a.id === id ? { ...a, read: true } : a)));
    await markAlertReadAction(id);
  }

  const unread = alerts.filter((a) => !a.read).length;

  return (
    <div className="grid gap-4">
      {toast && (
        <div
          role="alert"
          className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-lg items-start gap-3 rounded-xl bg-danger p-4 text-white shadow-lg"
        >
          <BellRing className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div className="flex-1">
            <p className="font-semibold">New alert: {ALERT_LABEL[toast.type]}</p>
            <p className="text-sm">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} aria-label="Close" className="rounded p-1">
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Payments today" value={summary.today.count.toLocaleString('en-LK')} />
        <Stat label="Received today" value={formatLkr(summary.today.total)} />
        <Stat
          label="Unread alerts"
          value={String(unread)}
          tone={unread > 0 ? 'danger' : undefined}
        />
        {extraStat}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div className="grid gap-1.5">
              <CardTitle>Alerts</CardTitle>
              <CardDescription>New alerts appear here without a refresh.</CardDescription>
            </div>
            <LiveBadge status={status} />
          </CardHeader>
          <CardContent>
            <AlertList alerts={alerts} onMarkRead={markRead} now={now} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments per hour</CardTitle>
            <CardDescription>Today compared with a normal day.</CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentsChart
              hourly={summary.hourly}
              currentHour={slHour(new Date(now).toISOString())}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest payments</CardTitle>
          <CardDescription>Fake payments for the demo. No real money moves.</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2 font-medium">Time</th>
                  <th className="py-2 font-medium">Customer</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {payments.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2">{slTime(p.createdAt)}</td>
                    <td className="py-2">{p.customerRef}</td>
                    <td className="py-2 text-right">
                      {p.status === 'success' ? formatLkr(p.amount) : 'Failed'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
