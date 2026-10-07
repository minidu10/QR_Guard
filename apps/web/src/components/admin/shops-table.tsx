'use client';

import type { Shop } from '@qrguard/types';
import { BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { verifyShopAction } from '@/app/admin/actions';
import { FormError } from '@/components/auth/field';
import { RiskBadge } from '@/components/risk-badge';
import { Button } from '@/components/ui/button';

// Every shop, riskiest first. The bank team can verify shops here.
export function ShopsTable({ shops }: { shops: Shop[] }) {
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string>();
  const [error, setError] = useState<string>();
  const sorted = [...shops].sort((a, b) => b.riskScore - a.riskScore);

  function toggle(shop: Shop) {
    setBusyId(shop.id);
    startTransition(async () => {
      const res = await verifyShopAction(shop.id, !shop.verified);
      setError(res.error);
      setBusyId(undefined);
    });
  }

  return (
    <div className="grid gap-2">
      <FormError message={error} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-2 font-medium">Shop</th>
              <th className="py-2 font-medium">Risk</th>
              <th className="py-2 font-medium">Verified</th>
              <th className="py-2 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.id} className="border-t align-middle">
                <td className="py-2">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.address}</p>
                </td>
                <td className="py-2">
                  <RiskBadge score={s.riskScore} />
                </td>
                <td className="py-2">
                  {s.verified ? (
                    <span className="inline-flex items-center gap-1 text-safe">
                      <BadgeCheck className="size-4" aria-hidden /> Yes
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not yet</span>
                  )}
                </td>
                <td className="py-2 text-right whitespace-nowrap">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending && busyId === s.id}
                    onClick={() => toggle(s)}
                  >
                    {s.verified ? 'Remove verified' : 'Verify'}
                  </Button>{' '}
                  <Link
                    href={`/dashboard?shop=${s.id}`}
                    className="ml-2 text-sm underline underline-offset-4"
                  >
                    Dashboard
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
