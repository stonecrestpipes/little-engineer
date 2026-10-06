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

**He has played the big railway, asked for twenty-odd things, and v0.4.0 is
most of them.** It is a much larger game than the one he last saw. Nothing
below has been in front of him yet — that is the whole of what the next go is
for, and v0.4.1 is there to make sure that go is actually recorded.

### v0.4.2 — a way to install it that Chrome cannot refuse

Nothing he sees changed. The grown-ups' panel gained an **Install app** button, which is on screen
only while the browser is actually offering an install and the game is not already running installed.

It is there because Chrome for Android's own *Install and create shortcut* is broken for this site,
and not in a way waiting will fix: it decides whether there is anything to install by **origin**
rather than by app, so once any app on `stonecrestpipes.github.io` is installed — Shakedown, The
Arcana, The Guild, Steel Squall — the menu refuses every other one with "This app is already
installed", and then "Could not open app". The page's own prompt checks this app's `start_url`
instead, so it still offers a real install. See *Putting it on the Pixel Tablet* below.

### v0.4.1 — an instrument, not a feature

Nothing he sees changed. The grown-ups' panel gained a **play log**: every
press, tap, drag and arrival in the order it happened, timed and placed on the
railway, so the questions under *The next thing to do* stop depending on what
anyone remembers afterwards. See *The play log* below for what it records and
how to get it off the tablet.

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
  doubled through a radius of **one metre twenty** to turn it round. The whole
  railway has been re-laid for this, and the numbers are now *generated* rather
  than drawn: the main line is one curve cut into named pieces, and each branch
  is built from exact arcs and straights, leaves and rejoins on the main line's
  own heading, and eases into every bend the way a real railway spirals into
  one. **The tightest curve anywhere on the sixteen loops is now about
  thirty-three metres**, and most of the railway is over forty. A startup check
  in development builds refuses to let that regress quietly, which is how the
  hairpin survived so long.
- **More open track before the turns.** The main line is 1,100 m rather than
  642, and **no two sets of points are closer than 190 m** (they were 56 m,
  back to back). The loop had to grow for it: on a branch built this way the
  radius is not a free choice, it is whatever closes the gap between its two
  junctions, so a gentler curve means putting them further apart and nothing
  else will do. The home platform is 66 m from the first junction rather than 22 — he
  used to get three seconds between pressing green and having to choose. The
  arrows now come up **nine seconds before the points at whatever speed he is
  doing**, rather than a fixed seventy metres, and there is a pause after one
  junction before the next is asked about.
- **Trees no longer stand in front of the track.** The scattered wood is planted
  back from the rails, the trackside camera picks a side that is clear instead
  of filming a trunk, and the woods canopy has been lifted so the chase shots
  travel through clear air underneath it — the crowns still close overhead.
- **Four things in the yard that were joined to nothing, or to the wrong
  place.** Both sidings ran to a stop block at one end and simply stopped at
  the other — rails lying in the grass with the spare stock standing on them.
  Both roundhouse throat roads aimed at where the running line *would* be if it
  ran straight through the yard, and missed it by up to a metre. The pilot's
  road, at a fixed distance from the yard's frame rather than from the line,
  closed on the main line as it went and overlapped its ballast. And the water
  tower's spout swung down five and a half metres clear of anything it could
  water. All of them were the same mistake: **the running line curves through
  the yard, and everything built there now asks where the rails actually are
  instead of assuming.**
- **The branches are as short as the construction allows.** He is four, and he
  went past the building site in the city, wanted to go back, and had to drive
  the whole way round to get there. Each lobe is pulled in to the point where
  its straights run out — any shorter and the geometry stops closing — which
  takes the grand tour from 2,432 m to **2,104 m** and the city lap from 1,483
  to 1,347, with no change to the curves. *It is a smaller help than it
  sounds:* see **Going back** below.
