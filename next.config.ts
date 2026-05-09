import path from 'node:path';
import fs from 'node:fs';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Configurar alias para Pyodide
      config.resolve.alias = {
        ...config.resolve.alias,
        'pyodide': path.resolve(__dirname, 'node_modules/pyodide'),
      };
    }
    return config;
  },
};

export default nextConfig;
