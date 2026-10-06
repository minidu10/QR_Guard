// Simple liveness check for Docker. Does not call other services.
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ status: 'ok' });
}
