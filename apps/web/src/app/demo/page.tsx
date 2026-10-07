import type { Shop } from '@qrguard/types';
import type { Metadata } from 'next';
import { AppHeader } from '@/components/app-header';
import { DemoControls } from '@/components/demo/demo-controls';
import { authedFetch, requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Demo control · QRGuard' };
export const dynamic = 'force-dynamic';

// Demo control page for the live presentation. Admins only. Uses fake data only.
export default async function DemoPage() {
  const user = await requireUser(['admin']);
  const shops = await authedFetch<Shop[]>('/shops');
  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto grid max-w-4xl gap-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold">Demo control</h1>
          <p className="text-muted-foreground">
            Act out each scam live. Everything here uses fake data and fake payments.
          </p>
        </div>
        <DemoControls shops={shops} />
      </main>
    </>
  );
}
