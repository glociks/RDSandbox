import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless',
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('mp4-muxer')) return 'vendor-media';
              if (id.includes('recharts')) return 'vendor-recharts';
              if (id.includes('react')) return 'vendor-react';
            }
            if (id.includes('/presets/')) {
              return 'simulation-presets';
            }
          }
        }
      },
      sourcemap: mode === 'development',
      chunkSizeWarningLimit: 700,
    }
  };
});
