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

- **Driving is two buttons, not a set of options.** He is not a throttle child chasing a top
  speed; he wants to set off, roll along and pull up. Green and red do all three, and how fast is
  a further press of green rather than a question he has to answer.
- **The whistle is a primary control, not a garnish.** Equal visual weight to the driving buttons,
  always on screen, always responsive, and the world answers it.
- **The camera button is a first-class control**, not a settings item. Flipping views is play.

### Later observation: what he liked in someone else's game

Watching him with *Thomas & Friends: Magic Tracks*, two things were clear, and they pull in
opposite directions:

- **The control was the good part.** A lever you push up into the green to go, let go of to ease
  off by itself, and pull down to stop. One thumb, no reading, and letting go is always safe.
- **Everything around it was in the way.** Errands to run, people to collect, prizes popping up
  over the view. He wanted to drive through the place and look at it, and the game kept
  interrupting to hand him a job.

So: take the driving, and take nothing else. This game is about going somewhere and watching it
go past. That is the whole of it. (The control itself went lever, then back to buttons, when he
asked — see the build log. What never moved is the *nothing else*.)

---

## Settled decisions

| Area | Decision |
|---|---|
| **Name** | Little Engineer |
| **Core gameplay** | Drive a train round the railway; stop at stations; whistle at everything; watch it go |
| **Controls** | GREEN, RED and a small R, plus WHISTLE, two voice buttons and CAMERA. Two picture arrows as well, while coming up to a junction |
| **Driving** | Green goes, and green again is full steam. Red stops, and near a platform it stops on the mark. R backs up while it is held |
| **Objectives** | **None.** No errands, no collecting, no prizes, nothing that pops up over the view |
| **Greeting** | Spoken by name when the app opens, and nothing else is ever spoken |
| **Camera** | One big button cycles four fixed views: **Wide**, **Above**, **Follow**, **Trackside**. Green from Wide comes down to the train |
| **World** | A loop with four branch lines, six stations and six more places to drive through, as a play-mat layout. No end, no fail |
| **View style** | Storybook 3/4 — angled overhead, toy railway on a table |
| **Activities** | Station comes alive · the world answers the whistle · choose a way at the points |
| **Track interaction** | Automatic, except four junctions he may choose at. Touching nothing always goes the usual way |
| **Difficulty** | Generous stopping zone with gentle auto-assist. He cannot miss |
| **Failure states** | **None whatsoever.** Overshooting simply means going round again |
| **Rewards** | None. What would have been a sticker book is a scrapbook only the grown-ups see |
| **Audio** | Sounds and animation only. No speech, in any phase |
| **Sessions** | Endless free play. Start instantly, stop anytime, nothing is lost |
| **Parent controls** | Hold the top-right corner for three seconds |
| **Engines** | Five, each a different shape with its own number. He picks one in the roundhouse, and watches it come out |
| **Cars** | Up to three, chosen the same way. Nothing to do with them |
| **Artwork** | Original engines and scenery, designed for this project. The first engine's familiar face is the one exception, with an original ready to replace it |
| **Delivery** | Installable offline PWA on a free static host |

---

## The world

A single continuous loop, laid out so that most of it is visible at once in Wide view — the feel of
looking down at a wooden train set on the floor.

**The track is generated, not drawn.** The main line is one closed curve cut into named segments;
each branch is a lobe of exact circular arcs and straights that leaves and rejoins on the main
line's own heading and eases into every bend. The consequence worth knowing: *the radius of a
branch's curves is not a free choice.* The far end of a lobe turns a half circle, so its two
straights are anti-parallel and the sideways distance between its two junctions has to be made up
by the arcs — which means the radius is whatever closes that gap. A gentler curve means putting the
junctions further apart, and nothing else will do it. That, and not a wish for a longer run, is why
the main lap is 1,100 m rather than the 642 it started at. See the comment above `SEGMENTS` in
`src/content/world.ts`.

