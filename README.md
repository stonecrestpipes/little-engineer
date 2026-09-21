# Little Engineer

A calm, offline train game for a four-year-old. One lever, one railway, nothing
to do but drive and look. See [GAME_DESIGN.md](GAME_DESIGN.md) for the settled
design and `Little Engineer - Game Plan.pdf` for the full phased plan.

**Live:** https://stonecrestpipes.github.io/little-engineer/
**Repo:** `stonecrestpipes/little-engineer` (public — see *Hosting* below)

---

## Where this is up to

**Phase 1 passed.** He picked the tablet up, found the lever and drove, with
nothing said to him. That was the only gate that mattered, and it is behind us.

**Phases 3, 5, 6, 8 and 10 are built and deployed, and none of them has been
played yet.** The railway is a 642-metre circuit — The Sheds, the level
crossing, The Farm, the tunnel, the bridge and The Harbour — about a minute and
forty a lap at the top of the lever. After The Farm, two big arrows let him
choose between the tunnel and a branch line round the hill to The Windmill.
There are four engines and five cars, and he picks his train by walking up to
it: the spares stand in the yard at The Sheds, and tapping one takes it. A
hidden grown-ups' panel (below) tunes it on the tablet.

### The next thing to do

1. Open it on the tablet. It updates itself on the next launch.
2. Hand it to him. Say nothing, again.
3. Watch what he does with a place that is six times the size — especially
   whether he goes looking for things, whether he stops at all three stations
   or only at one, whether the tunnel is exciting or alarming, and whether he
   notices the sheep.
4. Watch whether he finds the yard on his own. Nothing points at it: the other
   engines are simply standing there, bobbing gently, whenever he is stopped at
   home. If he never touches one, that is worth knowing before anything else is
   built on top of it.
5. Watch the arrows after The Farm. Does he notice them, does he pick the
   windmill on purpose, and does he go back to it? If he ignores them, the
   train simply carries on through the tunnel as before. They can be switched
   off in the grown-ups' panel.

**Check the frame rate on the actual tablet.** The game measures it for you:
on *Auto* it turns shadows down if it cannot hold about 46 fps, and the footer
of the grown-ups' panel says which tier it settled on (*Full detail*,
*Shadows reduced* or *Shadows off*). If it lands on *Shadows off*, the next
thing to try is thinning the trees in `src/content/world.ts`.

### Decide after watching, not before

- **How the lever feels** is five numbers in `src/content/engines/thomas.ts`:
  `cruise` 7.2 m/s at the top, `slow` 2.8 m/s at the bottom of the green,
  `coast` 1.15 m/s² when he lets go (about six seconds to a halt), `brake` 3.4
  when he pulls down, and `accel` 2.6. All guesses until he drives it, and the
  first numbers likely to want changing. The grown-ups' panel scales top speed
  and the stopping window on the tablet without touching these.
- **The greeting** is a sentence in `src/content/greeting.ts`, and the name in
  it is set in the grown-ups' panel.
- **The nameplates are blank** until a name is typed into the grown-ups' panel.
  They are meant to carry whatever he decides to call each engine, and are the
  only text anywhere in the game.
- **Whether the station reaction is enough.** Right now: lamp lights, flag goes
  up, passengers bob, chime plays. Phase 3 is where that gets properly built
  out — but only if arriving turns out to be the thing he likes most.

### Known-good, do not re-litigate

The settled design decisions are in [GAME_DESIGN.md](GAME_DESIGN.md) with the
reasoning. The ones most likely to be second-guessed, and why they are already
answered: **no objectives of any kind** — no errands, no collecting, no prizes
over the view, because being handed jobs is exactly what he disliked in the
game this control came from; no failure states at all; no speech beyond the
hello; landscape only; and three things on screen and nothing else.

### Not in the repo

`assets/` (third-party reference imagery) and `Claude outputs/` are
deliberately git-ignored — local working material only. The one asset the game
actually needs is committed at `public/assets/engines/thomas/face.png`. If you
clone this fresh onto another machine, the reference folder will not come with
it. See `assets/engines/thomas/curated/NOTES.md` locally for which reference
files are usable; several scraped ones contain the wrong subject entirely.

---

## The grown-ups' panel

Hold the **top-right corner of the screen for three seconds**. A faint ring
starts to fill after a second. At the top is a scrapbook of how he plays —
days, distance, whistles, where he stops, what he drives, which way he goes
at the points — which he never sees. Below that: his name for the hello,
speed, how much help he gets stopping, volume, evenings, the branch line,
the blue engine's face, nameplates for each engine, picture quality, and
resets. Changes take effect immediately. The build time at the bottom tells
you whether the tablet has the latest push.

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

