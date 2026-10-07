import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAccessToken } from '@/lib/session';

const API_URL = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

// Shows a QR stand photo to its owner. The API checks who may see it;
// this only passes the request on with the user's token.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response('Not found', { status: 404 });
  const token = await getAccessToken();
  if (!token) return new Response('Log in first', { status: 401 });

  const res = await fetch(`${API_URL}/api/v1/photo-checks/${id}/image`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok || !res.body) return new Response('Not found', { status: res.status });
  return new Response(res.body, {
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'application/octet-stream',
      // Photos never change. Keep them only in this user's browser.
      'Cache-Control': 'private, max-age=86400, immutable',
    },
  });
}
