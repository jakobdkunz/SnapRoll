const nextConfig = {
  transpilePackages: ['@snaproll/lib'],
  experimental: { typedRoutes: true },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};
export default nextConfig;
