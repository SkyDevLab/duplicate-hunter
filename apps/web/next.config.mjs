import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      '@duplicate-hunter/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@duplicate-hunter/config': path.resolve(__dirname, '../../packages/config/src/index.ts'),
      '@duplicate-hunter/similarity': path.resolve(__dirname, '../../packages/similarity/src/index.ts'),
      '@duplicate-hunter/ai': path.resolve(__dirname, '../../packages/ai/src/index.ts'),
      '@duplicate-hunter/github': path.resolve(__dirname, '../../packages/github/src/index.ts'),
      '@duplicate-hunter/database': path.resolve(__dirname, '../../packages/database/src/index.ts'),
    };
    return config;
  },
};

export default nextConfig;
