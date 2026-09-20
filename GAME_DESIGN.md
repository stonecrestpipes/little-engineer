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

- **No speed control.** GO / STOP only. A speed slider would add complexity serving an appetite he
  doesn't have. (Revisit only via parent settings, Phase 8.)
- **The whistle is a primary control, not a garnish.** Equal visual weight to GO and STOP, always
  on screen, always responsive, and the world answers it.
- **The camera button is a first-class control**, not a settings item. Flipping views is play.

---

## Settled decisions

| Area | Decision |
|---|---|
| **Name** | Little Engineer |
| **Core gameplay** | Drive a train round a continuous loop; stop at stations; whistle at everything; watch it go |
| **Controls** | GO, STOP, WHISTLE, CAMERA. Four buttons. Nothing else on screen |
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
| **Engines** | One engine in MVP. Engine selection deferred to Phase 6 |
| **Artwork** | Original engines and scenery, designed for this project |
| **Delivery** | Installable offline PWA on a free static host |

---

## The world

A single continuous loop, laid out so that most of it is visible at once in Wide view — the feel of
looking down at a wooden train set on the floor.

**Stations (MVP: three).** Each has a distinct silhouette and colour so it is identifiable with zero
reading:

| Station | Identity | Signature moment |
|---|---|---|
| **The Sheds** | Red brick, home, where play begins | Doors open as the engine leaves |
| **The Harbour** | Blue, boats, water, cranes | A boat passes and sounds its horn back |
| **The Farm** | Green, barn, animals, hay | Sheep look up when whistled at |

**Trackside features** between stations, so things happen while simply driving:

- A **tunnel** — whistle inside produces an echo
- A **level crossing** — gates lower, a car waits, the driver waves
- A **bridge** — water underneath, a boat may be passing

Track is a closed circuit. The engine always follows it. There is no steering, no switching, and no
way to leave the rails.

---

## Controls and screen layout

Designed landscape-first. A four-year-old holds a tablet like a steering wheel, so the primary
controls sit in the **bottom corners** where thumbs already are — never along the top.

```
┌────────────────────────────────────────────────────┐
│  [camera]                                          │
│                                                    │
│                   the railway                      │
│                                                    │
│                                                    │
│  ┌──────┐                              ┌──────┐    │
│  │  GO  │          [WHISTLE]           │ STOP │    │
│  └──────┘                              └──────┘    │
└────────────────────────────────────────────────────┘
```

- **GO** (bottom-left, green) and **STOP** (bottom-right, red) — large, opposite corners so they
  cannot be confused or hit by accident.
- **WHISTLE** (bottom-centre) — always available, whether moving or stopped, always responds
  instantly, and can be hammered repeatedly with no penalty or cooldown.
- **CAMERA** (top-left, small but clear) — cycles the three views.

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

No speech, in any phase. Sounds and animation carry everything.

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

accounts · logins · internet requirement · ads · purchases · currency · XP · levels · daily rewards ·
streaks · timers · countdowns · scores · lives · derailment · collisions · red-signal penalties ·
tutorials · text instructions · menus more than one tap deep · analytics · cloud saves · servers ·
any ongoing cost.

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

### Phase 3 — The complete loop
Build out the full world: three stations, tunnel, crossing, bridge, and the polished station moment
described above. The first version that is genuinely *the game* rather than a test.

### Phase 4 — Activity system
Small toys, added one at a time, never chores: freight wagons to collect and drop off, a findable
animal, an engine wash, a branch to tap off the track, a visiting engine. Each must be ignorable.

### Phase 5 — Expand the railway
Extend the loop with new areas that connect to the existing world rather than replacing it. Junction
choice with two very large arrow buttons arrives here, if Phase 4 shows he wants agency.

### Phase 6 — More engines
A second and third engine reusing the same controller, differing in appearance, whistle, sound and
small animation flourishes. Visual selection screen, no text.

### Phase 7 — Gentle progression
An optional local sticker book recording places visited and things seen. Nothing can be lost, nothing
expires, nothing pressures him to return.

### Phase 8 — Parent settings
Long-press gesture to a hidden panel: assist strength, speed control on/off, junctions on/off, which
activities are enabled. This is how the game grows with him from four to six.

### Phase 9 — Polish
Only for things he actually uses repeatedly. Weather, day/night, more scenery, more sounds, more
character reactions.

### Phase 10 — Pixel Tablet packaging
Full PWA: offline service worker, bundled assets, local storage, fullscreen, home-screen icon.
*(Basic installability is worth bringing forward into Phase 1 — see below.)*

---

## First milestone

Deliberately tiny, and the only thing Phase 1 has to achieve:

1. Tap the icon on the Pixel Tablet home screen.
2. It opens fullscreen, instantly, offline.
3. One engine sits on one loop.
4. Tap **GO** — it moves.
5. Tap **STOP** — it stops.
6. Tap **WHISTLE** — a proper whistle, immediately.
7. Tap **CAMERA** — the view changes.
8. Arrive at one station — something visibly happens.
9. Keep driving as long as he likes.

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
   game.
2. **Where the build is hosted.** A free static host is decided; which one is not. It only matters
   for how updates reach the tablet — and installing to the home screen needs HTTPS.
3. **Cruise speed.** Currently 7.2 m/s, a lap in about a minute. This is a guess until he drives it,
   and is the first number I would expect to change.

---

## Companion files

- `Little Engineer - Game Plan.pdf` — this document, typeset for reading and printing.
- Mockups — eight artboards at true Pixel Tablet size (1280 × 800): the three camera views, the
  station moment, the control spec, the home-screen icon, the loop plan and the engine sheet.
