const nextConfig = {
  transpilePackages: ['@snaproll/ui', '@snaproll/lib', '@snaproll/config', '@snaproll/api-client'],
  experimental: { typedRoutes: true },
  // Ensure static files are served correctly
  assetPrefix: '',
  trailingSlash: false,
  // Fix static file serving issues
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  // Force static file serving
  async headers() {
    return [
      {
        source: '/_next/static/chunks/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
export default nextConfig;
