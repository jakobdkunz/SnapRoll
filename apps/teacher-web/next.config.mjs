const nextConfig = {
  transpilePackages: ['@snaproll/ui', '@snaproll/lib', '@snaproll/config', '@snaproll/api-client'],
  experimental: { typedRoutes: true },
  server: {
    hostname: '0.0.0.0',
    port: 3000,
  },
};
export default nextConfig;
