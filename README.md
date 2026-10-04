# Little Engineer

A calm, offline train game for a four-year-old. Two buttons, one railway,
nothing to do but drive and look. See [GAME_DESIGN.md](GAME_DESIGN.md) for the
settled design and `Little Engineer - Game Plan.pdf` for the full phased plan.

**Live:** https://stonecrestpipes.github.io/little-engineer/
**Repo:** `stonecrestpipes/little-engineer` (public — see *Hosting* below)

---

## Where this is up to

**Phase 1 passed** long ago: he picked the tablet up, found the control and
drove, with nothing said to him.

**He has played the big railway, asked for twenty-odd things, and this build is
most of them.** It is a much larger game than the one he last saw. Nothing
below has been in front of him yet — that is the whole of what the next go is
for.

### v0.4.0 — the second list, after he drove it

He played the railway above and came back with seven things. All seven are in.

- **The hello said his name twice.** It cut itself off mid-sentence and started
  again in a different voice. Two causes, both fixed: the retry that was meant
  for a device too slow to speak fired even when the device *had* spoken, and
  the voice was being chosen afresh for every sentence out of a list that grows
  while the page loads. It is said once now, in one voice.
- **A third speed.** Green went amble → full steam and nothing between, and
  full steam was quick enough that a bend arrived before he had decided
  anything about it. Now: amble → a middle gear → full steam, with a chevron on
  the button lighting for each. A fourth press still does nothing.
- **Pinch to zoom, in every view** — the yard included, which is where it is
  most useful, because the engines in the roundhouse are small under his own
  thumb. The zoom stays where he puts it; the camera button gives it back.
- **The hard right through the forest is gone.** It was not a curve at all: the
  woods branch came back onto the main line *facing backwards*, and the rails
  doubled through a radius of **one metre twenty** to turn it round. Every
  branch has been re-laid to swing out to the outside of the bend the main line
  is taking, which is what brings it back facing the right way. **The tightest
  curve anywhere on the sixteen loops is now about fifteen metres**, and nearly
  all of it is over twenty-five. A startup check in development builds refuses
  to let that regress quietly, which is how the hairpin survived so long.
- **More open track before the turns.** The main line is 755 m rather than 642,
  and **no two sets of points are closer than 125 m** (they were 56 m, back to
  back). The home platform is 66 m from the first junction rather than 22 — he
  used to get three seconds between pressing green and having to choose. The
  arrows now come up **nine seconds before the points at whatever speed he is
  doing**, rather than a fixed seventy metres, and there is a pause after one
  junction before the next is asked about.
- **Trees no longer stand in front of the track.** The scattered wood is planted
  back from the rails, the trackside camera picks a side that is clear instead
  of filming a trunk, and the woods canopy has been lifted so the chase shots
  travel through clear air underneath it — the crowns still close overhead.
- **The roundhouse was built wrong and is rebuilt.** Five roads 22.5° apart are
  only 4.3 m apart at the doors, and each bay was being built as a 7 m-wide box:
  every doorway pier stood a metre inside its neighbour's doorway, the roofs
  overlapped three deep, and all seven roads were drawn straight across the
  turntable pit. It is now one curved building — shared walls between the bays,
  one roof over the fan, doorways that are holes in one front — the roads stop
  at the pit rim where the turntable takes over, and the doors fold back inside
  the bays where there is room for them.

### What he asked for before that, and what is there

- **A roundhouse.** Five roads round a turntable, a pair of doors on each, and
  an engine asleep behind every door but the one whose engine is out. It is now
  the *only* way to pick an engine — the siding full of spares is gone. Stand
  still in the yard and the doors come open one after another; touch an engine
  and you watch the swap: his old one pulls forward off its train and sets back
  into its own road while the new one comes out, runs up past the platform and
  sets back onto the front of the train with a clank. **About twelve seconds,
  and pressing green abandons it instantly.**
