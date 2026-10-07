'use client';

import dynamic from 'next/dynamic';

// Leaflet only works in the browser, so the map is never rendered on the server.
export const RiskMap = dynamic(() => import('./risk-map'), {
  ssr: false,
  loading: () => <div className="h-96 animate-pulse rounded-xl border bg-muted" />,
});
