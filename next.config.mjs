/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.externals = [...(Array.isArray(config.externals) ? config.externals : []), 'sharp'];
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.sanity.io' },
      { protocol: 'https', hostname: 'fal.media' },
      { protocol: 'https', hostname: '*.fal.run' },
    ],
  },
};

export default nextConfig;
