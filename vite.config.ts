import path from 'path';
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import { execSync } from 'child_process';

function resolveRelease(): string {
  const explicit = process.env['RELEASE_SHA'] ?? process.env['VERCEL_GIT_COMMIT_SHA'];
  if (explicit) return explicit.slice(0, 12);
  try {
    return execSync('git rev-parse --short=12 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

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
  define: {
    __CAKE_RELEASE__: JSON.stringify(resolveRelease()),
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
          // Split the Angular framework so /auth doesn't drag forms +
          // platform-browser-dynamic into a route that never uses them.
          if (id.includes('@angular/forms')) return 'ng-forms';
          if (id.includes('@angular/router')) return 'ng-router';
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
