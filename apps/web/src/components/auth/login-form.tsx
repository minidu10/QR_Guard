'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { loginAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { fieldErrors, type FormState, loginSchema } from '@/lib/validation';
import { Field, FormError } from './field';

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
  const [clientErrors, setClientErrors] = useState<FormState['fieldErrors']>();
  const errors = clientErrors ?? state.fieldErrors ?? {};

  // Check the form in the browser first, so simple mistakes show at once.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const parsed = loginSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) {
      e.preventDefault();
      setClientErrors(fieldErrors(parsed.error));
    } else {
      setClientErrors(undefined);
    }
  }

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={state.error} />
      <Field
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        error={errors.email}
        required
      />
      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password}
        required
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Logging in…' : 'Log in'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        No account?{' '}
        <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
          Sign up
        </Link>
      </p>
    </form>
  );
}
