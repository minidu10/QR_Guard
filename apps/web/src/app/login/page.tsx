import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { LoginForm } from '@/components/auth/login-form';
import { getSessionUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Log in · QRGuard' };

export default async function LoginPage() {
  if (await getSessionUser()) redirect('/');
  return (
    <AuthCard title="Log in" description="Welcome back. Log in to your QRGuard account.">
      <LoginForm />
    </AuthCard>
  );
}
