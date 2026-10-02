/** @type {import('next').NextConfig} */
// GitHub Pages serves the site under /airbnb-dashboard-sample01, so `npm run build:pages` sets PAGES_BASE_PATH.
// Plain `npm run build` (Capacitor APK, local) keeps the root path.
const basePath = process.env.PAGES_BASE_PATH || '';

const nextConfig = {
  // Static export: the same `out/` folder serves the web app and is bundled into the Android APK by Capacitor.
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath
};

export default nextConfig;