**The numbers that matter, measured across all sixteen loops:** the sharpest curve anywhere is
**33 m radius** (it was 1.2 m when his son first said a corner did not look right, and 14.8 m after
the first re-lay); **no two sets of points are closer than 190 m** (56 m originally — the second
question used to be on screen before he had answered the first); the home platform is **67 m** from
the first junction, against 22. A startup check in development builds warns on anything under 28 m,
because the way this goes wrong is silent: the rails still join up and the train still follows them.

**One rule holds everywhere else track is drawn, too:** *the running line curves, so ask where the
rails actually are.* The yard is laid out in its own frame with +z along the track, and the line
swings six and a half metres across that frame between the platform and the far end of the sidings.
Four separate things had been built assuming it ran straight — both roundhouse throat roads, the
pilot's road, and the water tower's spout — and every one of them missed what it was aimed at. The
sidings are now held at a fixed distance from the *line* rather than from the frame, so their
clearances are exact rather than hopeful.

The main lap is **1,100 metres**, about **two and a half minutes** at full steam. Taking every
branch is **2,432 metres** — more than twice round the long way, and the better part of six minutes. Most of it is visible at once in Wide view. The order round it is: The Sheds → across the meadow and over the
level crossing → The Farm → up the hillside and through the tunnel → down to the river and over the
bridge → The Harbour → back along the shore to home.

**Stations (three).** Each has a distinct silhouette and colour so it is identifiable with zero
reading:

| Station | Identity | Signature moment |
|---|---|---|
| **The Sheds** | Red brick, home, the roundhouse | The doors come open one by one, and the swap |
| **The Harbour** | Blue, boats, water, cranes | A boat sounds its horn back, lower and slower |
| **The Farm** | Green, barn, animals, hay | Every sheep looks up at once, and answers |
| **The City** | Grey towers, a street, the rescue station | The siren goes and the helicopter lifts off the pad |

**Trackside features** between stations, so things happen while simply driving:

- A **tunnel** — whistle inside produces an echo
- A **level crossing** — gates lower, a car waits, the driver waves
- A **bridge** — the river running underneath, and a boat working up and down it
- **The woods**, on the branch north-east of the meadow — two hundred and twenty metres
  with the canopy closed over the line, A-frame cabins among the trees with their windows lit, and
  deer that put their heads up at a whistle and bound away through the wood. An owl
  answers. It is the brick tunnel done in leaves, and it is the reason to take that branch.
- **The building site**, at the end of the city's street — one more tower going up, with a
  tower crane that swings all day, a digger working its arm, scaffolding and hoardings.
- **The drawbridge**, where the lighthouse line crosses the creek — it stands *up*, not down,
  with a boat putting through underneath, and rings its bell and lowers itself as he comes round the
  bend. It cannot fail and cannot catch him out: if he arrives early it hurries.
- **The SS Badger** alongside the quay at The Harbour — the Ludington car ferry, black hull, white
  decks, one big funnel, four times the size of anything else on the water. She is what answers the
  whistle now.
- **The ranch**, at the top of the same branch — a fenced field with a pool in it and
  eight capybaras, two of them standing in the water. Whistle and every head turns toward
  the engine and they squeak back; the two in the pool heave themselves up out of it.

**The country itself** is a heightmap rather than a flat plane: rolling ground, a hill for the
tunnel, a pond in the middle of the loop, a river running from it out to the sea, and a coastline
at the back. There is one sheet of water across the whole map, and it shows wherever the ground has
been dug below it — so the shoreline is a consequence of the land rather than a shape anyone drew.

Track is a closed circuit. The engine always follows it. There is no steering and no way to leave
the rails — but there are now **four places where it divides**, and at each of them two picture
arrows let him pick. Touch nothing and it goes the usual way.

| Where | The usual way | The branch |
|---|---|---|
| Leaving The Sheds | across **the meadow** and over the level crossing | the long way round to **the city** |
| Across the meadow | past **The Farm** | round through **the woods** and the ranch |
| After The Farm | through **the tunnel** | round the hill to **The Windmill** |
| After The Harbour | **home** along the shore | out to **The Lighthouse** on the point |

