'use client';

import { MapPin } from 'lucide-react';
import { useActionState, useState } from 'react';
import { createShopAction } from '@/app/dashboard/actions';
import { Field, FormError } from '@/components/auth/field';
import { Button } from '@/components/ui/button';
import type { FormState } from '@/lib/validation';

// For a new owner: add a shop. Location comes from the phone, or can be typed.
export function CreateShopForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createShopAction, {});
  const v = state.values ?? {};
  const errors = state.fieldErrors ?? {};
  const [coords, setCoords] = useState({ lat: v.lat ?? '', lng: v.lng ?? '' });
  const [locError, setLocError] = useState<string>();

  function useMyLocation() {
    setLocError(undefined);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setCoords({
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }),
      () => setLocError('Could not get your location. Type it in instead.'),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <form action={action} className="grid gap-4">
      <FormError message={state.error} />
      <Field name="name" label="Shop name" defaultValue={v.name} error={errors.name} required />
      <Field
        name="address"
        label="Address"
        placeholder="45 Galle Road, Colombo 03"
        defaultValue={v.address}
        error={errors.address}
        required
      />
      <div className="grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Field
            name="lat"
            label="Latitude"
            inputMode="decimal"
            value={coords.lat}
            onChange={(e) => setCoords((c) => ({ ...c, lat: e.target.value }))}
            error={errors.lat}
            required
          />
          <Field
            name="lng"
            label="Longitude"
            inputMode="decimal"
            value={coords.lng}
            onChange={(e) => setCoords((c) => ({ ...c, lng: e.target.value }))}
            error={errors.lng}
            required
          />
        </div>
        <Button type="button" variant="outline" onClick={useMyLocation}>
          <MapPin className="size-4" aria-hidden /> Use my current location
        </Button>
        {locError && <p className="text-sm text-danger">{locError}</p>}
        <p className="text-xs text-muted-foreground">
          Stand inside your shop when you press the button, so customers nearby find it.
        </p>
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Creating…' : 'Create shop and QR code'}
      </Button>
    </form>
  );
}
