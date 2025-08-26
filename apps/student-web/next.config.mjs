const nextConfig = {
  transpilePackages: ['@snaproll/ui', '@snaproll/lib', '@snaproll/config', '@snaproll/api-client'],
  experimental: { typedRoutes: true },
  // Force static file serving in development
  async rewrites() {
    return [
      {
        source: '/_next/static/chunks/:path*',
        destination: '/_next/static/chunks/:path*',
      },
    ];
  },
};
export default nextConfig;