Underneath it is a **network of named segments** rather than one closed curve, joined end to end and
driven as one route. Four junctions means **sixteen whole loops**, each a list of references to the
same segments — which costs almost nothing, and is what lets the points be set *before* he reaches
them without anything that drives, follows or couples up knowing junctions exist at all. See
`src/engine/junction.ts`.

The one rule the layout has to obey: **every loop passes every junction, in the same order.** A loop
that skipped one would have nowhere to put the question when the arrows asked it.

---

## Controls and screen layout

Designed landscape-first. A four-year-old holds a tablet like a steering wheel, so the primary
controls sit in the **bottom corners** where thumbs already are — never along the top.

```
┌─────────────────────────────────────────────────────┐
│  [camera]                                  version  │
│                                           ╭───╮     │
│                  the railway              │ ▲ │     │
│   ( )  ( )                                ╰───╯     │
│  ┌─────────┐                        (R)   ╭───╮     │
│  │ WHISTLE │                              │ ■ │     │
│  └─────────┘                              ╰───╯     │
└─────────────────────────────────────────────────────┘
```

- **GREEN** (bottom-right, upper) — press it and the engine goes. Press it again and it goes at its
  own top speed. A third press does nothing, so there is never a wrong number of presses.
- **RED** (bottom-right, lower) — press it and the engine stops. Anywhere near a platform it stops
  exactly on the mark.
- **R** (bottom-right, small, beside red) — held down, the engine creeps backwards at about a metre
  a second. Let go and it stops. It is for easing up to a car in the yard, not for getting anywhere.
- **WHISTLE** (bottom-left) — always available, whether moving or stopped, always responds
  instantly, and can be hammered repeatedly with no penalty or cooldown.
- **THE TWO VOICES** (bottom-left, small, above the whistle) — one says *All aboard!* and the other
  *Full steam ahead!*, in the same device voice that says hello. Each says the same thing every
  time, because that is the only way he can learn which is which without reading them.
- **CAMERA** (top-left, small but clear) — cycles the four views.
- **The junction arrows never show while he is standing still.** The city's points are twenty metres
  off the end of The Sheds, so they used to come up over the middle of the yard — over the
  turntable, the roundhouse doors and the spare cars, which are the whole of what he is looking at
  while he is standing there. Arrows are for choosing where to go; they are back the moment he
  presses green.
- **A drag anywhere on the railway** swings the view round, within limits that cannot put it
  underground or point it at the sky, and it eases back to the proper shot once he is moving again.
  A press that stays put still picks things up in the yard; a press that travels looks instead.

Three things about the driving matter more than they look:

- **Green and red latch. R never does.** Whatever he pressed last is what the engine is doing, and
  it stays that way until he presses the other one — which is the whole reason he asked for
  buttons. The trade is that an engine can now be left running by a control he has walked away from,
  which the lever made impossible. R is the exception, because a train reversing on its own is the
  one version of that worth refusing.
- **Coasting and stopping are different, and feel different.** With no power on, the engine takes
  about six seconds and twenty metres to come to rest — it is easing off. On red it takes two
  seconds and eight metres — it is stopping. That difference is most of what the buttons teach, and
  it is learned by doing rather than by being told.
- **Pressing R never lurches.** Whichever way it is rolling it comes to a stand first and sets off
  backwards after, so R is safe to press at any moment — including at speed, where it is simply a
  slower stop.


**Touch targets: minimum 96 px, primary buttons ~160 px.** Well above the 48 px adult minimum;
a four-year-old's aim is poor and the tablet is heavy.

Every button responds within one frame with *three* simultaneous confirmations: visual (press and
glow), motion (the thing it controls reacts), and sound. Immediate feedback matters more than
realism.

---

## Camera system

One button, four fixed views, cycling in a fixed order — widest first, each one closer in than the
last — so the sequence becomes predictable:

1. **Wide** — the whole layout from 200 m up and 230 m back, train small, best for watching it go
   round. Default.
