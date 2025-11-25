import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['@productiongrade/passkeys/react', '@simplewebauthn/browser'],
    esbuildOptions: {
      // Handle CommonJS modules
      mainFields: ['module', 'main'],
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@simplewebauthn/browser': '@simplewebauthn/browser',
    },
  },
  build: {
    commonjsOptions: {
      include: [/@productiongrade\/passkeys/, /node_modules/],
      transformMixedEsModules: true,
    },
  },
});

