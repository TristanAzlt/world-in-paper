import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'static.usernames.app-backend.toolsforhumanity.com' },
      { hostname: 'app.hyperliquid.xyz' },
      { hostname: 'assets.coingecko.com' },
    ],
  },
  allowedDevOrigins: ['world-in-paper.ngrok.dev'],
  reactStrictMode: false,
};

export default nextConfig;