- **A fourth view.** Between "the whole county" and "the back of the engine"
  there was nothing. *Above* is a bird's-eye that follows the train, pulled back
  from the train's real length so it holds the engine and everything behind it.
  **Pressing green from the wide shot now comes down to the train.**
- **Two more junctions**, so four altogether and sixteen whole loops. Leaving
  The Sheds: the meadow or the city. Across the meadow: The Farm or the woods.
  Main lap 755 m; taking every branch, **2,107 m**.
- **The woods** — a hundred and seventy metres with the canopy closed over the line, A-frame
  cabins with their windows lit, deer that bolt at a whistle, an owl.
- **The capybara ranch** — a fenced field, a pool, eight of them, two standing
  in the water. Whistle and every head turns and they squeak back.
- **The city** — seven towers with windows that light up at dusk, a street with
  cars and people, a platform, **the rescue station** (three bays, a fire engine,
  a tow truck, a control tower, and a helicopter that winds up and lifts off the
  pad when he whistles) and **a building site** with a tower crane and a digger.
- **The SS Badger** alongside the quay at The Harbour, four times the size of
  anything else on the water, and what answers the whistle now.
- **A drawbridge** where the lighthouse line crosses the creek. It stands *up*,
  with a boat going under it, and rings its bell and lowers itself as he comes
  round the bend.
- **The lighthouse is Big Sable Point** — white with the black band, taller, red
  brick keeper's dwelling.
- **A working water tower** in the yard: stop under it and the spout swings down.
- **Engines you can tell apart from the far end of the layout** — a blue tank
  engine **1**, a yellow tank engine **2**, a red **tender engine 5** (eleven
  metres against everyone else's six), a green **saddle tank 6**, and
- **the Orion Express**: a silver-and-blue streamliner named after him, with two
  silver coaches, the quickest thing on the railway.

- **A yard pilot** — a little green saddle tank on its own road beside the
  spare cars, shuffling up and down all day. Take a car and it runs down to
  where that car was standing and whistles.

### What he asked for that is *not* here

- **The pilot actually carrying the car across the yard.** Tapping a car still
  couples it instantly, which is quick and he already knows it. Doing it
  properly needs a fan of short spurs instead of one siding — on a single road
  the fifth car cannot come out without pushing through the four in front of it
  — and would add thirteen to eighteen seconds per car, forty-odd to build a
  three-car train. The reasoning is in
  [GAME_DESIGN.md](GAME_DESIGN.md); worth building if the pilot turns out to be
  the thing he watches.

---

## The next thing to do

1. Open it on the tablet, then close it and open it again. The corner should
   read **v0.3.1**.
2. Hand it to him. Say nothing, as before.
3. **Watch the roundhouse.** It is the biggest new thing and the biggest
   gamble. Does he work out that touching an engine behind an open door takes
   it? Does he sit through the twelve seconds, or does he press green half way?
   *Either answer is useful* — if he presses green, the swap is too long and
   should be shortened, not defended.
4. **Watch which branch he takes**, now there are four choices a lap. The
   scrapbook counts every one. If he never leaves the main line, the arrows are
   not working and no amount of new country fixes that.
5. **Watch whether he notices the numbers on the engines.** They are there
   because a numeral is a shape rather than a word. If he starts naming engines
   by number, that is the single cheapest thing in this build and worth more of.
6. **Watch what he does with the Orion Express.** It is the only engine that
   looks nothing like the others and the only one with a name already on it.
7. **Still open from last time: does he press R?** It remains the one control
   that was a guess rather than an answer to something he said.
8. **Still open: does he leave the train running and wander off?** See open
   question 5 in [GAME_DESIGN.md](GAME_DESIGN.md) — the idle coast is designed
   and deliberately unbuilt until he has been watched.

**If the screen feels busy**, the two voice buttons are the cheapest thing to
remove: delete the two `.say` buttons from `index.html` and the `say` handler
in `src/main.ts`. Nothing else depends on them.

**Check the frame rate on the actual tablet.** The game measures it for you:
on *Auto* it turns shadows down if it cannot hold about 46 fps, and the footer
of the grown-ups' panel says which tier it settled on (*Full detail*,
*Shadows reduced* or *Shadows off*). If it lands on *Shadows off*, the next
thing to try is thinning the trees in `src/content/world.ts`.

