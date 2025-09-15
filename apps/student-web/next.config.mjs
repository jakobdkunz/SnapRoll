const nextConfig = {
  transpilePackages: ['@flamelink/ui', '@flamelink/lib', '@flamelink/config', '@flamelink/convex-client'],
  experimental: { typedRoutes: true },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.ufs.sh' },
    ],
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
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/_next/static/:path*',
          headers: [
            { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
            { key: 'Pragma', value: 'no-cache' },
            { key: 'Expires', value: '0' },
          ],
        },
      ];
    }
    // Production security headers
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://*.clerk.com https://*.clerk.dev https://*.clerk.accounts.dev https://*.convex.cloud https://*.vercel-insights.com https://cdnjs.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' https: data: blob:",
      "font-src 'self'",
      "connect-src 'self' https://*.clerk.com https://*.clerk.dev https://*.clerk.accounts.dev https://clerk-telemetry.com https://*.convex.cloud wss://*.convex.cloud https://blob.vercel-storage.com https://*.blob.vercel-storage.com",
      "worker-src 'self' blob: https://cdnjs.cloudflare.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
        ],
      },
    ];
  },
};
export default nextConfig;
