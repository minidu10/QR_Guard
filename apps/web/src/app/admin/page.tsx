import type { AdminOverview, AlertWithShop, Report, Shop } from '@qrguard/types';
import type { Metadata } from 'next';
import { AdminLive } from '@/components/admin/admin-live';
import { ReportsList } from '@/components/admin/reports-list';
import { RiskMap } from '@/components/admin/risk-map-loader';
import { ShopsTable } from '@/components/admin/shops-table';
import { AppHeader } from '@/components/app-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authedFetch, requireUser } from '@/lib/auth';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Bank team · QRGuard' };
export const dynamic = 'force-dynamic';

const REALTIME_URL = process.env.API_PUBLIC_URL ?? 'http://localhost:4000';

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'danger' }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold', tone === 'danger' && 'text-danger')}>
        {value}
      </p>
    </div>
  );
}

// Bank team view: every shop, its risk, live alerts and customer reports.
export default async function AdminPage() {
  const user = await requireUser(['admin']);
  const [overview, shops, alerts, reports] = await Promise.all([
    authedFetch<AdminOverview>('/admin/overview'),
    authedFetch<Shop[]>('/shops'),
    authedFetch<AlertWithShop[]>('/alerts?limit=20'),
    authedFetch<Report[]>('/reports?limit=30'),
  ]);

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold">Bank team overview</h1>
          <p className="text-muted-foreground">
            All QRGuard shops, their risk, and what is happening now.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Stat label="Shops" value={`${overview.shops}`} />
          <Stat label="Verified" value={`${overview.verifiedShops} of ${overview.shops}`} />
          <Stat
            label="High-risk shops"
            value={`${overview.highRiskShops}`}
            tone={overview.highRiskShops > 0 ? 'danger' : undefined}
          />
          <Stat label="Scans today" value={`${overview.scansToday}`} />
          <Stat
            label="Warnings today"
            value={`${overview.warningsToday}`}
            tone={overview.warningsToday > 0 ? 'danger' : undefined}
          />
          <Stat label="Open reports" value={`${overview.openReports}`} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <Card>
            <CardHeader>
              <CardTitle>Risk map</CardTitle>
              <CardDescription>Click a shop for details.</CardDescription>
            </CardHeader>
            <CardContent>
              <RiskMap shops={shops} />
            </CardContent>
          </Card>
          <AdminLive realtimeUrl={REALTIME_URL} initialAlerts={alerts} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Shops</CardTitle>
            <CardDescription>
              Riskiest first. Verify a shop after the bank has checked it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ShopsTable shops={shops} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer reports</CardTitle>
            <CardDescription>QR codes that customers think are fake.</CardDescription>
          </CardHeader>
          <CardContent>
            <ReportsList reports={reports} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