### Decide after watching, not before

- **How the driving feels** is five numbers per engine, in
  `src/content/engines/`. For the blue one, in `thomas.ts`:
  `cruise` 7.2 m/s on the third press of green, `slow` 2.8 m/s on the first,
  and the middle gear sits between them (the ladder is `NOTCHES` in
  `src/ui/controls.ts`),
  `coast` 1.15 m/s² with no power on (about six seconds to a halt), `brake` 3.4
  on red, and `accel` 2.6. Reverse is 42% of `slow`, in `src/engine/train.ts`. All guesses until he drives it, and the
  first numbers likely to want changing. The grown-ups' panel scales top speed
  and the stopping window on the tablet without touching these.
- **The greeting** is a sentence in `src/content/greeting.ts`, and the name in
  it is set in the grown-ups' panel.
- **The nameplates are blank** until a name is typed into the grown-ups' panel —
  except the Orion Express, which carries its own. They are meant to hold
  whatever he decides to call each engine, and are the only *words* in the game.
  Typing one onto an engine hides that engine's number, since nothing on an
  engine's side is ever two things at once.
- **Whether the station reaction is enough.** Right now: lamp lights, flag goes
  up, passengers bob, chime plays, and the engine sighs out steam. Worth
  building on only if arriving turns out to be the thing he likes most.
