const distDir = process.env.NEXT_DIST_DIR || '.next';

const nextConfig = {
  distDir,
  transpilePackages: ['@flamelink/ui', '@flamelink/lib', '@flamelink/config', '@flamelink/convex-client'],
  experimental: { typedRoutes: true, serverMinification: false },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.ufs.sh' },
    ],
  },
  // Mitigate occasional jest-worker crashes on Vercel
  // See: https://github.com/vercel/next.js/issues/48089
  swcMinify: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_DEV_MODE: process.env.NEXT_PUBLIC_DEV_MODE,
    NEXT_PUBLIC_ENABLE_BIBLE_ACTIVITY: process.env.NEXT_PUBLIC_ENABLE_BIBLE_ACTIVITY,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // Handle canvas module for PDF.js
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
        os: false,
      };
      
      // Exclude canvas from being processed
      config.externals = config.externals || [];
      config.externals.push('canvas');
    }
    return config;
  },
  async headers() {
    if (process.env.NODE_ENV !== 'production') return [];
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://*.clerk.com https://*.clerk.dev https://*.clerk.accounts.dev https://*.convex.cloud https://*.vercel-insights.com https://cdnjs.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      // Allow images from blob storage and https
      "img-src 'self' https: data: blob:",
      "font-src 'self'",
      // Allow connections to Convex and Vercel Blob API domains (including public bucket subdomains)
      "connect-src 'self' https://*.clerk.com https://*.clerk.dev https://*.clerk.accounts.dev https://clerk-telemetry.com https://*.convex.cloud wss://*.convex.cloud https://blob.vercel-storage.com https://*.blob.vercel-storage.com",
      "worker-src 'self' blob: https://cdnjs.cloudflare.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      // Allow form posts to our origin (for FormData uploads to Next routes)
      "form-action 'self'",
    ].join('; ');
    return [
      // Long cache for static vendor assets in public/vendor
      {
        source: '/vendor/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
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
