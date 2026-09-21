# Little Engineer

**A calm, offline train game for a four-year-old. Storybook railway, four big buttons, nothing can go wrong.**

Phase 0 deliverable. This document records settled decisions. Nothing here is a suggestion —
where something is genuinely undecided it appears in *Open Questions* at the end.

---

## Product principle

> Make train go → watch train → blow whistle → stop somewhere interesting → trigger something fun → keep going.

Playable with no reading, no explanation, no account, no internet, no ads, no purchases, no menus
to navigate and no railway knowledge.

---

## Player profile (observed)

This is the most important input to the design, and it is specific rather than generic.

Watching him in Train Simulator PRO, he gravitates to:

1. **Blowing the horn / whistle** — constantly, often more than he drives.
2. **Stopping at stations** — the arrival, the ritual, the pause.
3. **Changing cameras and watching** — he enjoys observing the train as much as driving it.

He does **not** chase speed. He is not a throttle child; he is a *conductor of a play-mat railway*.

Three design consequences follow directly:

- **Driving is one lever, not a set of options.** He is not a throttle child chasing a top speed;
  he wants to set off, roll along and pull up. One thing to hold does all three.
- **The whistle is a primary control, not a garnish.** Equal visual weight to the lever, always
  on screen, always responsive, and the world answers it.
- **The camera button is a first-class control**, not a settings item. Flipping views is play.

### Later observation: what he liked in someone else's game

Watching him with *Thomas & Friends: Magic Tracks*, two things were clear, and they pull in
opposite directions:

- **The control was the good part.** A lever you push up into the green to go, let go of to ease
  off by itself, and pull down to stop. One thumb, no reading, and letting go is always safe.
- **Everything around it was in the way.** Errands to run, people to collect, prizes popping up
  over the view. He wanted to drive through the place and look at it, and the game kept
  interrupting to hand him a job.

So: take the lever, and take nothing else. This game is about going somewhere and watching it go
past. That is the whole of it.

---

## Settled decisions

| Area | Decision |
|---|---|
| **Name** | Little Engineer |
| **Core gameplay** | Drive a train round a continuous loop; stop at stations; whistle at everything; watch it go |
| **Controls** | One throttle lever, plus WHISTLE and CAMERA. Nothing else on screen |
| **The lever** | Push up to go — further is faster. Let go and it centres itself and the engine eases down. Pull down to stop |
| **Objectives** | **None.** No errands, no collecting, no prizes, nothing that pops up over the view |
| **Greeting** | Spoken by name when the app opens, and nothing else is ever spoken |
| **Camera** | One big button cycles three fixed views: **Wide**, **Follow**, **Trackside** |
| **World** | One continuous loop, several stations, visible as a play-mat layout. No end, no fail |
| **View style** | Storybook 3/4 — angled overhead, toy railway on a table |
| **Activities** | Passengers board · station comes alive · whistle gets a response |
| **Track interaction** | Fully automatic. No junctions in MVP (deferred to Phase 5+) |
| **Difficulty** | Generous stopping zone with gentle auto-assist. He cannot miss |
| **Failure states** | **None whatsoever.** Overshooting simply means going round again |
| **Rewards** | None in MVP. Optional sticker book deferred to Phase 7 |
| **Audio** | Sounds and animation only. No speech, in any phase |
| **Sessions** | Endless free play. Start instantly, stop anytime, nothing is lost |
| **Parent controls** | Deferred to Phase 8, behind a long-press gesture |
| **Engines** | Four. He picks one by touching it in the yard |
| **Cars** | Up to three, chosen the same way. Nothing to do with them |
| **Artwork** | Original engines and scenery, designed for this project |
| **Delivery** | Installable offline PWA on a free static host |

---

## The world

A single continuous loop, laid out so that most of it is visible at once in Wide view — the feel of
looking down at a wooden train set on the floor.

A lap is **642 metres**, about **a minute and forty** at the top of the lever, and most of it is
visible at once in Wide view. The order round it is: The Sheds → across the meadow and over the
level crossing → The Farm → up the hillside and through the tunnel → down to the river and over the
bridge → The Harbour → back along the shore to home.

**Stations (three).** Each has a distinct silhouette and colour so it is identifiable with zero
reading:

| Station | Identity | Signature moment |
|---|---|---|
| **The Sheds** | Red brick, home, where play begins | Doors open as the engine leaves |
| **The Harbour** | Blue, boats, water, cranes | A boat sounds its horn back, lower and slower |
| **The Farm** | Green, barn, animals, hay | Every sheep looks up at once, and answers |

**Trackside features** between stations, so things happen while simply driving:

- A **tunnel** — whistle inside produces an echo
- A **level crossing** — gates lower, a car waits, the driver waves
- A **bridge** — the river running underneath, and a boat working up and down it

**The country itself** is a heightmap rather than a flat plane: rolling ground, a hill for the
tunnel, a pond in the middle of the loop, a river running from it out to the sea, and a coastline
at the back. There is one sheet of water across the whole map, and it shows wherever the ground has
been dug below it — so the shoreline is a consequence of the land rather than a shape anyone drew.

Track is a closed circuit. The engine always follows it. There is no steering, no switching, and no
way to leave the rails.

Underneath, though, it is a **network of ten named segments** rather than one closed curve — `sheds`,
`meadow`, `farm`, `hillfoot`, `bore`, `descent`, `rivermouth`, `harbour`, `shore`, `westbank` — joined
end to end and driven as one route. Nothing above the track layer knows this, and there is nothing to
choose. It is there so that the junction in Phase 5 is one more segment joined onto an end that
already has one, rather than a rewrite.

---

## Controls and screen layout

Designed landscape-first. A four-year-old holds a tablet like a steering wheel, so the primary
controls sit in the **bottom corners** where thumbs already are — never along the top.

```
┌────────────────────────────────────────────────────┐
│  [camera]                                   ┌──┐   │
│                                             │▲▲│   │
│                  the railway                │▲▲│ ● │
│                                             │──│   │
│  ┌─────────┐                                │■■│   │
│  │ WHISTLE │                                └──┘   │
│  └─────────┘                                       │
└────────────────────────────────────────────────────┘
```

- **THE LEVER** (bottom-right) — a tall slot with a ball in it. Push the ball up into the green and
  the engine goes, faster the further up it is. Let go and it springs back to the middle by itself
  and the engine rolls gently down to nothing. Pull it down into the amber and it stops properly.
- **WHISTLE** (bottom-left) — always available, whether moving or stopped, always responds
  instantly, and can be hammered repeatedly with no penalty or cooldown.
- **CAMERA** (top-left, small but clear) — cycles the three views.

Two things about the lever matter more than they look:

- **It never latches.** A lever that stays where it was put is a lever that can be forgotten about,
  and an engine left running is the game driving rather than him. Letting go always means letting go.
- **Letting go and stopping are different, and feel different.** Released, the engine takes about
  six seconds and twenty metres to come to rest — it is easing off. Pulled down, it takes two
  seconds and eight metres — it is stopping. That difference is most of what the lever teaches, and
  it is learned by doing rather than by being told.

**Touch targets: minimum 96 px, primary buttons ~160 px.** Well above the 48 px adult minimum;
a four-year-old's aim is poor and the tablet is heavy.

Every button responds within one frame with *three* simultaneous confirmations: visual (press and
glow), motion (the thing it controls reacts), and sound. Immediate feedback matters more than
realism.

---

## Camera system

One button, three fixed views, cycling in a fixed order so the sequence becomes predictable:

1. **Wide** — the whole layout, train small, best for watching it go round. Default.
2. **Follow** — close behind and slightly above the engine, track moving beneath. The "driving" view.
3. **Trackside** — a low fixed shot near the rails; the train enters, passes, and leaves the frame.
   Cinematic, and the one that makes a toy railway feel like a real one.

No free camera, no pinch-zoom, no drag. He cannot get the view stuck underground or aimed at the
sky. Transitions are smooth glides, never cuts.

---

## The station moment

Stations are his favourite thing, so this is the most polished interaction in the game.

**Approach.** Within range of a platform the engine eases off automatically. The station brightens
slightly — a soft cue that *something is possible here*, with no arrow and no text.

**Stopping.** The good-stop zone is deliberately very wide. Tapping STOP anywhere near the platform
counts as a perfect arrival. He feels responsible for the stop; he effectively cannot fail it.

**Arrival.** Three things happen together:

- **Passengers board.** Small figures walk out of the station and climb aboard. Visible, unhurried,
  a few seconds long — this gives the stop a purpose.
