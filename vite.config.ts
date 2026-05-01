import path from 'path';
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

/**
 * Vite configuration for CakeNews.
 *
 * Highlights:
 *  - `manualChunks` splits the bundle so the user gets a small first
 *    paint then loads admin / messaging / feed code only when needed.
 *  - `target: es2022` matches the runtime expectations declared in
 *    `tsconfig.json`, keeping output minimal.
 *  - No magic globals; environment is read by services through
 *    `import.meta.env`.
 */
export default defineConfig(() => ({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [angular()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  build: {
    target: 'es2022',
    cssMinify: true,
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@angular')) return 'ng';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('lucide-angular')) return 'icons';
          if (id.includes('rxjs') || id.includes('zone.js')) return 'rt';
          return 'vendor';
        },
      },
    },
  },
}));
