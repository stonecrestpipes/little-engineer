# Little Engineer

A calm, offline train game for a four-year-old. Four buttons, one loop, nothing
can go wrong. See [GAME_DESIGN.md](GAME_DESIGN.md) for the settled design and
`Little Engineer - Game Plan.pdf` for the full phased plan.

**Live:** https://stonecrestpipes.github.io/little-engineer/
**Repo:** `stonecrestpipes/little-engineer` (public — see *Hosting* below)

---

## Where this is up to

**Phase 1 is built and deployed. It has not been play-tested.** That is the
whole gate: Phase 1 is finished when he picks up the tablet and plays without
being told how. Nothing after it should be built until that has happened,
because the point of the phase is to find out whether the interaction is worth
building on.

### The next thing to do

1. Install it on the Pixel Tablet (see *Putting it on the Pixel Tablet*).
2. Hand it to him. Say nothing.
3. Watch what he does — especially whether he finds GO unprompted, whether he
   whistles more than he drives, and whether he ever looks for something the
   game does not do.

### Decide after watching, not before

- **Cruise speed** is `7.2` m/s in `src/content/engines/thomas.ts` — about a
  minute a lap. A guess, and the first number likely to want changing.
- **The nameplate is blank** (`nameplate: ''` in the same file). It is meant to
  carry whatever he decides to call the engine, and is the only text anywhere
  in the game.
- **Whether the station reaction is enough.** Right now: lamp lights, flag goes
  up, passengers bob, chime plays. Phase 3 is where that gets properly built
  out — but only if arriving turns out to be the thing he likes most.

### Known-good, do not re-litigate

The settled design decisions are in [GAME_DESIGN.md](GAME_DESIGN.md) with the
reasoning. The ones most likely to be second-guessed, and why they are already
answered: no speed slider (he does not chase speed), no failure states at all,
no speech, landscape only, and four buttons with nothing else on screen.

### Not in the repo

`assets/` (third-party reference imagery) and `Claude outputs/` are
deliberately git-ignored — local working material only. The one asset the game
actually needs is committed at `public/assets/engines/thomas/face.png`. If you
clone this fresh onto another machine, the reference folder will not come with
it. See `assets/engines/thomas/curated/NOTES.md` locally for which reference
files are usable; several scraped ones contain the wrong subject entirely.

---

## Running it

```bash
npm install
npm run dev
```

Then open the URL it prints. `npm run dev` binds to the network, so the address
it shows on your LAN can be opened on the tablet directly.

```bash
npm run build     # typecheck + production build into dist/
npm run preview   # serve dist/ to check the real build
```

## Putting it on the Pixel Tablet

Installing to the home screen needs an **HTTPS** address — the service worker
will not register over plain HTTP (except on `localhost`). So:

1. Deploy `dist/` to any static host.
2. Open the URL on the tablet in Chrome.
3. Menu → *Add to home screen*.
4. After that it runs fullscreen and works in flight mode.

Deploying into a subfolder (a GitHub Pages project site, say) needs the base
path set, or every asset 404s:

```bash
BASE_PATH=/little-engineer/ npm run build
```

Over the LAN without HTTPS the game still runs, but it opens in a browser tab
with an address bar and will not work offline — which weakens the Phase 1 test,
since "can he start it himself?" is part of what is being measured.

---

## Shipping an update

```bash
git push
```

That is it. The Actions workflow rebuilds and redeploys, and the installed app
picks it up **the next time he opens it** — one launch, not two.

Getting that took some care, because the default behaviour is worse than it
looks. `registerSW.js` as generated registers once on page load and never
checks again, so a pushed update only appears on the launch *after* the one
that happened to download it — and an app left in the background may not check
for days.

`src/ui/updates.ts` replaces that with:

- an explicit update check on launch, whenever the app is brought back to the
  front, and every 15 minutes during a long session;
- the new version applied **only at a safe moment** — before he has touched
  anything, or once the app is hidden. It never reloads mid-journey.

So the sequence is: you push, he opens the app, it notices, swaps and reloads
before he has pressed anything. From his side it simply is the new version.

`registerType` is `'prompt'` in `vite.config.ts`, which sounds wrong but is
right: it stops the new worker activating itself mid-play, leaving `updates.ts`
to choose the moment. Nobody is ever prompted.

## Hosting

