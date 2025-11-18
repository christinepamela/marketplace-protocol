/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      // ADDED: Allow example.com for test product images
      {
        protocol: 'https',
        hostname: 'example.com',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  // Optimize production builds
  swcMinify: true,
}

module.exports = nextConfig