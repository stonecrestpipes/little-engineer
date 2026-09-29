import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string };

// Deploying into a subfolder (GitHub Pages project sites) needs a base path.
// Set BASE_PATH=/little-engineer/ at build time; defaults to root.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  // Shown in the corner of the screen and at the foot of the grown-ups'
  // panel, so you can tell at a glance whether the tablet has picked up the
  // latest push without having to remember what the last one looked like.
  define: {
    __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
    __VERSION__: JSON.stringify(version),
  },
  server: { host: true, port: process.env.PORT ? Number(process.env.PORT) : undefined },
  build: { target: 'es2022', assetsInlineLimit: 0 },
  plugins: [
    VitePWA({
      // 'prompt' does not prompt anyone here — it just stops the new worker
      // activating itself mid-play. src/ui/updates.ts decides the moment.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['assets/**/*'],
      manifest: {
        name: 'Little Engineer',
        short_name: 'Engineer',
        description: 'A calm train game.',
        start_url: base,
        scope: base,
        // No status bar over the sky. Falls back to standalone where
        // fullscreen is not supported.
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'landscape',
        background_color: '#CDEAF2',
        theme_color: '#2F7FC9',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,webp,svg,woff2}'],
        cleanupOutdatedCaches: true,
        // Without this, opening the installed app with no network fails:
        // the navigation request misses the cache and there is nothing to
        // fall back to. This is what makes flight mode work.
        navigateFallback: 'index.html',
      },
    }),
  ],
});
