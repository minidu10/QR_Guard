import type { PublicUser, Role } from '@qrguard/types';
import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { logoutAction } from '@/app/actions';
import { Button } from '@/components/ui/button';

const LINKS: { href: string; label: string; roles: Role[] }[] = [
  { href: '/scan', label: 'Check QR', roles: ['customer', 'owner', 'admin'] },
  { href: '/dashboard', label: 'Dashboard', roles: ['owner', 'admin'] },
  { href: '/demo', label: 'Demo', roles: ['admin'] },
];

// Top bar for logged-in pages: logo, links for this role, and log out.
export function AppHeader({ user }: { user: PublicUser }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <ShieldCheck className="size-6 text-safe" aria-hidden />
          QRGuard
        </Link>
        <nav className="order-last flex w-full gap-1 text-sm sm:order-none sm:w-auto sm:flex-1">
          {LINKS.filter((l) => l.roles.includes(user.role)).map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-2 py-1 hover:bg-muted">
              {l.label}
            </Link>
          ))}
        </nav>
        <span className="ml-auto hidden text-sm text-muted-foreground sm:inline">{user.name}</span>
        <form action={logoutAction} className="ml-auto sm:ml-0">
          <Button type="submit" variant="outline" size="sm">
            Log out
          </Button>
        </form>
      </div>
    </header>
  );
}
