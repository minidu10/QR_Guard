import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  // Small self-contained server for Docker.
  output: 'standalone',
  // Monorepo root, so standalone output includes workspace packages.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // Lint runs in its own step (pnpm lint).
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
