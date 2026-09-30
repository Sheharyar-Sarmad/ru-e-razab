// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    qualities: [75, 80, 90, 95, 100],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
