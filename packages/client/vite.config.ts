import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@zyra/shared': resolve(__dirname, '../shared/src')
    }
  },
  server: {
    hmr: {
      overlay: false
    },
    port: 3000,
    strictPort: true
    
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
});