- **An update check in the grown-ups' panel** (*Updates → Check now*), because
  the tablet runs a cached copy and "has it picked up the new build yet?" was
  otherwise only answerable by reading the build stamp and guessing.
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
  sets back onto the front of the train with a clank. **About fifteen seconds,
  and pressing green abandons it instantly.**
- **A fourth view.** Between "the whole county" and "the back of the engine"
  there was nothing. *Above* is a bird's-eye that follows the train, pulled back
  from the train's real length so it holds the engine and everything behind it.
  **Pressing green from the wide shot now comes down to the train.**
- **Two more junctions**, so four altogether and sixteen whole loops. Leaving
  The Sheds: the meadow or the city. Across the meadow: The Farm or the woods.
  Main lap 1,100 m; taking every branch, **2,104 m**.
- **The woods** — two hundred and twenty metres with the canopy closed over the line, A-frame
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
   read **v0.4.1**. If it does not, the panel's *Updates → Check now* says
   outright whether there is a newer one.
2. Hand it to him. Say nothing, as before.
3. **Watch the roundhouse.** It is the biggest new thing and the biggest
   gamble. Does he work out that touching an engine behind an open door takes
   it? Does he sit through the fifteen seconds, or does he press green half way?
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

**Several of those no longer depend on remembering.** From v0.4.1 the play log
answers 4, 7 and 8 outright — which branch, every press of R and how long it
was held, and exactly where each sitting trails off. Copy it afterwards rather
than trusting a recollection of a half hour spent mostly watching his face.
What the log *cannot* tell you is 3, 5 and 6: whether he sat through the
roundhouse swap rather than pressing green is in the timings, but what he made
of the numbers and the Orion Express is only on his face. Watch for those.

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

## Going back

He missed the building site in the city, wanted to return to it, and had to go
round the whole loop. Shortening the branches helps a little — the city lap is
1,347 m rather than 1,483 — but the honest answer is that **it is still three
minutes at full steam to see again something he has just passed**, and that is
a long time when you are four.

The control that ought to solve it is **R**, and it cannot: reverse is
deliberately a creep, `REVERSE_FRACTION` 0.42 of the gentlest forward speed and
capped at 1.8 m/s, which is 1.2 m/s on the blue engine. Backing up a hundred
metres is eighty-five seconds of holding the button down. It was built for
easing up to a car in the yard, and it is right for that.

If this turns out to matter — watch whether he tries to go back and gives up —
the smallest change that would fix it is to let reverse run at the first
notch's speed, around 3 m/s, which makes a hundred metres half a minute. That
is one number in `src/engine/train.ts`. The thing to be careful of is that
**R never latches**: letting go always stops the engine, and that is a safety
property worth more than the convenience.

## The grown-ups' panel

Hold the **top-right corner of the screen for three seconds**. A faint ring
starts to fill after a second. At the top is a scrapbook of how he plays —
days, distance, whistles, where he stops, what he drives, which way he goes
at the points — which he never sees. Under that is **How he plays**, which is
the same play told as a story rather than as totals. Below those: his name for
the hello,
speed, how much help he gets stopping, volume, evenings, the branch line,
the blue engine's face, nameplates for each engine, picture quality, **an
install button** (only when there is an install to offer), **an update check**,
and resets. Changes take effect immediately. The build time at
the bottom tells you which build the tablet is running.

## The play log

**How he plays** in the panel is backed by a trail of every single thing he
touches: green and which notch it went to, red, how long he held R, the
whistle, the two voices, the camera and which view it landed on, every arrow
at the points and which way he actually went, every arrival and departure,
every tap in the yard — and, the interesting one, **every tap on the world
that nothing answered**. Each is stamped with the time and with where the
train was and how fast it was going.

The panel shows only enough to tell whether the log is worth asking for yet:
how many sittings, how long a typical one lasts, how long the longest was, how
many things he pressed, how long he leaves between pressing them, and the
things he most often does one after the other. The looking happens in the log
itself.