2. **Above** — a bird's-eye that follows the train from behind and about 36° above it, pulled back
   far enough that the engine *and everything coupled to it* are in frame at once. How far back is
   worked out from the train's actual length, so it frames a light engine and a three-car train
   equally well. This is the view that answers "I want to see my whole train".
3. **Follow** — 14.5 m behind the engine and 6.4 m up, looking 12 m ahead, track moving beneath.
   The "driving" view. The engine fills the frame and the cars are mostly behind the camera.
4. **Trackside** — a low fixed shot 10.5 m beside the rails, picking whichever of twelve anchors
   the train is heading toward; the train enters, passes, and leaves the frame. Cinematic, and the
   one that makes a toy railway feel like a real one.

**Pressing green from Wide brings the camera down to the train**, into *Above*. Setting off from a
shot where the train is a speck means the one thing he just did is invisible, which makes the button
feel broken. *Follow* and *Trackside* are already at train level and are left alone.

No free camera and no pinch-zoom. A drag swings whichever view he is in, within limits that cannot
put it underground or aimed at the sky, and a high shot is additionally floored at the ground
beneath it — except while the engine is under the hill, where lifting the camera clear would put the
hill between him and his own train for the best five seconds of the lap. Transitions are smooth
glides, never cuts.

---

## The engines, and telling them apart

Five of them, and the thing that tells them apart has to work from right across the layout, long
before the colour and long, long before any name. So each one has **a different silhouette and a
number painted on its side**:

| | Shape | | |
|---|---|---|---|
| **1** | side tanks, plain stovepipe, no dome | blue | the one he started with |
| **2** | side tanks, tall bell-mouthed chimney, dome | yellow | deliberately nobody in particular |
| **5** | **a tender engine** — no tanks, splashers over the wheels, a tender of coal behind | red | eleven metres against everyone else's six |
| **6** | **a saddle tank** — one tank draped over the boiler | green | squat, round, the smallest |
| **—** | **a streamliner** | silver and blue | the Orion Express |

**Numerals are not reading.** He cannot read a word and will not try, but he knows the shape of a
number on the side of an engine the way he knows the shape of a face — which is exactly why real
engines carry them. Each is painted big and plain, in that engine's own trim colour on a disc so it
reads against any livery. If a grown-up paints a name on the tanks instead, the number hides: nothing
on an engine's side is ever two things at once.

All of it is original work, built from the same boxes and cylinders as everything else — see *Asset
and IP separation* below. What was bought with the shapes is recognition, not resemblance.

---

## The Orion Express

Five engines now, and the fifth is not like the others. Every one of them is a stubby little tank
engine; the Orion Express is a **streamliner** — one long fluted stainless body with a shovel nose, a
deep blue roof and skirt, the wheels tucked away underneath, no rods and no chimney — with two silver
coaches of its own, one of them round-ended. It is the quickest thing on the railway, the smoothest
away from a stand, and the only one you can name from the other side of the layout.

It is named after the boy whose railway this is, and it is the only engine that comes with a
nameplate already painted on.

Mechanically it is one flag: `kind: 'streamliner'` on the spec picks `buildStreamliner` instead of
`buildEngine`, and both return the same thing, so nothing above that file knows there are two kinds.
`shape.smoke: false` keeps the steam off a roof that has no chimney on it.

---

## The roundhouse, and how he picks an engine

Five roads round a turntable, a pair of doors on each, and an engine asleep behind every door but
the one whose engine is out on the train. **This is the only way to pick an engine**; there is no
list, no panel and no siding full of spares to choose from. It replaced exactly that, because two
ways to do one thing is one too many.

Standing still in the yard, the doors come open by themselves, one after another rather than all at
once, and the turntable swings round to whichever is widest. Touching an engine behind an open door
takes it. Touching one behind a shut door opens the door — which is the whole of "open the door,
then pick the engine" without a second control to learn.

