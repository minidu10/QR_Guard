'use client';

import { useEffect } from 'react';

// Registers /sw.js so the app can be installed and has an offline page.
// Only in production builds: in dev it would cache files while you edit them.
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
      // Not fatal: the site still works without it.
    });
  }, []);
  return null;
}
