const nextConfig = {
  transpilePackages: ['@snaproll/lib'],
  experimental: { typedRoutes: true },
  server: {
    hostname: '0.0.0.0',
    port: 3002,
  },
};
export default nextConfig;
