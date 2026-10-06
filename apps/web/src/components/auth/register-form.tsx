'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { registerAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { fieldErrors, type FormState, registerSchema } from '@/lib/validation';
import { Field, FormError } from './field';

const ROLES = [
  { value: 'customer', title: 'Customer', text: 'I want to check QR codes before I pay.' },
  { value: 'owner', title: 'Shop owner', text: 'I want to protect my shop’s QR code.' },
] as const;

export function RegisterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(registerAction, {});
  const [clientErrors, setClientErrors] = useState<FormState['fieldErrors']>();
  const errors = clientErrors ?? state.fieldErrors ?? {};
  const v = state.values ?? {};

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const parsed = registerSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
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

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">I am a…</legend>
        <div className="grid grid-cols-2 gap-2">
          {ROLES.map((r) => (
            <label
              key={r.value}
              className="cursor-pointer rounded-lg border p-3 text-sm has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/20 has-[:focus-visible]:ring-2"
            >
              <input
                type="radio"
                name="role"
                value={r.value}
                defaultChecked={(v.role || 'customer') === r.value}
                className="sr-only"
              />
              <span className="block font-medium">{r.title}</span>
              <span className="text-muted-foreground">{r.text}</span>
            </label>
          ))}
        </div>
        {errors.role && <p className="text-sm text-danger">{errors.role}</p>}
      </fieldset>

      <Field
        name="name"
        label="Full name"
        autoComplete="name"
        defaultValue={v.name}
        error={errors.name}
        required
      />
      <Field
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        defaultValue={v.email}
        error={errors.email}
        required
      />
      <Field
        name="phone"
        label="Mobile number (optional)"
        type="tel"
        autoComplete="tel"
        placeholder="0771234567"
        defaultValue={v.phone}
        error={errors.phone}
      />
      <Field
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        error={errors.password}
        required
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Log in
        </Link>
      </p>
    </form>
  );
}
