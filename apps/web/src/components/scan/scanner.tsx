'use client';

import type { NearbyShop, ScanResponse } from '@qrguard/types';
import { Camera, ImageUp, Loader2, MapPin } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { nearbyShopsAction, scanAction } from '@/app/scan/actions';
import { FormError } from '@/components/auth/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ScanResult } from './scan-result';

// html5-qrcode draws the camera into these elements.
const CAMERA_ID = 'qr-camera';
const FILE_ID = 'qr-file';

type Phase = 'scanning' | 'checking' | 'result';
type Coords = { lat: number; lng: number };

export function Scanner() {
  const [phase, setPhase] = useState<Phase>('scanning');
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string>();
  const [cameraError, setCameraError] = useState<string>();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(true);
  const [shops, setShops] = useState<NearbyShop[]>([]);
  // '' = not picked: the API finds the shop from the location.
  const [shopId, setShopId] = useState('');

  // Find the customer's location once, to list the shops around them.
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(here);
        setShops(await nearbyShopsAction(here.lat, here.lng));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  const check = useCallback(
    async (qrPayload: string) => {
      setPhase('checking');
      setError(undefined);
      const where = shopId ? { shopId } : (coords ?? {});
      const res = await scanAction({ qrPayload, ...where });
      if (res.ok) {
        setResult(res.result);
        setPhase('result');
      } else {
        setError(res.error);
        setPhase('scanning');
      }
    },
    [shopId, coords],
  );
  // The camera callback is created once, so it reads the latest check() from here.
  const checkRef = useRef(check);
  useEffect(() => {
    checkRef.current = check;
  }, [check]);

  // Run the camera while scanning. Stop it as soon as a QR is found.
  useEffect(() => {
    if (phase !== 'scanning') return;
    let done = false;
    let scanner: import('html5-qrcode').Html5Qrcode | null = null;
    let started: Promise<unknown> = Promise.resolve();

    void (async () => {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      if (done) return;
      scanner = new Html5Qrcode(CAMERA_ID, {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      });
      started = scanner
        .start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (w, h) => {
              const size = Math.floor(Math.min(w, h) * 0.7);
              return { width: size, height: size };
            },
          },
          (text) => {
            if (done) return;
            done = true;
            void checkRef.current(text);
          },
          () => {}, // "No QR in this frame" - normal, ignore.
        )
        .then(() => setCameraError(undefined))
        .catch(() => {
          if (!done) {
            setCameraError(
              'We could not open the camera. Allow camera access, or upload a photo of the QR code.',
            );
          }
        });
    })();

    return () => {
      done = true;
      void started
        .then(async () => {
          if (scanner?.isScanning) await scanner.stop();
          scanner?.clear();
        })
        .catch(() => {});
    };
  }, [phase]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const { Html5Qrcode } = await import('html5-qrcode');
    try {
      const text = await new Html5Qrcode(FILE_ID, false).scanFile(file, false);
      await check(text);
    } catch {
      setError('No QR code found in that photo. Try a clearer photo.');
    }
  }

  function onPaste(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = String(new FormData(e.currentTarget).get('qr') ?? '').trim();
    if (text) void check(text);
  }

  function scanAgain() {
    setResult(null);
    setError(undefined);
    setPhase('scanning');
  }

  return (
    <div className="grid gap-4">
      {phase === 'result' && result ? (
        <ScanResult result={result} onScanAgain={scanAgain} />
      ) : (
        <>
          <label className="grid gap-2 text-sm font-medium">
            <span className="flex items-center gap-1">
              <MapPin className="size-4" aria-hidden /> Which shop are you at?
            </span>
            <select
              value={shopId}
              onChange={(e) => setShopId(e.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-base md:text-sm"
            >
              <option value="">
                {locating
                  ? 'Finding shops near you…'
                  : coords
                    ? 'Find it from my location'
                    : 'Not sure (location is off)'}
              </option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.distanceMeters} m)
                </option>
              ))}
            </select>
          </label>

          <FormError message={error} />

          <div className="relative overflow-hidden rounded-2xl border bg-black">
            <div
              id={CAMERA_ID}
              className={cn('aspect-square w-full', phase !== 'scanning' && 'invisible')}
            />
            {phase === 'scanning' && !cameraError && (
              <p className="pointer-events-none absolute inset-x-0 bottom-3 flex items-center justify-center gap-2 text-sm text-white">
                <Camera className="size-4" aria-hidden /> Point the camera at the shop&apos;s QR
                code
              </p>
            )}
            {cameraError && (
              <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-white">
                {cameraError}
              </p>
            )}
            {phase === 'checking' && (
              <p
                role="status"
                className="absolute inset-0 flex items-center justify-center gap-2 bg-black/70 text-lg text-white"
              >
                <Loader2 className="size-6 animate-spin" aria-hidden /> Checking…
              </p>
            )}
          </div>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-medium hover:bg-muted">
            <ImageUp className="size-4" aria-hidden /> Upload a photo of the QR code
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onFile}
              disabled={phase !== 'scanning'}
            />
          </label>

          <details className="rounded-md border px-4 py-3 text-sm">
            <summary className="cursor-pointer font-medium">Type or paste the QR text</summary>
            <form onSubmit={onPaste} className="mt-3 flex gap-2">
              <Input name="qr" placeholder="000201010211…" aria-label="QR text" />
              <Button type="submit" disabled={phase !== 'scanning'}>
                Check
              </Button>
            </form>
          </details>
        </>
      )}
      {/* Hidden helper used to read QR codes from uploaded photos. */}
      <div id={FILE_ID} hidden />
    </div>
  );
}