- **The station comes alive.** Signal changes, stationmaster waves his flag, a bell rings, lamps lift.
- **Whistling gets an answer.** Whistle at a station and the world responds — people wave, birds
  scatter, the stationmaster blows back. This deliberately combines his two favourite actions.

**Leaving.** Tapping GO sets off again. Nothing is required of him; he may sit at a station whistling
for five minutes, and that is a perfectly valid way to play the game.

**Overshooting** is not a failure. The train simply carries on and comes round again.

---

## Audio

One spoken line — *"Hello Orion. Are you ready for a great train day?"* as the app opens, said by
the device rather than recorded. Nothing else is ever spoken, and nothing in the game depends on
hearing it. Sounds and animation carry the rest.

- **Whistle** — warm, clear, satisfying, instant. The single most-heard sound in the game; worth
  getting genuinely right before anything else.
- **Chuffing** — speed-matched, soft, seamless loop; fades to a gentle idle hiss when stopped.
- **World** — birds, water, a distant church bell, wind, sheep, the crossing bell.
- **Arrival** — a short, unforced chime. Celebratory, not a fanfare, because he will hear it hundreds
  of times.

Chosen because there are no lines to record or re-record, nothing becomes irritating on the two
hundredth hearing, and it works regardless of language or reading ability.

---

## Explicitly not in this game

Recorded here so it doesn't creep back in later:

missions · errands · objectives · things to fetch · people to collect · prizes · pop-ups over the
view · accounts · logins · internet requirement · ads · purchases · currency · XP · levels · daily
rewards · streaks · timers · countdowns · scores · lives · derailment · collisions · red-signal
penalties · tutorials · text instructions · menus more than one tap deep · analytics · cloud saves ·
servers · any ongoing cost.

The first line is the one to keep re-reading. Every item on it has a good argument for it, and every
one of them turns driving through a place into doing a job.

---

## Phase plan

Each phase ends with **real play testing before the next begins**. Feature count is not the measure;
independent, unprompted play is.

### Phase 1 — Toddler UX prototype *(next)*
One engine, one small loop, one station, simple scenery. GO / STOP / WHISTLE / CAMERA.
No progression, no data persistence, no extra content.
**Success test:** he picks up the tablet and plays without being told how. Nothing else counts.

### Phase 2 — Train-driving foundation
Harden what survived Phase 1 into a reusable system: track-following along a spline, smooth
acceleration and braking curves, the station-proximity assist, the camera rig. Written so additional
engines and additional routes reuse it unchanged.

### Phase 3 — The complete loop *(built)*
The full world: three stations, tunnel, crossing, bridge, and the polished station moment described
above. The first version that is genuinely *the game* rather than a test.

### ~~Phase 4 — Activity system~~ *(dropped)*
This was to be freight wagons to collect and drop off, a findable animal, an engine wash. It is
struck out deliberately: collecting and delivering is exactly the errand-running he disliked in
*Magic Tracks*, and *Explicitly not in this game* now rules it out. What survives of the idea —
things to pull, because pulling things is good — moves to Phase 6 as cars chosen at the shed, with
nothing to do with them.

### Phase 5 — Expand the railway *(built)*
Extend the loop with new areas that connect to the existing world rather than replacing it. Junction
choice with two very large arrow buttons arrives here, if Phase 4 shows he wants agency.

