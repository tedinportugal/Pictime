import type { NextConfig } from 'next';

const config: NextConfig = {
  serverExternalPackages: ['sharp', '@electric-sql/pglite'],
};

export default config;