**The swap takes about fifteen seconds and nothing else happens while it does.** His old engine pulls
forward off its train and sets back down the *arrival* road into its own place; at the same moment
the new one comes out of its road, up the *departure* road past the platform, and sets back onto the
front of the train, finishing with a clank. Two throat roads rather than one is the whole reason it
is fifteen seconds instead of twenty-five: on a single road the second engine cannot start until the first
has finished with it.

It is the longest single thing in the game, and it is meant to be — a thing to watch rather than a
menu, in the same spirit as the station arrival. **Pressing green abandons it instantly**, with
every engine put where it was going, because wanting to drive always wins. That rule is why the
fifteen seconds are affordable at all.

**The yard pilot** is the other thing in there: a little green saddle tank on a road of its own
beside the spare cars. He cannot drive it and it is not in the roundhouse — it shuffles up and down
all day with a pause at each end, and when he takes a car it runs down to where that car was
standing and whistles, because *something* put it on the train. Tapping a car still couples it
instantly: a car is three taps to build a train and it has to stay quick.

Driving the whole car across the yard is designed and not built. It wants a fan of short spurs
rather than one siding — a second roundhouse, essentially — because on a single road the fifth car
cannot come out without pushing through the four in front of it, and the exit has to sit behind the
tail of a three-car train, which puts the yard fifty metres further back and every delivery at
thirteen to eighteen seconds. Worth doing if the pilot turns out to be the thing he watches.

Underneath, `src/engine/shunting.ts` knows nothing about engines, sheds or doors: a move is an
object, a list of points, a speed, and which way round the thing faces while it travels — which is
the whole of what "setting back" means. Everything else on the railway is placed from one number,
how far the train has got; this is the only thing that is not.

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

### Phase 1 — Toddler UX prototype *(passed)*
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
the bridge. Two big arrows appear bottom centre as he comes up to the points (nine seconds out at whatever speed he is doing,
though never while he is standing still — arrows are for choosing where to go, and if he is not
going he does not need them), each with a picture of where it goes: the tunnel, or
the windmill. The one the points are set for is green. They are set for the main line every time
round, so the branch is always something he chose; if he touches nothing, nothing changes. The
grown-ups' panel can switch the arrows off. A lap by the windmill is 1,427 m against 1,100.

A second junction followed the same day, just after The Harbour: the main line bears left for home,
and the branch carries on along the sea wall to **The Lighthouse** on the headland, rejoining up
the west bank. Its arrows show a house and a lighthouse. Taking both branches makes a lap of 1,701 m.

### Phase 6 — More engines, and something to pull *(built)*
*Five* engines in the end, reusing the same controller — and differing in **shape** as well as in
colour, face, chimney, whistle and how they
drive. Up to three cars behind whichever one he picks.

Choosing happens in **the yard at The Sheds**, and by touching the thing itself: the other engines
stand on a siding and the spare cars on another, and tapping one puts him in it. There is no
selection screen, no list and no menu — which is the point, and is why it is a place he drives to
rather than a screen that interrupts him.

No unlocking, no cost, nothing earned. Every engine and every car is there the first time he opens
the app, and an engine on its own is as valid a choice as three cars.

### Phase 7 — Gentle progression *(built, as a grown-ups' scrapbook)*
An optional local sticker book recording places visited and things seen. Nothing can be lost, nothing
expires, nothing pressures him to return.

As built, the record exists but he never sees it. A sticker book on screen would be collecting,
which *Explicitly not in this game* rules out, and a fourth control besides. Instead the top of the
grown-ups' panel is a scrapbook: days played, distance driven, whistles blown, stops made, which
places he stops at, which engines he drives, and which way he goes at the points. It is kept only
on the tablet, in `src/journal.ts`, and can be cleared from the panel.

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

Second pass, the same day, all of it the world answering the whistle or the arrival: the engines
standing in the yard whistle back one after another in their own voices (each with a little hop),
the car waiting at the crossing toots twice, the engine sighs out a cloud of steam as it comes to
rest at a platform, and every station's lamp comes up softly at dusk.

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

### Twenty things off a list, and a railway twice the size

Built straight from a wish list rather than from watching him, which makes it a different kind of
build: almost none of it is validated, and the README says so.