As built: one junction, just after The Farm. The main line bears left into the tunnel as before;
the branch carries straight on round the far side of the hill to **The Windmill** and rejoins above
the bridge. Two big arrows appear bottom centre as he comes up to the points (from 70 m out, which
includes standing at The Farm's platform), each with a picture of where it goes: the tunnel, or
the windmill. The one the points are set for is green. They are set for the main line every time
round, so the branch is always something he chose; if he touches nothing, nothing changes. The
grown-ups' panel can switch the arrows off. A lap by the windmill is 749 m against 642.

### Phase 6 — More engines, and something to pull *(built)*
Four engines reusing the same controller, differing in colour, face, chimney, whistle and how they
drive. Up to three cars behind whichever one he picks.

Choosing happens in **the yard at The Sheds**, and by touching the thing itself: the other engines
stand on a siding and the spare cars on another, and tapping one puts him in it. There is no
selection screen, no list and no menu — which is the point, and is why it is a place he drives to
rather than a screen that interrupts him.

No unlocking, no cost, nothing earned. Every engine and every car is there the first time he opens
the app, and an engine on its own is as valid a choice as three cars.

### Phase 7 — Gentle progression
An optional local sticker book recording places visited and things seen. Nothing can be lost, nothing
expires, nothing pressures him to return.

### Phase 8 — Parent settings *(built)*
Long-press gesture to a hidden panel: assist strength, speed control on/off, junctions on/off, which
activities are enabled. This is how the game grows with him from four to six.

As built: hold the **top-right corner for three seconds**. A faint ring starts filling after the
first second so a grown-up knows it is working. The panel has his name for the hello, hello on/off,
speed (slower, normal, faster for every engine), help stopping (how far out pulling down still
arrives), volume, a nameplate for each engine, and two resets. Later phases add their own rows.
Everything takes effect immediately and is kept in `localStorage`; every default is the game exactly
as it played before the panel existed.

### Phase 9 — Polish *(first pass built)*
Only for things he actually uses repeatedly. Weather, day/night, more scenery, more sounds, more
character reactions.

First pass, built before he has played any of it, so deliberately small: an eight-minute round
from day to a golden evening to a warm dusk and back (never dark enough to hide anything, and it
always opens in the day; the grown-ups' panel can switch it off), the engine's lamp glowing as it
gets dark, and a flock of birds that goes up from the field beside the line when he whistles, at
most once every nine seconds so it stays a surprise. Weather is left out on purpose. Anything more
waits for what he actually does over and over.

### Phase 10 — Pixel Tablet packaging *(built)*
Full PWA: offline service worker, bundled assets, local storage, fullscreen, home-screen icon.
*(Basic installability is worth bringing forward into Phase 1 — see below.)*

As built: offline and updates were already done in Phase 1. This phase added a fullscreen manifest
(no status bar over the sky), a screen wake lock that holds while he is playing and lets go after
five minutes without a touch, and a quality governor. On 'Auto' it starts at full detail and, if
play averages under 46 fps for four seconds, steps down: first to 1× pixels and 1024 shadows, then
to no shadows. It never steps back up in the same session. The grown-ups' panel can pin it to
Sharp or Simple and shows which tier it is running at.

---

## First milestone

Deliberately tiny, and the only thing Phase 1 has to achieve:

1. Tap the icon on the Pixel Tablet home screen.
2. It opens fullscreen, instantly, offline, and says hello to him by name.
3. One engine sits on one loop.
4. Push the lever up — it moves.
5. Let go — it eases off by itself.
6. Pull the lever down — it stops.
7. Tap **WHISTLE** — a proper whistle, immediately.
8. Tap **CAMERA** — the view changes.
9. Arrive at one station — something visibly happens.
10. Keep driving as long as he likes.

If that holds his attention and he can use it unaided, continue. If not, **change the interaction
before adding any content**.

Note: steps 1–2 mean basic PWA install is pulled forward from Phase 10 into Phase 1. This is
deliberate — testing the game in a browser tab with a URL bar is not testing the real thing, and
"can he start it himself?" is part of what Phase 1 is measuring.

---

## Technical approach

- **Three.js**, stylised low-poly, angled camera for the 3/4 storybook view.
  Chosen because the three camera views — wide, follow, trackside — are genuinely different
  viewpoints. Faking those in 2D means three separate sets of artwork; in 3D the camera does it for
  free. Low-poly toy-railway geometry is also buildable in code (boxes, cylinders, simple lathes)
  without a modelling pipeline, which keeps the art achievable.
- **Vanilla TypeScript + Vite.** No game engine, no framework, no state library. The game is small,
  and a framework would be more moving parts than the game itself.
- **No build-time asset pipeline** beyond Vite. Everything bundles locally.
- **localStorage only.** No database, no server, no network calls of any kind at runtime.
- **Performance target: locked 60 fps** on Pixel Tablet. A 2023 tablet on Tensor G2 is comfortable
  for low-poly, but the screen is 2560×1600 — so render at a capped device pixel ratio rather than
  native.

### Structure

Content is separated from engine logic from the start — the one piece of architecture worth having
early, because it is what makes Phases 5 and 6 cheap:

```
src/
  engine/     track following, camera rig, input, audio  — reusable, knows nothing about the theme
  content/    engines, stations, scenery, sounds         — data
  ui/         the four buttons
```

---

## Pixel Tablet targets

| | |
|---|---|
| Screen | 10.95", 2560×1600, 16:10 |
| CSS viewport | ~1280×800 landscape |
| Orientation | **Landscape locked.** Portrait is not supported or designed for |
| Render resolution | Capped DPR (~1.5×), framerate over sharpness |
| Min touch target | 96 px; primary controls ~160 px |
| Install | PWA, fullscreen standalone, no browser chrome |
| Offline | Total. Airplane mode must make no difference |

---

## Asset and IP separation

This is a private family project, but the code should not depend on that staying true.

All engine appearances, names, faces, scenery and sounds are **original work created for this
project**, and live entirely in `src/content/`. The engine layer in `src/engine/` never references a
specific character, station or theme.

The practical consequence: the game can be shared, shown to other parents, or published without
anything needing to be unpicked.

---

## Build log

### Phase 9 — a first pass of polish

**The sky goes round.** `src/engine/sky.ts` owns the dome, the fog and both lights, and blends
between three looks: day, golden, and dusk. Most of the eight-minute round is plain day. The
darkest point is a blue-and-apricot dusk, with the ambient light still at three quarters of
daytime; a game he cannot see is a game that has stopped. Switching the setting off eases back
to day rather than cutting.

**Birds answer the whistle everywhere.** Until now only the places answered, so a whistle out in
the country did nothing. A flock of nine now goes up from whichever side of the line is dry ground,
wheels round and is gone in seven seconds, with a flurry of wingbeats and chirps. It rests for nine
seconds before it will go again. It does not go up in the tunnel.

### Phase 5 — the branch line, and The Windmill

**Both ways round are whole loops.** Rather than teach the train to follow a network, the railway is
two closed routes that are identical from The Sheds up to the points. While the engine is short of
the points, moving it from one loop to the other changes nothing about where anything is: not the
engine, not the cars behind it, not the camera. That is the only moment the points can be set, and
it is why the train, the cars and the cameras needed no changes at all. They hold one `Lines`
object (`src/engine/junction.ts`) and keep asking it where things are.

**Places hear the engine on their own line.** A place is built against the loop it stands on, and
each frame the world hands it the engine's distance measured on that loop: shifted by the extra
length once the lines have rejoined, and `NaN` while he is on rails that loop does not share. Every
"is he near" comparison with `NaN` is false, so the tunnel does not echo while he is out at the
windmill and the windmill does not whirl while he is in the tunnel. Stops work the same way.

**The Windmill** turns its sails slowly all the time. A whistle whirls them round with a rush of air
(a new synthesised sound, `whoosh`), and the sunflowers in front nod along. The mill is aimed at
the line coming in, so the sails are seen full on rather than edge on.

The branch keeps well out on the far side of the hill, where the ground is nearly level. Laying it
closer to the tunnel carved a canyon beside the portal.

### Phase 10 — fitting the tablet

Nothing had been measured on the tablet itself, so rather than guessing a shadow size the game now
measures its own frame rate and turns shadows down if it has to. The panel footer says which tier it
ended up on. If it says *Shadows off* on the Pixel Tablet, that is the number to look at before
adding more scenery.

The manifest now asks for fullscreen. An already-installed app picks this up when Chrome next
refreshes its copy of the manifest, which can take a day or so; reinstalling makes it immediate.

### Phase 8 — the grown-ups' panel

The nameplate had been a blank field on every engine since Phase 1 with nothing drawing it. It is
now painted onto both side tanks in the engine's own brass when a name is typed in, and taken off
again when the name is cleared. It is still the only text in the game, and still only there if a
grown-up puts it there.

The hello's name moved from a constant in `greeting.ts` to a setting, so it can be changed on the
tablet. The footer shows when the running build was made, which is the quickest way to tell whether
the tablet has picked up a push.

### Phase 6 — four engines, and something to pull

**Four engines.** The blue one he already knows, unchanged, and three original ones: a small green
engine that is quick off the mark with a high whistle, a big maroon one that takes its time and
rolls a long way when the lever is let go, and a yellow one in the middle of everything. They differ
in colour, face, chimney, whistle pitch and every number in the driving spec, and they are built by
the same `buildEngine` from the same boxes and cylinders.

**Their faces are drawn in code.** `src/content/faces.ts` paints eyes, brows, a mouth and a blush
onto a canvas from a dozen numbers, so a new engine needs no artwork, nothing to licence and nothing
to download. This is the first step of retiring the hosting question in *Open Questions*: the only
third-party image left in the build is the first engine's face, which stays because he knows it.

**Up to three cars** — two coaches, an open wagon with a load of logs, a tank wagon and a brake van
— sit behind the engine, each placed where the rails are that far back so the train articulates
round curves rather than dragging as a stick.

**Choosing is done by touching the thing itself.** Standing still in the yard, tapping an engine on
the siding puts him in it and puts his old one where that was; tapping a car couples it up, and
tapping one that is already coupled up takes it off again. It does nothing anywhere else on the
railway, so a stray thumb out on the line cannot change his train. Everything he could touch
breathes gently while he is standing there, which is the only invitation besides the halo on the
lever, and it stops the moment he sets off.

**What he chose is remembered** in `localStorage`. Coming back to find his engine put away and
somebody else's on the rails would be the game taking something off him.

Three more things were wrong and are worth recording: coaches had a flat roof floating above their
curved one; trees were being planted in the middle of the yard and occasionally in the four-foot;
and the throttle test looked like it had broken one engine when in fact the test had drifted into a
station's approach assist between runs.

### Phase 3 — the complete loop

Built after the Phase 1 test passed: he picked the tablet up, found the lever and drove, with
nothing said to him. That was the gate, and it is now behind us.

**The railway is six times the place it was.** One field with one station became a 642-metre circuit
with three stations, a tunnel, a level crossing and a bridge — a lap of about a minute and forty at
the top of the lever, against fifty seconds before. The ground is a heightmap now rather than a flat
disc, with one sheet of water under it that shows through wherever the land has been dug below it.
That one trick gives the pond, the river and the whole coastline for the price of a plane and a
height function.

**Every place is its own file** under `src/content/places/`, owning its geometry and its behaviour,
and the world does no more than hand each one the engine's position and pass on the whistle. Adding
a place is adding a file; none of them can reach each other.

**Nothing in any of them asks him for anything.** The gates come down because a train is coming. The
sheep look up because he whistled. The shed doors open because he is leaving. If he drives past all
of it without noticing, nothing is missed and nothing is waiting for him next time.

**The track is a network now.** Ten named segments joined end to end, assembled into one route that
is driven exactly as the single closed curve used to be. Verified against the old loop before any of
the world was built: same length to a tenth of a metre, closes to zero, no kink at any joint, and
arc-length accurate to a fifth of a millimetre per quarter-metre step. Junctions are a content
change now rather than a rewrite — which was the whole point of doing it first.

Three things were wrong and are worth recording, because all three were invisible until something
was looked at properly:

- **The roofs were turned a quarter-circle**, so every pitched roof lay across its building and
  read, from the wide view, as a grey slab dropped on the grass.
- **The sun's target followed the engine while its position stayed put**, so the light direction
  swung as he drove and dragged the edge of the shadow map across the fields. It is fixed over the
  whole layout now, and shadows are the same everywhere.
- **The level crossing had its sign backwards** and lowered its gates after he had gone through
  rather than as he approached. The doc comment that caused it was wrong too, and is fixed.

**Performance** is 194k triangles and 374 draw calls in the wide view, down from 905 before the woods
were instanced. Untested on the tablet — that is the first thing to check.

### The lever, and the hello

Two changes after watching him play *Magic Tracks*, both made before the Phase 1 test rather than
after it, because they change the thing the test is measuring.

**GO and STOP are gone, replaced by the lever.** This overturns *"no speed control"*, and it is
worth being clear that it does. The reasoning behind that decision was that a speed slider is an
option to weigh up, and he does not want options — which still holds. But the lever is not a slider;
it is one thing to hold, and it answers *how fast* as a side effect of *are we going*, which is a
question he never has to ask. Two buttons became one control, and the screen has one fewer thing on
it than it did. If the Phase 1 test says otherwise, GO and STOP are a small change back.

Concretely: `Train.setThrottle(-1 … +1)` replaced `go()` and `stop()`. Plus power is speed between
`slow` and `cruise`; zero is a long coast on `coast`; minus is `brake`, and near a platform it is
still the glide path that lands exactly on the mark. The dead zone is generous — a four-year-old's
thumb drifts — and the lever never latches, so an engine can never be left running by a control he
has walked away from.

**It says hello to him by name**, which is the one exception to *no speech*, and it is synthesised
by the device rather than recorded, so it is a string and not an audio file. Chrome on Android will
not speak until the page has been touched and an app opened from the home screen has not been
touched, so if nothing comes out it says it on his first touch instead. Either way the loading
screen never waits more than a couple of seconds on it.

**The one thing that did not change is the scope.** He liked driving through the place and disliked
being handed jobs, which is what this game was already going to be. It is now written down as a
decision rather than left as an absence — see *Explicitly not in this game*.

### Phase 1 — built, awaiting his verdict

Everything in *First milestone* is implemented and runs: `npm run dev`. See
[README.md](README.md) for how to run and deploy it.

Three decisions were made during the build that are worth recording here:

- **All audio is synthesised**, not recorded or downloaded. The whistle is two near-unison
  sawtooths plus breath noise, with a pitch swell going in and a sag coming out. Retuning it is
  changing `whistleHz`. This answers the open question about the whistle source, and removes any
  licensing question along with it.
- **The stopping model is a glide path**, not a brake. Within 30 m of a platform, pressing STOP
  puts the engine on `v(s) = v₀·√(s/s₀)` — constant deceleration spread over the whole remaining
  distance. It starts slowing within a fraction of a second, so the button visibly does something,
  and lands exactly on the mark from any press distance. Verified from 28 m down to 0.5 m.
- **The engine never drives itself.** STOP while stationary does nothing at all; an earlier version
  would have had it creep to the platform on its own, which is the game taking the decision away
  from him.

It is deployed and installable at **https://stonecrestpipes.github.io/little-engineer/**, and
pushed updates reach the tablet on the next launch rather than the one after. The public URL is a
deliberate short-term trade — see *Hosting* in [README.md](README.md) for how to tighten it.

**Not yet done, because it needs him:** the actual test. Phase 1 is finished when he picks up the
tablet and plays unprompted — not before.

### Phase 2 — mostly satisfied by Phase 1

Track-following along an arc-length-parameterised spline, the acceleration and braking curves, the
station assist and the camera rig are all built as reusable systems with content separated out.
What remains for Phase 2 is whatever the play test says to change.

---

## Open questions

1. **The engine's name.** Worth asking him — a four-year-old naming his own engine is free ownership
   of the game. The nameplate on the tank is blank until then, and it is the only text in the entire
   game. There are four engines now, so there are four names to be asked for, and the one he cares
   about is whichever he actually drives.
2. **Whether one loop is enough to be "exploring".** ~~Right now the place is a single field with
   one station in it.~~ Phase 3 answered this as far as it can be answered without him: there are
   now six places to drive through and a lap takes a minute and forty. What is still open is whether
   *a loop* is the right shape at all, or whether exploring means choosing where to go. Phase 5 put
   one choice in, after The Farm. Watch whether he notices the arrows, whether he picks the windmill
   on purpose or only by accident, and whether he goes back to it.
3. **How private the hosting should end up being.** It is on a public GitHub Pages URL with
   crawlers blocked, which was chosen to get it installed quickly. An original face for the blue
   engine and original icons now exist (a *Familiar* / *Original* switch in the grown-ups' panel,
   and `artwork/icons/`). Once he takes to the new face, deleting the photograph retires the
   question entirely — see *Hosting* in the README.
4. **How fast anything should go.** Each engine carries its own numbers now: 6.4 m/s at the top of
   the lever for the slowest, 8.0 for the quickest, and 2.4 to 3.2 at the bottom of the green. A lap
   is a minute and forty. All guesses until he drives them, and the spread between the engines is a
   guess on top of a guess — it is meant to be felt rather than noticed, and may be too small to
   feel at all.

---

## Companion files

Both are **Phase 0 artefacts and are now well out of date**. They are kept because they record what
was being aimed at before anything was built, not because they describe the game. Neither is loaded
by anything, and neither is worth updating unless somebody wants a printable version again.

- `Little Engineer - Game Plan.pdf` — this document as it stood at Phase 0, typeset for printing.
  It predates the lever, the world and the engines, so read this file instead.
- `mockups/` — eight artboards at true Pixel Tablet size (1280 × 800). They show GO and STOP rather
  than the lever, and one station rather than six places. Superseded by the game itself.
