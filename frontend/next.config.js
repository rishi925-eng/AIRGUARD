/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
    // Mapbox token is optional — routing falls back to free OSRM if absent
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '',
  },
  images: {
    domains: ['api.mapbox.com'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://127.0.0.1:8000'}/api/:path*`,
      },
    ]
  },
  // Suppress Leaflet SSR warnings in webpack
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Leaflet is browser-only; exclude from server bundle
      config.externals = [...(config.externals || []), 'leaflet'];
    }
    return config;
  },
}

module.exports = nextConfig
