/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Electron packaging
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
