import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  // Small self-contained server for Docker.
  output: 'standalone',
  // Monorepo root, so standalone output includes workspace packages.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // Lint runs in its own step (pnpm lint).
  eslint: { ignoreDuringBuilds: true },
  // QR stand photos can be up to 5 MB.
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
  async headers() {
    return [
      {
        // Browsers must always get the newest service worker.
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
