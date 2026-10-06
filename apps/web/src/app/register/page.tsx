import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { RegisterForm } from '@/components/auth/register-form';
import { getSessionUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Sign up · QRGuard' };

export default async function RegisterPage() {
  if (await getSessionUser()) redirect('/');
  return (
    <AuthCard title="Create an account" description="It takes less than a minute.">
      <RegisterForm />
    </AuthCard>
  );
}
