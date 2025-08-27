const nextConfig = {
  transpilePackages: ['@snaproll/ui', '@snaproll/lib', '@snaproll/config', '@snaproll/convex-client'],
  experimental: { typedRoutes: true },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Force static file serving in development
  async rewrites() {
    return [
      {
        source: '/_next/static/chunks/:path*',
        destination: '/_next/static/chunks/:path*',
      },
    ];
  },
  // Add cache-busting headers only in development
  async headers() {
    // Only apply no-cache headers in development
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/_next/static/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-cache, no-store, must-revalidate',
            },
            {
              key: 'Pragma',
              value: 'no-cache',
            },
            {
              key: 'Expires',
              value: '0',
            },
          ],
        },
      ];
    }
    // In production, return empty array (use default caching)
    return [];
  },
};
export default nextConfig;
