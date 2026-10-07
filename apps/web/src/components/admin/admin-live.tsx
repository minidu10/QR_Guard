'use client';

import type { AlertWithShop } from '@qrguard/types';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { markAlertReadAction } from '@/app/dashboard/actions';
import { AlertList } from '@/components/dashboard/alert-list';
import { LiveBadge } from '@/components/realtime/live-badge';
import { useRealtime } from '@/components/realtime/use-realtime';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Live alerts from every shop. A new alert also refreshes the numbers, map and table.
export function AdminLive({
  realtimeUrl,
  initialAlerts,
}: {
  realtimeUrl: string;
  initialAlerts: AlertWithShop[];
}) {
  const router = useRouter();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [now, setNow] = useState(() => Date.now());
  const refreshTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      clearInterval(t);
      clearTimeout(refreshTimer.current);
    };
  }, []);

  const status = useRealtime(realtimeUrl, {
    onAlert(alert) {
      setAlerts((list) => [alert, ...list].slice(0, 30));
      setNow(Date.now());
      // Wait a moment (risk scores are being updated), then reload the server data once.
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 1500);
    },
  });

  async function markRead(id: string) {
    setAlerts((list) => list.map((a) => (a.id === id ? { ...a, read: true } : a)));
    await markAlertReadAction(id);
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="grid gap-1.5">
          <CardTitle>Live alerts</CardTitle>
          <CardDescription>All shops, newest first.</CardDescription>
        </div>
        <LiveBadge status={status} />
      </CardHeader>
      <CardContent className="max-h-96 overflow-y-auto">
        <AlertList alerts={alerts} onMarkRead={markRead} showShop now={now} />
      </CardContent>
    </Card>
  );
}
