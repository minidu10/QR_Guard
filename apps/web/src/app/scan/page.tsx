import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Scanner } from '@/components/scan/scanner';

export const metadata: Metadata = { title: 'Check a QR code · QRGuard' };

// Customer scan page. No login needed. Mobile first.
export default function ScanPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-6">
      <header className="flex items-center gap-3">
        <Link href="/" aria-label="Back to home" className="rounded-md p-1 hover:bg-muted">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Check a QR code</h1>
          <p className="text-sm text-muted-foreground">Scan the shop&apos;s QR before you pay.</p>
        </div>
      </header>
      <Scanner />
    </main>
  );
}
