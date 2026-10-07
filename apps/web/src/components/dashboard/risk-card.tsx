import type { ShopRisk } from '@qrguard/types';
import { RiskBadge } from '@/components/risk-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// The shop's risk score and the reasons for it.
export function RiskCard({ risk }: { risk: ShopRisk }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          Risk score <RiskBadge score={risk.score} />
        </CardTitle>
        <CardDescription>
          0 is safe, 100 is high risk. Old warnings fade after 7 days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {risk.factors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No warning signs. Keep it up.</p>
        ) : (
          <ul className="grid gap-1 text-sm">
            {risk.factors.map((f) => (
              <li key={f.label} className="flex justify-between gap-3">
                <span>{f.label}</span>
                <span className="tabular-nums text-muted-foreground">+{f.points}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