- **Which face the blue engine wears.** It wears its **own drawn face** from
  v0.3.1 — the first time he will have seen it. The photograph is still in the
  repo and one tap away in the grown-ups' panel (*Blue engine's face →
  Familiar*), because he has known that face far longer than he has known this
  game. **If he takes to the drawn one, delete `faceTexture` from
  `src/content/engines/thomas.ts` and the file it points at**: that is the last
  thing here that is not original work, and removing it closes the hosting
  question for good. If he rejects it, one tap puts it back.

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
npm test          # the junctions and the platform stops, checked
```

The tests cover the two promises most likely to break quietly: that pulling
down near a platform always lands exactly on the mark (and never past it),
and that moving between loops at a junction changes nothing under the engine.
They also run on every push, before anything is deployed.

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
    train.ts      go, stop, reverse, speed curves, the platform glide path
    cameras.ts    four fixed views, the drag that swings them, the yard shot
    junction.ts   sixteen whole loops seen as one track, and the points between them
    consist.ts    the engine and its cars, placed from one distance along the rails
    shunting.ts   stock moving under its own steam, off the train
    audio.ts      every sound, synthesised — nothing is loaded
    sky.ts        day, a golden evening and dusk, and back
    quality.ts    steps shadows and resolution down if frames are slow
    merge.ts      bakes everything that never moves into a few meshes
  content/    data: this engine, this railway
    engines/thomas.ts   colours, dimensions, driving feel, whistle pitch
    buildEngine.ts      the mesh, built from boxes and cylinders
    buildStreamliner.ts the Orion Express, which is not that shape at all
    world.ts            the segments, the terrain, and what stands where
    terrain.ts          the heightmap ground, and the water under it
    scenery.ts          rails, ballast, trees, fences, people
    greeting.ts         the spoken hello, and what the voice buttons say
    faces.ts            engine faces, painted onto a canvas from numbers
    flock.ts            the birds that go up when he whistles
    cars.ts             coaches, wagons and the brake van
    roster.ts           every engine and car, and which he is driving
    engines/            one file per engine, plus the spec they share
    places/             one file each, geometry and behaviour together
      place.ts            what a place is, and the frame it is built in
      station.ts          the part every platform shares
      sheds.ts            home: the roundhouse, the turntable and the yard
      crossing.ts  farm.ts  tunnel.ts  bridge.ts  harbour.ts
      windmill.ts         out on the branch round the hill
      lighthouse.ts       out on the coast line
      drawbridge.ts       over the creek on the way to it
      woods.ts  ranch.ts  the long way round, north of the meadow
      city.ts             the far end of the longest branch
  settings.ts the grown-ups' settings, and how they adjust each engine
  journal.ts  the scrapbook: what he did, for the grown-ups only
  ui/         the buttons, the whistle, the camera
    controls.ts   green, red, R, the whistle, the voices and the camera
    parents.ts    the hidden grown-ups' panel
    points.ts     the two arrows at a junction, and which pictures they wear
    wakelock.ts   keeps the screen on while he is playing
    greeting.ts   speaking, and coping when the device will not
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
idea came from.

### Adding track

Track is named segments in `SEGMENTS` at the top of `src/content/world.ts`,
joined into whole loops. Each junction doubles the loops (`loopOf(n)`, where
the bits of `n` say which branches are taken), and `src/engine/junction.ts`
lets the engine move between two loops only while it is short of where they
part. A place on a branch is built against a loop that takes it, and
distances are converted between loops by segment, so a place never has to
know which way the engine went. Another branch is: its segments, one `join`
at each end, a bit in `loopOf`, and an entry in `junctions`.

---

## Decisions worth knowing before you edit

**All audio is synthesised** (`src/engine/audio.ts`). The whistle is two
near-unison sawtooths plus breath noise, with a pitch swell in and a sag out —
that sag is most of what makes it sound like steam rather than a car horn.
Retune it with `whistleHz` in the engine spec. No files, no licensing, and it
cannot become a 2 MB download.

**Green and red latch; R does not.** This replaced a lever that sprang back to
the middle, and the trade is worth knowing before you change it: the lever could
never be left set, so the engine could never be left running by a control nobody
was holding. Two buttons can. He asked for two buttons anyway, because what he
wanted was to set the train going and then have his hands back, and that is his
call to make. R is the one exception — a train reversing on its own is the
version of this worth refusing, so it stops the moment he lets go.

**Coasting and stopping are deliberately different.** With no power on the
engine rolls about 20 m over 6 s. On red, about 8 m over 2 s. Two separate
deceleration rates (`coast` and `brake`), and the gap between them is what makes
pressing red mean something.

**Red near a platform means "arrive there", not "brake here."** Within
`stopWindow` (30 m) the engine follows a glide path `v(s) = v₀·√(s/s₀)` — constant
deceleration spread over the whole remaining distance. It starts slowing within
a fraction of a second so the button visibly does something, and lands exactly on
the mark every time. Verified from 28 m down to 1 m. Outside that window it
simply brakes.

**Reverse is a creep, and it never lurches.** Holding R backs the engine up at
42% of `slow`, about 1.2 m/s. Pressing it while still rolling forward is a stop
followed by a reversal, never a jump, so it cannot be pressed at a wrong moment.
Backing through a platform does not count as arriving there.

**A drag on the railway swings the view; a tap still picks.** The camera rig
orbits whatever the current shot is looking at, clamped so it can never end up
underground or pointing at the sky, and it eases back once the train is moving.
A press that travels more than 16 px is a look rather than a pick — which is
generous on purpose, because his taps drift.

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
train.setThrottle(1); // both presses of green

let t = 0;
while (t < 60 && !train.atStop) {
  // press red once the platform is 20 m ahead
  if (world.track.ahead(train.distance, stopAt) <= 20) train.setThrottle(-1);
  train.update(dt);
  t += dt;
}
Math.abs(world.track.delta(train.distance, stopAt)); // → 0
```

`train.setThrottle(v)` takes -1 (red) through 0 (no power) to +1 (full power);
the green button sends 0.22 on its first press and 1 on its second.
`train.setReverse(true|false)` is what R holds down.

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