**Four junctions instead of two**, so sixteen whole loops. The main lap is 1,100 m; taking every
branch is 2,432 m. The two new branches each carry their own country — **the woods** (a tunnel of
trees with the canopy closed overhead, A-frames, deer, an owl) and **the ranch** on one; **the city**
(towers, a street, the rescue station, a building site) on the other.

**A roundhouse** replacing the siding full of spares, with a twelve-second engine swap on two throat
roads. **A fourth view**, *Above*, and green from Wide now comes down to it. **Five engines with
five silhouettes and numbers on their sides**, including the **Orion Express**. **The SS Badger** and
**a drawbridge** that stands up and lowers itself as he comes round the bend. **A yard pilot** that
works the shunting yard.

Four bugs fell out of it, all of them the kind that hide rather than announce themselves:

- A place on a branch is handed **NaN** for the engine's distance while the engine is elsewhere —
  that is the mechanism that makes a branch not hear him, and every comparison with it is safely
  false. The ranch did arithmetic with it and handed it to the curve, which threw from six calls
  deep inside three.js and took the whole frame loop with it. Routes now refuse a distance that is
  not a number and say why; there are tests for both halves.
- **Free spans only worked on the main line.** Every terrain sample off it reported a distance
  outside every span, so no branch could carry a bridge or a tunnel. Samples remember their line now.
- **A vehicle's origin is its middle**, and the middle of an engine with a tender behind it is not
  the middle of the engine. The red one rode a metre ahead of where its cars thought it was.
- **Everything `Shunting` moves is a child of the scene**, and its paths are in world coordinates.
  The yard pilot belongs to the yard's own frame; a world path put it through that transform twice
  and left its geometry seventy metres out in a field — invisible, rather than obviously wrong.

And two things deliberately *not* built, with the reasoning written down rather than rediscovered:
the pilot carrying cars across the yard (above), and the idle coast (open question 5).

### GO and STOP come back, and a way to look round the yard

He played it, and asked for four things: buttons instead of the lever, other cars to hook up and
haul around, a small R for reverse, and — separately, and the most useful sentence anyone has said
about this game — that *the joystick covers the extra train cars, so it is hard to select and add
them.*

**The lever is gone; green and red are back.** This reverses the decision recorded below, which
predicted its own reversal: *"if the Phase 1 test says otherwise, GO and STOP are a small change
back."* It was a small change back. What the lever had that two buttons do not is that it could
never be left set, and that is genuinely lost: the engine now goes round and round until he presses
red. What it did not have is the thing he actually wanted, which is to put the train in a state and
then have both hands back. Green keeps three speeds out of the lever's range — first press ambles, second is a middle gear,
third is full steam — so fast against slow survives as a count of presses rather than as a thumb
held at a height. The middle gear was added after watching him: full steam is quick enough that a
bend arrives before he has decided anything about it, and without a gear between, the only way to
have time to think was to potter.

**R creeps backwards while it is held**, at 42% of the engine's gentlest forward speed, which is
about 1.2 m/s. Pressing it at speed is a stop followed by a reversal rather than a lurch, so it
cannot be pressed wrongly. Backing through a platform deliberately does not count as arriving.

**Hauling cars was already built** — five of them, up to three at once, chosen by walking up to them
in the yard and tapping one. The reason it looked missing is the fourth thing he said: the controls
sit on top of the yard. Two answers, both built:

- **The view turns to face the yard by itself** whenever he is standing still at The Sheds:
  three-quarters on, from off the end of the two sidings, so every car and every spare engine is in
  the clear at once. Square on would be better, but the engine shed stands beyond the car road and a
  camera out there is looking at the back of it. What the buttons cover in that shot is the shed
  roof — the one thing in frame he has no reason to touch. Backing up counts as still being in the
  yard, because shunting is exactly what reverse is for; pulling forward gives the ordinary view
  back, and so does the camera button.
- **Dragging swings the view**, which is what he asked for in so many words. A press that stays put
  is still a pick, so nothing was taken away to add it.