1. **Swap in original artwork.** This is now mostly done. The blue engine has
   an original drawn face (`originalFace` in `src/content/engines/thomas.ts`),
   and the grown-ups' panel switches between *Familiar* and *Original*.
   Original app icons drawn from the same face are in `artwork/icons/`. Once
   he is happy with the new face, retiring the third-party imagery is:
   - copy `artwork/icons/*.png` over `public/icons/`
   - delete `public/assets/engines/thomas/face.png` and the `faceTexture` line
   - make `originalFace` the only face (`face:` rather than `originalFace:`)

   After that the public URL is a non-issue rather than a managed risk.
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
    track.ts      segments, how they join, and the route driven through them
    train.ts      the lever, speed curves, the platform glide path
    cameras.ts    three fixed views on one button
    junction.ts   two whole loops seen as one track, and the points between them
    audio.ts      every sound, synthesised — nothing is loaded
    sky.ts        day, a golden evening and dusk, and back
    quality.ts    steps shadows and resolution down if frames are slow
  content/    data: this engine, this railway
    engines/thomas.ts   colours, dimensions, driving feel, whistle pitch
    buildEngine.ts      the mesh, built from boxes and cylinders
    world.ts            the segments, the terrain, and what stands where
    terrain.ts          the heightmap ground, and the water under it
    scenery.ts          rails, ballast, trees, fences, people
    greeting.ts         the one spoken line
    faces.ts            engine faces, painted onto a canvas from numbers
    flock.ts            the birds that go up when he whistles
    cars.ts             coaches, wagons and the brake van
    roster.ts           every engine and car, and which he is driving
    engines/            one file per engine, plus the spec they share
    places/             one file each, geometry and behaviour together
      place.ts            what a place is, and the frame it is built in
      station.ts          the part all three stations share
      sheds.ts  crossing.ts  farm.ts  tunnel.ts  bridge.ts  harbour.ts
      windmill.ts         out on the branch line
  settings.ts the grown-ups' settings, and how they adjust each engine
  journal.ts  the scrapbook: what he did, for the grown-ups only
  ui/         the lever, the whistle, the camera
    controls.ts   the lever drag, and the two buttons
    parents.ts    the hidden grown-ups' panel
    points.ts     the two arrows at the junction
    wakelock.ts   keeps the screen on while he is playing
    greeting.ts   speaking the hello, and coping when the device will not
