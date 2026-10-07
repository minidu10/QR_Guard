import type { ScanResponse } from '@qrguard/types';
import { BadgeCheck, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Big green "Safe to pay" or red "Do not pay" screen.
export function ScanResult({
  result,
  onScanAgain,
}: {
  result: ScanResponse;
  onScanAgain: () => void;
}) {
  const { safe, shop } = result;
  const Icon = safe ? ShieldCheck : ShieldAlert;

  return (
    <div className="grid gap-4">
      <section
        role="status"
        aria-live="assertive"
        className={cn(
          'flex flex-col items-center gap-3 rounded-2xl px-6 py-10 text-center text-white',
          safe ? 'bg-safe' : 'bg-danger',
        )}
      >
        <Icon className="size-20" aria-hidden />
        <h2 className="text-3xl font-bold">{safe ? 'Safe to pay' : 'Do not pay'}</h2>
        <p className="text-lg">{result.message}</p>
      </section>

      {shop && (
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">This QR code belongs to</p>
          <p className="text-lg font-semibold">{shop.name}</p>
          <p className="text-sm text-muted-foreground">{shop.address}</p>
          {shop.verified ? (
            <Badge variant="success" className="mt-2 gap-1">
              <BadgeCheck className="size-3" aria-hidden /> Verified by the bank
            </Badge>
          ) : (
            <Badge variant="outline" className="mt-2">
              Not verified yet
            </Badge>
          )}
        </div>
      )}

      {!safe && result.qrMerchantName && (
        <p className="rounded-xl border p-4 text-sm">
          The QR code says <span className="font-semibold">“{result.qrMerchantName}”</span>.
          Scammers often copy the real shop name, so the name alone does not prove it is real.
        </p>
      )}

      <Button size="lg" onClick={onScanAgain}>
        Scan another QR code
      </Button>
    </div>
  );
}
