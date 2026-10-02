/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@duplicate-hunter/core',
    '@duplicate-hunter/config',
    '@duplicate-hunter/similarity',
    '@duplicate-hunter/ai',
    '@duplicate-hunter/github',
    '@duplicate-hunter/database',
  ],
};

export default nextConfig;