**A fifth thing, unasked: the yard's flat ground was on the wrong side of the line.**
`cross(tangent, up)` points at the engine's right and the yard is on its left, so the 24-metre patch
meant to stop the sidings following the contours was being flattened 27 metres away in open country.
Found while working out where to put the yard camera.

**Two voice buttons**, saying one thing each, and **the version in the top-right corner** so whoever
picks the tablet up can see whether it has caught the latest push without opening the grown-ups'
panel.

### Fewer draw calls

Two new places took the wide view to 1,559 draw calls with shadows, because everything is built
from small boxes and cylinders and each one is drawn separately, twice over for the shadow map.
`src/engine/merge.ts` now bakes every part that never moves into one mesh per material after a
place, an engine or a car is built — 899 draw calls for the same picture. The source stays in small
editable pieces; the one rule is that anything that animates is marked with `moving()`, including
parts that move inside something else that moves (a sheep's neck, a gull's wings). `mat()` now
hands out one shared material per colour, which is what makes the merging possible, so a material
from `mat()` must never be changed after the fact; anything that glows or fades makes its own.

### Phase 9, second pass — more answers

Four small things, chosen because the whistle and the arrival are the two things he was seen doing
most: the yard's spare engines whistle back in turn (`answer`, using each engine's own pitch), the
car at the crossing toots (`toot`), arriving lets out a long hiss of steam (`sigh`, with five
puffs), and station lamps glow at dusk through one shared `setEvening` in `station.ts`. Each answer
is rationed so that hammering the whistle does not turn the railway into a racket.

### Phase 5, again — the coast line, and The Lighthouse

**Four ways round.** Two junctions make four loops, numbered by which branches they take. The rule
from the first junction still holds, stated more generally: two loops are identical up to the first
place they part, and the engine may move between them only while it is short of that place.
`Lines` works out that place for every pair of loops, and converts a distance from one loop to
another by finding which segment it is on, so a place on the coast line never needs to know about
the windmill, and the other way round.

**The Lighthouse** stands on the headland, red and white, with a lamp that turns all the time and a
pale beam sweeping round. Four gulls circle the top. A whistle brings a foghorn back — a new
synthesised two-note `foghorn` — and the lamp flares, spins faster and the gulls wheel wider.

The line runs right along the water's edge from The Harbour, which the terrain turns into a low sea
wall. The joints where it leaves and rejoins bend by about ten degrees, the same as the windmill's;
that is what a turnout looks like at this scale.

### Phase 7 — the scrapbook

The sticker book turned into something for the grown-ups instead: `src/journal.ts` quietly counts
days played, metres per engine, whistles, stops per place, and turns at the points, and writes them
to the tablet every fifteen seconds and whenever the app is put away. The panel draws them as tiles
and bars when it opens. It is also the most useful playtest tool the game has, since it records
what he did when nobody was watching.

Alongside it, the blue engine gained an **original drawn face**, switchable in the panel, and
original app icons were drawn from it into `artwork/icons/`. Retiring the third-party imagery is
now three small steps, listed under *Hosting* in the README.

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

**Updates → Check now** was added later, for the same question asked the other way round. The app
is cached in full so it runs in flight mode, so the build a grown-up just pushed is not necessarily
the build the child opens — `src/ui/updates.ts` applies a new one only at a moment that interrupts
nothing, which may be hours away. The button asks the host now and says which of four things
happened, because "nothing happened" and "nothing needed to happen" are indistinguishable
otherwise. It is the one control in the panel that deliberately ignores the never-interrupt rule:
somebody has asked for it on purpose, with the panel open and the game already let go of.

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
green button, and it stops the moment he sets off. Standing still here is also what turns the view
round to face the yard, so that what he can touch is what he can see.

**What he chose is remembered** in `localStorage`. Coming back to find his engine put away and
somebody else's on the rails would be the game taking something off him.

Three more things were wrong and are worth recording: coaches had a flat roof floating above their
curved one; trees were being planted in the middle of the yard and occasionally in the four-foot;
and the throttle test looked like it had broken one engine when in fact the test had drifted into a
station's approach assist between runs.

