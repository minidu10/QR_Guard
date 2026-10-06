import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { logoutAction } from '@/app/actions';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getApiHealth } from '@/lib/api';
import { getSessionUser } from '@/lib/session';

// Always render fresh, so the status is live.
export const dynamic = 'force-dynamic';

const SERVICE_NAMES: Record<string, string> = {
  api: 'API',
  mongo: 'Database (MongoDB)',
  redis: 'Cache / queue (Redis)',
  storage: 'File storage (MinIO / S3)',
  ai: 'AI service',
};

export default async function HomePage() {
  const [health, user] = await Promise.all([getApiHealth(), getSessionUser()]);
  const services = { api: health ? 'up' : 'down', ...health?.services };

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-12">
      <header className="flex items-center gap-3">
        <ShieldCheck className="size-10 text-safe" aria-hidden />
        <div>
          <h1 className="text-3xl font-bold">QRGuard</h1>
          <p className="text-muted-foreground">Stop fake QR sticker scams before you pay.</p>
        </div>
      </header>

      {user ? (
        <div className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3">
          <p className="text-sm">
            Logged in as <span className="font-medium">{user.name}</span>{' '}
            <Badge variant="outline">{user.role}</Badge>
          </p>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              Log out
            </Button>
          </form>
        </div>
      ) : (
        <div className="flex gap-2">
          <Link href="/login" className={buttonVariants({ className: 'flex-1' })}>
            Log in
          </Link>
          <Link
            href="/register"
            className={buttonVariants({ variant: 'outline', className: 'flex-1' })}
          >
            Sign up
          </Link>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>System status</CardTitle>
          <CardDescription>Live check of every QRGuard service.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {Object.entries(services).map(([key, status]) => (
              <li key={key} className="flex items-center justify-between py-2">
                <span>{SERVICE_NAMES[key] ?? key}</span>
                <Badge variant={status === 'up' ? 'success' : 'danger'}>{status}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
