/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.sanity.io' },
      { protocol: 'https', hostname: 'fal.media' },
      { protocol: 'https', hostname: '*.fal.run' },
    ],
  },
};

export default nextConfig;
