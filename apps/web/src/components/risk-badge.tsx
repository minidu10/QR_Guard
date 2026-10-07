import type { RiskLevel } from '@qrguard/types';
import { OctagonAlert, ShieldCheck, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export const RISK_STYLE: Record<
  RiskLevel,
  { label: string; icon: typeof ShieldCheck; badge: string; color: string }
> = {
  low: { label: 'Low risk', icon: ShieldCheck, badge: 'bg-safe text-white', color: '#0ca30c' },
  medium: {
    label: 'Medium risk',
    icon: TriangleAlert,
    badge: 'bg-warning text-black',
    color: '#fab219',
  },
  high: { label: 'High risk', icon: OctagonAlert, badge: 'bg-danger text-white', color: '#d03b3b' },
};

/** Same borders as the API: 60+ high, 30+ medium. */
export function riskLevel(score: number): RiskLevel {
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

// Risk is always shown with an icon and words, never colour alone.
export function RiskBadge({ score, className }: { score: number; className?: string }) {
  const { label, icon: Icon, badge } = RISK_STYLE[riskLevel(score)];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        badge,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden /> {label} · {score}
    </span>
  );
}