**Copy the play log** puts the whole thing on the clipboard, ready to paste
into a message. **Save the play log** writes it as a `.csv`. They are the same
text either way: a few comment lines, then a row per beat, with a `sitting`
column that groups them into visits and an `at` column that says how many
seconds into the visit each one happened. Load it in a spreadsheet, or hand it
over whole and ask what it says.

A few things it is built to answer:

- **Does he use R at all, and for how long at a time?** A stab at it and a
  thirty-second shunt are different facts about the same button.
- **Where does he tap and get nothing?** Those rows carry the metres, so they
  say *where on the railway* he expected something to be touchable.
- **Does he go back to a branch?** `points` says which arrow he pressed,
  `through` says which way he actually went, and the two disagreeing is a
  button that did not work the way he thought it did.
- **How long does a sitting last, and what is the last thing he does before
  he stops?** The final rows of each sitting are the ones worth reading.

It is kept on the tablet, in `src/trail.ts`, in the same place as the
scrapbook, and it holds the most recent 6,000 beats — a few weeks of real
play. **Nothing ever leaves the tablet by itself**; the only way it goes
anywhere is one of those two buttons. *Clear the scrapbook* clears the log as
well. Anything a grown-up does while the panel is open is marked as such and
left out of everything above, so an evening of fiddling in here is never mixed
in with his play.

**Updates → Check now** is the one control in there that talks to the outside
world. The tablet keeps the whole game cached so it works in flight mode,
which means a build pushed an hour ago may not be the one he opens; normally
that sorts itself out next time the app is closed and reopened, and this is
for when you want to be sure. It says what it found rather than doing
something invisible — *found a newer one*, *this is the newest one there is*,
*no connection*, or *this copy is not an installed one*, which is what you get
in `npm run dev` and in a plain browser tab, since neither is cached.

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
npm test          # the junctions, the platform stops and the play log
```

The tests cover the three promises most likely to break quietly: that pulling
down near a platform always lands exactly on the mark (and never past it),
that moving between loops at a junction changes nothing under the engine, and
that the play log is read correctly — a sitting split in the wrong place, or
an evening of fiddling in the panel counted as him playing, would give a
confident answer to the wrong question. They also run on every push, before
anything is deployed.

## Putting it on the Pixel Tablet

Installing to the home screen needs an **HTTPS** address — the service worker
will not register over plain HTTP (except on `localhost`). So:

1. Deploy `dist/` to any static host.
2. Open the URL on the tablet in Chrome.
3. Hold the **top-right corner for three seconds** and press **Install app**.
4. After that it runs fullscreen and works in flight mode.

**Use that button, not Chrome's menu.** Chrome for Android decides whether
*Install and create shortcut* has anything to do by **origin**, not by app
(`WebappRegistry.isAppInstalledForUrl` → `hasAtLeastOneWebApkForOrigin`), and
every app on `stonecrestpipes.github.io` shares one origin. So once any of them
is installed the menu refuses the rest — "This app is already installed", then
"Could not open app". The in-app button raises the page's own prompt, which
checks this app's `start_url` instead (`WebappsUtils::IsWebApkInstalled`) and
offers a real install. It only appears while the browser has an offer to make,
so if it is not there, close the game and open it again.

⚠️ **Do not clear Chrome's site data for `stonecrestpipes.github.io` to fix
this.** It will not fix it, and that origin is shared by every app on it —
clearing it takes all of their storage with it.

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

**What a public URL does not expose is anything about him.** The settings, the
scrapbook and the play log are all in the tablet's own storage and are never
sent anywhere; the site is static files and the only request the app ever makes
of its own accord is the update check. Somebody who opens the URL gets the
game, not a word about who has been playing it.

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
reinstalling on the tablet. The manifest's `start_url` and `scope` (and so its
implied `id`) are the app's identity to the browser — they are what tells the
install prompt this app apart from its siblings on the same origin, and what
tells the installed copy on the tablet it is still the same app.

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
  trail.ts    the play log: what he did and when, in order
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