The repo is **public**, so the site is too. That was a deliberate trade to get
it installed quickly, not the end state — the build has third-party character
imagery in it (the face texture and the app icons) and this is a private family
project.

What is in place: `public/robots.txt` disallows all crawlers and `index.html`
carries `noindex, nofollow, noarchive`, so it stays out of search results.
What is not: the repo is listed on the GitHub profile, and anyone with the URL
can open it.

Tightening it later, best option first:

1. **Swap in original artwork.** `src/content/engines/thomas.ts` plus one PNG.
   The content layer was built for exactly this, and it makes the public URL a
   non-issue rather than a managed risk.
2. **Private repo + Pages**, which needs GitHub Pro or above.
3. **Drop hosting**, install from a throwaway `cloudflared` tunnel and let the
   app run offline from cache.

⚠️ Do not rename the repo or flip it private without planning for it: the
installed app's `start_url` points at the current URL, and changing it means
reinstalling on the tablet.

## How it is put together

```
src/
  engine/     reusable, knows nothing about Thomas or any particular railway
    track.ts      closed spline; everything is addressed by metres travelled
    train.ts      GO/STOP, speed curves, the platform glide path
    cameras.ts    three fixed views on one button
    audio.ts      every sound, synthesised — nothing is loaded
  content/    data: this engine, this railway
    engines/thomas.ts   colours, dimensions, driving feel, whistle pitch
    buildEngine.ts      the mesh, built from boxes and cylinders
    world.ts            the loop, the station, the scenery
  ui/         the four buttons
```

Nothing in `engine/` imports anything from `content/`. That is the separation
that makes Phases 5 and 6 cheap.

### Adding an engine (Phase 6)

Copy `src/content/engines/thomas.ts`, change the colours, `whistleHz`, `cruise`
and the face texture path. `buildEngine` and the whole of `src/engine/` are
unchanged.

### Adding track (Phase 5)

`buildWorld` builds a `Track` from a list of points and returns the stops and
camera anchors. A second route is another list of points and another set of
stops; the train controller does not change.

---

## Decisions worth knowing before you edit

**All audio is synthesised** (`src/engine/audio.ts`). The whistle is two
near-unison sawtooths plus breath noise, with a pitch swell in and a sag out —
that sag is most of what makes it sound like steam rather than a car horn.
Retune it with `whistleHz` in the engine spec. No files, no licensing, and it
cannot become a 2 MB download.

**Pressing STOP means "arrive at the platform", not "brake here."** Within
`stopWindow` (30 m) the engine follows a glide path `v(s) = v₀·√(s/s₀)` — constant
deceleration spread over the whole remaining distance. It starts slowing within
a fraction of a second so the button visibly does something, and lands exactly
on the mark every time. Outside that window STOP just brakes normally.

**The engine never drives itself.** STOP while standing still does nothing; it
will not creep to a platform on its own.

**Buttons fire on `pointerdown`, not `click`.** A four-year-old's press drifts,
and waiting for a matching pointerup feels broken. There is a `click` fallback
for assistive tech and for environments that do not emit pointer events.

**Landscape only.** Rotating the tablet changes nothing.

---

## Artwork

The engine is geometry built in code — boxes, cylinders and discs — with one
photographic texture mapped onto the face disc.

Reference lives in `assets/engines/`, which is **not** bundled. The runtime copy
is `public/assets/engines/thomas/face.png`. See
`assets/engines/thomas/curated/NOTES.md` for which reference files are actually
usable; several of the scraped ones contain the wrong subject entirely.

Thomas & Friends characters are third-party property. Everything in `src/` is
generic: the engine layer never names a character, and swapping the texture and
the colours in the engine spec gives an entirely different, original engine.

---

## Testing the driving without waiting

In development, `window.LE` exposes `{ train, rig, world, audio, spec }`. The
train can be stepped directly, which is how the glide path was verified:

```js
const { train, world } = window.LE;
const stopAt = world.stops[0].at;
train.go();
train.distance = world.track.wrap(stopAt - 120);
train.speed = 0;
train.go();
const dt = 1 / 60;
let t = 0;
while (t < 60 && !train.atStop) {
  if (world.track.ahead(train.distance, stopAt) <= 20) train.stop();
  train.update(dt);
  t += dt;
}
Math.abs(world.track.delta(train.distance, stopAt)); // → 0
```

The hook is stripped from production builds.
