const nextConfig = {
  transpilePackages: ['@snaproll/ui', '@snaproll/lib', '@snaproll/config', '@snaproll/convex-client'],
  experimental: { typedRoutes: true, serverMinification: false },
  // Mitigate occasional jest-worker crashes on Vercel
  // See: https://github.com/vercel/next.js/issues/48089
  swcMinify: true,
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
