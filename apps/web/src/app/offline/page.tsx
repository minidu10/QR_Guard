import { WifiOff } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Offline · QRGuard' };

// Shown by the service worker when there is no internet.
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <WifiOff className="size-12 text-muted-foreground" aria-hidden />
      <h1 className="text-2xl font-bold">You are offline</h1>
      <p className="text-muted-foreground">
        QRGuard needs the internet to check a QR code. Please connect and try again.
      </p>
      <p className="font-medium text-danger">Do not pay until the QR code has been checked.</p>
    </main>
  );
}