```

### Adding a place

Write a file in `src/content/places/` exporting a function that takes a
`PlaceContext` and returns a `Place`: a group to add to the scene, optionally a
`stop`, and any of `arrive`, `depart`, `whistle` and `update`. Then add one line
to the list in `world.ts`. Places cannot reach each other and nothing reaches
into them; the world hands each one the engine's position every frame and passes
on the whistle, and that is the whole contract.

Build in the place's own frame — `frameAt(track, at)` gives a group sitting on
the rails facing along them, where **+z is the direction of travel and +x is the
right-hand side of the train**. A place built that way can be moved anywhere on
the railway and still faces the right way.

Nothing in `engine/` imports anything from `content/`. That is the separation
that makes Phases 5 and 6 cheap.

### Adding an engine

Copy one of the files in `src/content/engines/` — `pip.ts` is the shortest —
change the colours, the `face` numbers, `whistleHz`, the driving spec and the
chimney in `shape`, and add it to the list in `engines/index.ts`. `buildEngine`
and the whole of `src/engine/` are unchanged, and there is no artwork to make:
the face is drawn from those numbers by `src/content/faces.ts`.

Engines after the first one must be **original work**. The first one's face is a
photograph and is the only third-party image left in the build; every engine
added since is drawn, which is what will eventually make the public URL a
non-issue rather than a managed risk.

### Adding a car

Add an entry to `CARS` in `src/content/cars.ts`. If it is a shape that is not
there yet, add a case to the `switch` in `buildCar`. Nothing else changes — the
yard picks up however many cars there are, and the consist works out the
spacing from `length`.

Cars are decoration and must stay that way. There is no cargo, nobody wants to
get anywhere, and nothing about the railway changes depending on what is
coupled up. Fetching and delivering is exactly what he disliked in the game the
lever came from.

### Adding track

Track is named segments in `SEGMENTS` at the top of `src/content/world.ts`,
joined into whole loops. The branch is a second loop, identical to the main
one up to the points, and `src/engine/junction.ts` switches between them only
while the engine is short of the points. A place on the branch is built
against the branch loop, and the world converts distances between the two, so
a place never has to know which line the engine is on. Another branch
means another loop that shares everything up to its own points.

---

## Decisions worth knowing before you edit

**All audio is synthesised** (`src/engine/audio.ts`). The whistle is two
near-unison sawtooths plus breath noise, with a pitch swell in and a sag out —
that sag is most of what makes it sound like steam rather than a car horn.
Retune it with `whistleHz` in the engine spec. No files, no licensing, and it
cannot become a 2 MB download.

**The lever never latches.** Let go and it springs back to the middle and the
engine eases down on its own. This is the single most important thing about it:
a control that stays where it was put is a control he can forget about, and an
engine still running because of a lever nobody is holding is the game driving
rather than him.

**Letting go and stopping are deliberately different.** Released, the engine
rolls about 20 m over 6 s. Pulled down, about 8 m over 2 s. Two separate
deceleration rates (`coast` and `brake`), and the gap between them is what makes
the middle of the lever mean something.

**Pulling down near a platform means "arrive there", not "brake here."** Within
`stopWindow` (30 m) the engine follows a glide path `v(s) = v₀·√(s/s₀)` — constant
deceleration spread over the whole remaining distance. It starts slowing within
a fraction of a second so the lever visibly does something, and lands exactly on
the mark every time. Verified from 28 m down to 1 m. Outside that window it
simply brakes.

**The engine never drives itself.** Pulling down while standing still does
nothing; it will not creep to a platform on its own. An arrival already under
way survives him letting go back to the middle, because that only ever slows the
engine — it never sets it moving.

**The rails are a network, and the route is one way round it.** `track.ts` holds
named `Segment`s joined end to end in a `Network`; a `Route` assembles some of
them into the thing the train drives, addressed in metres exactly as the single
closed curve used to be. Nothing above it knows the difference. A branch line is
a segment joined onto an end that already has one.

**The ground is a heightmap, and there is one sheet of water under the whole
map.** Water shows wherever the land has been dug below it, which is what gives
the pond, the river and the coastline. The ground is pulled flat along a
corridor either side of the rails so the track always meets it — except across
the bridge, which is listed in `freeSpans` so the river can run underneath.

**The engine can change while the game is running.** `Train.retune` and
`Audio.retune` swap in the chosen engine's driving spec and whistle. Both are
only ever called while he is standing still in the yard, so nothing has to be
smoothed across the change.

**Picking is only live in the yard.** A tap on the canvas becomes a ray and is
offered to each place in turn; only the yard takes it, and only while he is
stopped there. Everywhere else a tap on the world does nothing at all, which is
deliberate — his thumb rests on the screen while he drives.

**A place owns its own clock.** Every place keeps the `elapsed` it is handed in
`update` and times everything from that, rather than reading `performance.now()`
in one method and taking `elapsed` in another. Those are the same number in the
game and different numbers anywhere the world is stepped by hand, which is how
the gates, the shed doors and the sheep are tested.

**Nothing flat casts a shadow.** A road or a field lying on the ground casts a
shadow that reads as a second road lying on the ground a few metres away. Use
`flat()` from `scenery.ts` for anything lying down.

**Buttons fire on `pointerdown`, not `click`.** A four-year-old's press drifts,
and waiting for a matching pointerup feels broken. There is a `click` fallback
for assistive tech and for environments that do not emit pointer events.

**The hello is synthesised, not recorded**, and it copes with not being allowed
to speak. Chrome on Android refuses speech until the page has been touched, and
an app launched from the home screen has not been touched — so if nothing comes
out within a second or so, it is said on his first touch instead. The loading
screen never waits more than a couple of seconds either way.

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
const dt = 1 / 60;

train.setThrottle(0);
train.speed = 0;
train.distance = world.track.wrap(stopAt - 120);
train.setThrottle(1); // lever to the top

let t = 0;
while (t < 60 && !train.atStop) {
  // pull it down once the platform is 20 m ahead
  if (world.track.ahead(train.distance, stopAt) <= 20) train.setThrottle(-1);
  train.update(dt);
  t += dt;
}
Math.abs(world.track.delta(train.distance, stopAt)); // → 0
```

`train.setThrottle(v)` takes -1 (stop) through 0 (released) to +1 (full power),
which is exactly what the lever hands it.

The world can be stepped by hand the same way, which is how the places are
checked without waiting for a train to arrive:

```js
const { world, train } = window.LE;
let clock = 0;
const dt = 1 / 60;
const step = (seconds) => {
  for (let i = 0; i < seconds * 60; i++) {
    train.update(dt);
    clock += dt;
    world.update(dt, clock, {
      distance: train.distance,
      speed: train.speed,
      moving: train.speed > 0.05,
    });
  }
};
```

Verified this way, and worth re-checking after any change to a place: arriving
lands exactly on the mark at all three platforms from any distance inside the
window; the crossing gates are up 140 m out, down by 40 m out, and up again once
he is clear; the shed doors open as he leaves home and close once he has gone;
the sheep look up on a whistle and go back to the grass; a whistle is answered
by the tunnel, the bridge and the harbour but not out in open country; and
hammering the whistle eight times in half a second produces one answer, not
eight.

And for the yard: tapping an engine out on the open line does nothing; tapping
one while stopped in the yard swaps it in and puts the old one where it stood;
tapping a coupled car takes it off; tapping every spare in turn couples three
and then stops; and the choice survives a reload.

The hook is stripped from production builds.
