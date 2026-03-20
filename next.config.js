/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    forceSwcTransforms: true,
  },
  swcMinify: true,
  turbopack: {},
  webpack: (config, { isServer }) => {
    config.ignoreWarnings = [
      { module: /node_modules\/punycode/ }
    ];
    return config;
  },
  output: 'standalone',
  poweredByHeader: false
};

module.exports = nextConfig;
