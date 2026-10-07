import { cn } from '@/lib/utils';
import type { LiveStatus } from './use-realtime';

const TEXT: Record<LiveStatus, string> = {
  live: 'Live',
  connecting: 'Connecting…',
  offline: 'Offline - refresh the page',
};

// Small "Live" indicator for the real-time connection.
export function LiveBadge({ status }: { status: LiveStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
      <span
        aria-hidden
        className={cn(
          'size-2 rounded-full',
          status === 'live' && 'bg-safe',
          status === 'connecting' && 'animate-pulse bg-muted-foreground',
          status === 'offline' && 'bg-danger',
        )}
      />
      {TEXT[status]}
    </span>
  );
}