### Phase 3 — the complete loop

Built after the Phase 1 test passed: he picked the tablet up, found the lever and drove, with
nothing said to him. That was the gate, and it is now behind us.

**The railway is six times the place it was.** One field with one station became a 1,100-metre circuit
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
   game. There are five engines now — though the Orion Express came with its own — so there are four
   names to be asked for, and the one he cares
   about is whichever he actually drives.
2. **Whether one loop is enough to be "exploring".** ~~Right now the place is a single field with
   one station in it.~~ Phase 3 answered this as far as it can be answered without him: there are
   now twelve places to drive through — six of them with a platform — and the main lap takes a
   minute and forty. What is still open is
   whether *a loop* is the right shape at all, or whether exploring means choosing where to go.
   There are **four** choices a lap now — the city, the woods, the windmill and the lighthouse — and
   taking all of them makes a lap 2,432 m. Watch whether he notices the arrows, whether he picks a
   branch on purpose or only by accident, and whether he goes back to one. The scrapbook counts
   every turning at all four.
3. **How private the hosting should end up being.** It is on a public GitHub Pages URL with
   crawlers blocked, which was chosen to get it installed quickly. *Raised again on 2026-10-01 and
   deliberately left public* — but note what has changed since: the engines now carry numbers and
   shapes chosen to be recognised, which is a good reason to retire the question rather than a
   reason to forget it. **The blue engine wears its own drawn face from v0.3.1**, which is the half
   of this that was always waiting on him. The photograph is still in the repo and still one tap
   away in the grown-ups' panel. If he takes to the drawn face, deleting the photograph retires the
   question entirely — see *Hosting* in the README.
4. **How fast anything should go.** Each engine carries its own numbers: 6.4 m/s on the second
   press of green for the slowest, **9.0 for the Orion Express**, and 2.4 to 3.2 on the first press.
   The main lap is a minute and forty; taking every branch is nearer three minutes. All guesses
   until he drives them, and the spread between the engines is a guess on top of a guess — it is
   meant to be felt rather than noticed, and may still be too small to feel at all, though the
   Orion widened it considerably.
5. **Whether a latching green needs an idle coast.** *(Deferred on purpose — noted 2026-09-29,
   still not built, and still waiting on the same thing.)* Green and red latch, so unlike the lever they can be walked away from and the engine
   goes round and round on its own. The fix, if it turns out to be needed: after about a minute with
   nothing touched at all, come off the power and let it roll to a stand on `coast` — never brake,
   never stop it dead, and never while he is actually driving. That keeps his buttons exactly as
   they are and puts back most of what the lever gave for free. It is roughly a dozen lines in
   `src/main.ts`: a timer reset by `touched()`, calling `controls.letGo()` when it runs out.
   **Do not build it until he has been watched with the buttons** — a train that stops itself while
   he is looking out of the window is a worse problem than one that keeps going, and which of those
   is true is exactly what the next play tells us.
6. **Whether the yard pilot should actually carry the cars.** *(Deferred on purpose —
   2026-10-01, with the reasoning under *The roundhouse* above.)* Tapping a car couples it
   instantly, which is quick, and the pilot only shuffles about and acknowledges him. Doing it
   properly costs thirteen to eighteen seconds a car and wants the yard relaid as a fan of spurs.
   Build it only if the pilot turns out to be the thing he watches.

---

## Companion files

Both are **Phase 0 artefacts and are now well out of date**. They are kept because they record what
was being aimed at before anything was built, not because they describe the game. Neither is loaded
by anything, and neither is worth updating unless somebody wants a printable version again.

- `Little Engineer - Game Plan.pdf` — this document as it stood at Phase 0, typeset for printing.
  It predates the lever, the world and the engines, so read this file instead.
- `mockups/` — eight artboards at true Pixel Tablet size (1280 × 800). They show GO and STOP rather
  than the lever, and one station rather than twelve places. Superseded by the game itself.
