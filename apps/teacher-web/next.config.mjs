const nextConfig = {
  transpilePackages: ['@snaproll/ui', '@snaproll/lib', '@snaproll/config', '@snaproll/convex-client'],
  experimental: { typedRoutes: true },
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
};
export default nextConfig;
