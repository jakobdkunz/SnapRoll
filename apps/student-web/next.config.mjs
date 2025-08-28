const nextConfig = {
  transpilePackages: ['@snaproll/ui', '@snaproll/lib', '@snaproll/config', '@snaproll/convex-client'],
  experimental: { typedRoutes: true },
  typescript: {
    // Speed up builds by delegating type checking to a separate Turbo task
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
  },
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
