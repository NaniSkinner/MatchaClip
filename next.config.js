/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output for Electron production builds
  // This creates a self-contained build with minimal dependencies
  // Note: NOT using 'output: export' because this app has dynamic routes
  // that load data from IndexedDB at runtime. Electron bundles a local
  // Next.js server instead of using static export.
  output: 'standalone',

  images: {
    unoptimized: true
  },

  // Ensure compatibility with FFmpeg WASM
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    return config;
  }
}

module.exports = nextConfig
