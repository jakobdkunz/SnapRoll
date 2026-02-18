const distDir = process.env.NEXT_DIST_DIR || '.next';

const nextConfig = {
  distDir,
  transpilePackages: ['@flamelink/ui', '@flamelink/config'],
  experimental: { typedRoutes: true },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.ufs.sh' }],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  poweredByHeader: false,
};

export default nextConfig;
