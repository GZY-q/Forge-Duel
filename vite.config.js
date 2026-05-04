import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: './index.html',
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) {
            return 'phaser';
          }
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': 'http://localhost:8080',
      '/socket.io': {
        target: 'http://localhost:8080',
        ws: true
      }
    }
  }
});
