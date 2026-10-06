import type { MetadataRoute } from 'next';

// Web app manifest: lets people install QRGuard on their phone home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'QRGuard',
    short_name: 'QRGuard',
    description: 'Check a shop QR code before you pay. Stop fake QR sticker scams.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#0f172a',
    categories: ['finance', 'security', 'utilities'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
