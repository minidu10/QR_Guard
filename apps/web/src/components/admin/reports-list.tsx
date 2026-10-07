'use client';

import type { Report, ReportStatus } from '@qrguard/types';
import { useState, useTransition } from 'react';
import { setReportStatusAction } from '@/app/admin/actions';
import { FormError } from '@/components/auth/field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { timeAgo } from '@/lib/format';

const STATUS_LABEL: Record<ReportStatus, string> = {
  open: 'Open',
  reviewing: 'Reviewing',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

// What the bank team can do next with a report.
const NEXT: Record<ReportStatus, { to: ReportStatus; label: string }[]> = {
  open: [
    { to: 'reviewing', label: 'Start review' },
    { to: 'dismissed', label: 'Dismiss' },
  ],
  reviewing: [
    { to: 'resolved', label: 'Resolved' },
    { to: 'dismissed', label: 'Dismiss' },
  ],
  resolved: [{ to: 'open', label: 'Re-open' }],
  dismissed: [{ to: 'open', label: 'Re-open' }],
};

export function ReportsList({ reports }: { reports: Report[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const now = Date.now();

  if (reports.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No customer reports.</p>;
  }

  return (
    <div className="grid gap-2">
      <FormError message={error} />
      <ul className="divide-y">
        {reports.map((r) => (
          <li key={r.id} className="grid gap-1 py-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={r.status === 'open' ? 'danger' : 'outline'}>
                {STATUS_LABEL[r.status]}
              </Badge>
              <span className="font-medium">{r.shopName ?? 'Unknown shop'}</span>
              {r.merchantId && (
                <span className="font-mono text-xs text-muted-foreground">{r.merchantId}</span>
              )}
              <time className="ml-auto text-xs text-muted-foreground" dateTime={r.createdAt}>
                {timeAgo(r.createdAt, now)}
              </time>
            </div>
            <p className="text-sm">“{r.description}”</p>
            <div className="flex gap-2">
              {NEXT[r.status].map((n) => (
                <Button
                  key={n.to}
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      setError((await setReportStatusAction(r.id, n.to)).error);
                    })
                  }
                >
                  {n.label}
                </Button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
