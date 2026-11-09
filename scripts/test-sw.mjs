/**
 * Offline test for the generated service worker, without a browser.
 *
 * "Works with no network" is the one thing this game cannot be allowed to lose:
 * it is played on a tablet away from the house, and the real gate is flight mode
 * on that tablet. This harness catches the failures that would waste the trip — a
 * precache list that misses a file, an activate step that deletes the cache it
 * just filled, or a navigation that does not fall back to the stored page.
 *
 * It also holds the two rules the hand-rolled worker replaced a plugin to keep:
 * install must NOT take over by itself (src/ui/updates.ts picks the moment), and
 * the cleanup must leave the sibling games' caches alone (one shared origin).
 *
 * Run: npm run test:sw   (after npm run build)
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import vm from 'node:vm';

const DIST = 'dist';
const ORIGIN = 'http://localhost:4173';

/** This game's caches. Anything not starting with this belongs to another game. */
const PREFIX = 'little-engineer-';
/** An older build of this game: must go. */
const OURS_STALE = `${PREFIX}stale000000`;
/** A sibling game on the same origin: must stay. */
const SIBLING = 'backstop-stale000000';

const failures = [];
const staleRisk = [];
const checks = [];

function check(name, condition, detail = '') {
  checks.push(name);
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

/* ---------------------------------------------------------------- mocks -- */

class MockRequest {
  constructor(url, init = {}) {
    this.url = url;
    this.cache = init.cache;
  }
}

class MockResponse {
  constructor(body, { status = 200, type = 'basic' } = {}) {
    this.body = body;
    this.status = status;
    this.type = type;
  }
  clone() {
    return new MockResponse(this.body, { status: this.status, type: this.type });
  }
  static error() {
    return new MockResponse(null, { status: 0, type: 'error' });
  }
}

class MockCache {
  constructor() {
    this.store = new Map();
  }
  async addAll(urls) {
    for (const entry of urls) {
      const url = typeof entry === 'string' ? entry : entry.url;
      // A precache entry fetched without cache: 'reload' can be answered out of
      // the browser's own HTTP cache, which on GitHub Pages can be ten minutes
      // old — the new worker would then store the previous build's page.
      if (!entry || entry.cache !== 'reload') staleRisk.push(url);
      const path = url === './' ? 'index.html' : url.replace(/^\.\//, '');
      const full = join(DIST, path);
      try {
        statSync(full);
      } catch {
        throw new Error(`precache entry does not exist in dist: ${url}`);
      }
      // vary: the host serves the built files with `Vary: Origin`, and this
      // precache fetch is same-origin, so it sends no Origin header to match on.
      this.store.set(normalize(url), { response: new MockResponse(readFileSync(full)), vary: true });
    }
  }
  async put(request, response) {
    this.store.set(normalize(request.url ?? request), { response, vary: false });
  }
  /**
   * Vary is modelled on purpose, because getting it wrong is invisible until the
   * tablet is in flight mode.
   *
   * Vite marks its module script and stylesheet `crossorigin`, so the browser
   * asks for those two in CORS mode and sends an `Origin` header the precache
   * fetch never sent. Against a response stored with `Vary: Origin`, a lookup
   * that honours Vary therefore misses the two biggest files in the build — the
   * game and its stylesheet — and the app comes up blank with no network. The
   * worker passes ignoreVary; this mock is what proves it still does.
   */
  async match(request, options = {}) {
    const entry = this.store.get(normalize(request.url ?? request));
    if (!entry) return undefined;
    if (entry.vary && !options.ignoreVary) return undefined;
    return entry.response;
  }
  async keys() {
    return [...this.store.keys()].map((url) => ({ url }));
  }
}

function normalize(url) {
  const s = String(url).replace(ORIGIN, '').replace(/^\.\//, '/');
  const path = s.startsWith('/') ? s : `/${s}`;
  return path === '/' ? '/index.html' : path.split('?')[0];
}

class MockCacheStorage {
  constructor() {
    this.caches = new Map();
  }
  async open(name) {
    if (!this.caches.has(name)) this.caches.set(name, new MockCache());
    return this.caches.get(name);
  }
  async keys() {
    return [...this.caches.keys()];
  }
  async delete(name) {
    return this.caches.delete(name);
  }
  async match(request, options) {
    for (const cache of this.caches.values()) {
      const hit = await cache.match(request, options);
      if (hit) return hit;
    }
    return undefined;
  }
}

/* ------------------------------------------------------------------ run -- */

const swSource = readFileSync(join(DIST, 'sw.js'), 'utf8');
const handlers = {};
const cacheStorage = new MockCacheStorage();

// One older build of this game, and one belonging to a sibling game that shares
// the origin.
await cacheStorage.open(OURS_STALE);
await cacheStorage.open(SIBLING);

let online = true;
let skipWaitingCalls = 0;
let claimed = false;

const sandbox = {
  self: {
    addEventListener: (type, fn) => {
      handlers[type] = fn;
    },
    skipWaiting: async () => {
      skipWaitingCalls += 1;
    },
    clients: {
      claim: async () => {
        claimed = true;
      },
    },
    location: { origin: ORIGIN },
  },
  caches: cacheStorage,
  fetch: async () => {
    if (!online) throw new Error('offline');
    return Object.assign(new MockResponse('network'), { ok: true });
  },
  Response: MockResponse,
  Request: MockRequest,
  setTimeout,
  URL,
  console,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(swSource, sandbox);

check(
  'registers install, activate, message and fetch handlers',
  !!handlers.install && !!handlers.activate && !!handlers.message && !!handlers.fetch,
);

/* --- install --- */

let installPromise;
await handlers.install({ waitUntil: (p) => { installPromise = p; } });
try {
  await installPromise;
  check('install precaches without error', true);
} catch (e) {
  check('install precaches without error', false, e.message);
}

check(
  'install fetches fresh copies, not the browser HTTP cache',
  staleRisk.length === 0,
  staleRisk.slice(0, 3).join(','),
);

// The whole update policy rests on this: a new build installs and then waits, so
// src/ui/updates.ts can apply it at a moment that is not mid-journey.
check('install does not take over by itself', skipWaitingCalls === 0, `skipWaiting called ${skipWaitingCalls}x`);

// Every built file must be in the cache.
const built = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else built.push(relative(DIST, full).split(sep).join('/'));
  }
})(DIST);

const named = await cacheStorage.keys();
const cacheName = named.find((k) => k.startsWith(PREFIX) && k !== OURS_STALE);
check('the new cache is named for this game', !!cacheName, named.join(','));
const cache = await cacheStorage.open(cacheName);
const cachedPaths = new Set((await cache.keys()).map((r) => r.url));

for (const file of built) {
  if (file === 'sw.js') continue;
  check(`precached ${file}`, cachedPaths.has(normalize(`./${file}`)), 'missing from precache');
}
check('precached the start url itself', cachedPaths.has('/index.html'));

/* --- activate --- */

let activatePromise;
await handlers.activate({ waitUntil: (p) => { activatePromise = p; } });
await activatePromise;
const remaining = await cacheStorage.keys();
check("activate drops this game's stale cache", !remaining.includes(OURS_STALE), remaining.join(','));
check('activate keeps the current cache', remaining.includes(cacheName));
// Every game in the series is published to one origin and CacheStorage is per
// origin, not per scope, so a cleanup that deleted everything but its own would
// take the sibling games' offline copies with it.
check("activate leaves a sibling game's cache alone", remaining.includes(SIBLING), remaining.join(','));
check('activate claims the page that is already open', claimed);

/* --- the waiting worker takes over when asked, and only then --- */

await handlers.message({ data: { type: 'SKIP_WAITING' } });
check('a SKIP_WAITING message activates the waiting worker', skipWaitingCalls === 1, `called ${skipWaitingCalls}x`);
await handlers.message({ data: { type: 'SOMETHING_ELSE' } });
check('any other message is ignored', skipWaitingCalls === 1, `called ${skipWaitingCalls}x`);

/* --- fetch, online: opening the game must get the live page --- */

async function respond(request) {
  let result;
  await handlers.fetch({ request, respondWith: (p) => { result = p; } });
  return result;
}

const live = await respond({ url: `${ORIGIN}/`, method: 'GET', mode: 'navigate' });
check('online navigation loads the live page, not the stored one', live && live.body === 'network');

/* --- fetch, with the network pulled --- */

online = false;

const shell = await respond({ url: `${ORIGIN}/`, method: 'GET', mode: 'navigate' });
check('offline navigation serves the cached shell', shell && shell.status === 200);

const bundle = built.find((f) => f.startsWith('assets/') && f.endsWith('.js'));
const asset = await respond({ url: `${ORIGIN}/${bundle}`, method: 'GET', mode: 'cors' });
check('offline asset request serves the cached bundle', asset && asset.status === 200, bundle);

const icon = await respond({ url: `${ORIGIN}/icons/icon-192.png`, method: 'GET', mode: 'no-cors' });
check('offline icon request is served from cache', icon && icon.status === 200);

const face = await respond({
  url: `${ORIGIN}/assets/engines/thomas/face.png`,
  method: 'GET',
  mode: 'no-cors',
});
check('offline engine texture is served from cache', face && face.status === 200);

const manifest = await respond({ url: `${ORIGIN}/manifest.webmanifest`, method: 'GET', mode: 'cors' });
check('offline manifest request is served from cache', manifest && manifest.status === 200);

const deepLink = await respond({
  url: `${ORIGIN}/index.html?from=homescreen`,
  method: 'GET',
  mode: 'navigate',
});
check('offline launch with a query string still resolves', deepLink && deepLink.status === 200);

/* --------------------------------------------------------------- report -- */

console.log(`\nservice worker offline test — ${checks.length} checks`);
if (failures.length === 0) {
  console.log('PASS: the build serves itself with no network.\n');
  process.exit(0);
}
console.error(`FAIL: ${failures.length} problem(s)`);
for (const f of failures) console.error(`  - ${f}`);
process.exit(1);
