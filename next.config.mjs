/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: the same `out/` folder serves the web app and is bundled into the Android APK by Capacitor.
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true }
};

export default nextConfig;
