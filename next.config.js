/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "tfbu48jq5.hd-bkt.clouddn.com" },
      { protocol: "https", hostname: "**.clouddn.com" },
      { protocol: "https", hostname: "**.qiniucdn.com" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
};

module.exports = nextConfig;
