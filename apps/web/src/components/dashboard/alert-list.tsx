'use client';

import type { Alert, AlertWithShop, Severity } from '@qrguard/types';
import { AlertTriangle, Info, OctagonAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ALERT_LABEL, SEVERITY_LABEL, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

const SEVERITY_STYLE: Record<Severity, { icon: typeof Info; badge: string; border: string }> = {
  high: { icon: OctagonAlert, badge: 'bg-danger text-white', border: 'border-danger' },
  medium: { icon: AlertTriangle, badge: 'bg-warning text-black', border: 'border-warning' },
  low: { icon: Info, badge: 'border text-foreground', border: 'border-muted-foreground' },
};

// Severity always shows an icon and a word, never colour alone.
export function SeverityBadge({ severity }: { severity: Severity }) {
  const { icon: Icon, badge } = SEVERITY_STYLE[severity];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium',
        badge,
      )}
    >
      <Icon className="size-3" aria-hidden /> {SEVERITY_LABEL[severity]}
    </span>
  );
}

export function AlertList({
  alerts,
  onMarkRead,
  showShop = false,
  now,
}: {
  alerts: (Alert | AlertWithShop)[];
  onMarkRead?: (id: string) => void;
  showShop?: boolean;
  now: number;
}) {
  if (alerts.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No alerts. All good.</p>;
  }
  return (
    <ul className="divide-y">
      {alerts.map((a) => (
        <li
          key={a.id}
          className={cn(
            'grid gap-1 border-l-4 py-3 pl-3',
            a.read ? 'border-transparent opacity-70' : SEVERITY_STYLE[a.severity].border,
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={a.severity} />
            <span className="text-sm font-medium">{ALERT_LABEL[a.type]}</span>
            {showShop && 'shopName' in a && (
              <span className="text-sm text-muted-foreground">· {a.shopName}</span>
            )}
            <time dateTime={a.createdAt} className="ml-auto text-xs text-muted-foreground">
              {timeAgo(a.createdAt, now)}
            </time>
          </div>
          <p className="text-sm">{a.message}</p>
          {!a.read && onMarkRead && (
            <Button
              variant="ghost"
              size="sm"
              className="justify-self-start px-2"
              onClick={() => onMarkRead(a.id)}
            >
              Mark as read
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
