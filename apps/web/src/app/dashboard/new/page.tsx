import type { Metadata } from 'next';
import { AppHeader } from '@/components/app-header';
import { CreateShopForm } from '@/components/dashboard/create-shop-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Add a shop · QRGuard' };

export default async function NewShopPage() {
  const user = await requireUser(['owner']);
  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-md px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Add a shop</CardTitle>
            <CardDescription>We make a protected QR code for it straight away.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateShopForm />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
