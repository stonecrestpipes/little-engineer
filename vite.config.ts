import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string };

// Nothing in this game loads from anywhere but itself: the audio is
// synthesised in WebAudio, the only texture is a local png, and the fonts are
// whatever the tablet already has. So the policy can be as narrow as policies
// get, and anything that tries to reach out is a bug or an intrusion.
//
// It rides in a meta tag because GitHub Pages cannot set response headers, and
// it is injected at build time only: Vite's dev server needs inline styles for
// its error overlay, and a policy that broke `npm run dev` would just get
// deleted within the week. `frame-ancestors` is deliberately absent — browsers
// ignore it in a meta tag, so it would be console noise pretending to be
// protection.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

const contentSecurityPolicy: Plugin = {
  name: 'little-engineer:csp',
  apply: 'build',
  transformIndexHtml(html) {
    return html.replace(
      '<meta charset="utf-8">',
      `<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">`,
    );
  },
};

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
  server: {
    // Bound to every interface on purpose: this is how the tablet reaches the
    // dev server over the house Wi-Fi. What makes that safe rather than
    // careless is Vite's host checking — `allowedHosts` is left at its default
    // empty list, which still permits localhost and any bare IP (so the tablet
    // works) while refusing a request that arrives under some other hostname.
    // That is what stops a page elsewhere on the network from pointing a name
    // it controls at this machine and reading the source. Do not add entries
    // here to "fix" an access problem: the default is stricter than any list
    // worth writing, and reaching the server by its IP needs no entry at all.
    host: true,
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },
  build: { target: 'es2022', assetsInlineLimit: 0 },
  plugins: [
    contentSecurityPolicy,
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
        // Take charge of pages that are already open as soon as a worker
        // activates. Without it, the page that *installed* the worker is
        // never controlled by one, so the `controllerchange` that is supposed
        // to reload the app into a new build never fires for it — the update
        // activates and the page sits there on the old build regardless.
        // `skipWaiting` stays off: src/ui/updates.ts decides the moment.
        clientsClaim: true,
      },
    }),
  ],
});
