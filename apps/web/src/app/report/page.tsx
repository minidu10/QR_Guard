import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { z } from 'zod';
import { ReportForm } from '@/components/report/report-form';

export const metadata: Metadata = { title: 'Report a QR code · QRGuard' };

// Customers report a suspicious QR code. No login needed.
export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ scan?: string }>;
}) {
  const { scan } = await searchParams;
  const scanId = z.uuid().safeParse(scan).success ? scan : undefined;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-3">
        <Link href="/scan" aria-label="Back to scanning" className="rounded-md p-1 hover:bg-muted">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Report a QR code</h1>
          <p className="text-sm text-muted-foreground">
            {scanId
              ? 'Tell us about the QR code you just scanned.'
              : 'Tell us about a QR code that looks wrong.'}
          </p>
        </div>
      </header>
      <ReportForm scanId={scanId} />
    </main>
  );
}
