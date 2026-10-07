import type {
  Alert,
  Payment,
  PaymentSummary,
  PhotoCheck,
  QrCodeListItem,
  Shop,
} from '@qrguard/types';
import { BadgeCheck, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AppHeader } from '@/components/app-header';
import { PhotoCheckCard } from '@/components/dashboard/photo-check-card';
import { QrCard } from '@/components/dashboard/qr-card';
import { ShopLive } from '@/components/dashboard/shop-live';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { authedFetch, requireUser } from '@/lib/auth';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Dashboard · QRGuard' };
export const dynamic = 'force-dynamic';

// Where the browser connects for live updates (the API's public address).
const REALTIME_URL = process.env.API_PUBLIC_URL ?? 'http://localhost:4000';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string }>;
}) {
  const user = await requireUser(['owner', 'admin']);
  const { shop: wanted } = await searchParams;
  const shops = await authedFetch<Shop[]>('/shops');

  if (shops.length === 0) {
    return (
      <>
        <AppHeader user={user} />
        <main className="mx-auto grid max-w-xl gap-4 px-4 py-10 text-center">
          <h1 className="text-2xl font-bold">Welcome to QRGuard</h1>
          <p className="text-muted-foreground">Add your shop to get its protected QR code.</p>
          <Link href="/dashboard/new" className={buttonVariants({ size: 'lg' })}>
            <Plus className="size-4" aria-hidden /> Add my shop
          </Link>
        </main>
      </>
    );
  }

  const shop = shops.find((s) => s.id === wanted) ?? shops[0];
  const [alerts, payments, summary, qrCodes, photoChecks] = await Promise.all([
    authedFetch<Alert[]>(`/shops/${shop.id}/alerts?limit=20`),
    authedFetch<Payment[]>(`/shops/${shop.id}/payments?limit=10`),
    authedFetch<PaymentSummary>(`/shops/${shop.id}/payments/summary`),
    authedFetch<QrCodeListItem[]>(`/shops/${shop.id}/qrcodes`),
    authedFetch<PhotoCheck[]>(`/shops/${shop.id}/photo-checks?limit=5`),
  ]);

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6">
        {(shops.length > 1 || user.role === 'owner') && (
          <nav aria-label="Your shops" className="flex flex-wrap gap-2">
            {shops.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard?shop=${s.id}`}
                aria-current={s.id === shop.id ? 'page' : undefined}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm',
                  s.id === shop.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                {s.name}
              </Link>
            ))}
            {user.role === 'owner' && (
              <Link
                href="/dashboard/new"
                className="inline-flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-sm hover:bg-muted"
              >
                <Plus className="size-3" aria-hidden /> Add shop
              </Link>
            )}
          </nav>
        )}

        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
            {shop.name}
            {shop.verified ? (
              <Badge variant="success" className="gap-1">
                <BadgeCheck className="size-3" aria-hidden /> Verified
              </Badge>
            ) : (
              <Badge variant="outline">Not verified yet</Badge>
            )}
          </h1>
          <p className="text-muted-foreground">{shop.address}</p>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
          <ShopLive
            key={shop.id}
            shop={shop}
            realtimeUrl={REALTIME_URL}
            initialAlerts={alerts}
            initialPayments={payments}
            initialSummary={summary}
          />
          <aside className="grid gap-4">
            <PhotoCheckCard key={shop.id} shopId={shop.id} initialChecks={photoChecks} />
            <QrCard shop={shop} qrCodes={qrCodes} />
          </aside>
        </div>
      </main>
    </>
  );
}
