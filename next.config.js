/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  eslint: {
    // Tắt kiểm tra ESLint trong quá trình build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Tắt kiểm tra TypeScript trong quá trình build
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // Suppress the punycode deprecation warning
    config.ignoreWarnings = [
      { module: /node_modules\/punycode/ }
    ];
    return config;
  }
};

module.exports = nextConfig;
