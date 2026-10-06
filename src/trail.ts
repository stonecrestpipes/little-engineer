/**
 * A time-ordered trail of everything he touches, for the grown-ups.
 *
 * `journal.ts` keeps the totals — how far, how many whistles, which places.
 * Totals say what he did; they cannot say in what order, or how long he waited
 * before doing it, or what he pressed immediately after something confusing.
 * This keeps the beats themselves, stamped with the time and with where the
 * train was, so that "he put it down after four minutes" has somewhere to be
 * asked why.
 *
 * The same rules as the scrapbook: he never sees any of it, nothing counts
 * toward anything, nothing leaves the tablet unless a grown-up presses a
 * button in the panel, and nothing in the game depends on any of it working.
 */

/** What happened. Short, because every one of these is written to the save. */
export type Mark =
  /** the app opened */
  | 'open'
  /** put away — screen off, or switched to something else */
  | 'away'
  /** brought back */
  | 'back'
  /** green: `d` is which notch it went to */
  | 'green'
  /** red */
  | 'red'
  /** R pressed down */
  | 'reverse'
  /** R let go: `d` is how long it was held, in seconds */
  | 'release'
  | 'whistle'
  /** one of the two that talk: `d` is which */
  | 'say'
  /** the camera button: `d` is the view it went to */
  | 'camera'
  /** he touched an arrow at the points: `d` is `junction:way` */
  | 'points'
  /** he went over a set of points: `d` is the `junction:way` actually taken */
  | 'through'
  | 'arrive'
  | 'depart'
  /** he touched the yard and it answered: `d` is what changed */
  | 'yard'
  /** he worked a crane: `d` is 'load', 'unload' or 'lift' */
  | 'crane'
  /** he touched the world and nothing answered. `m` says where he was. */
  | 'nothing'
  /** he dragged the view round: `d` is how far, in pixels */
  | 'look'
  /** he pinched: `d` is 'in' or 'out' */
  | 'pinch'
  /** the grown-ups' panel was opened — nothing until `closed` is him */
  | 'grown-ups'
  | 'closed';

export interface Beat {
  /** epoch milliseconds */
  t: number;
  k: Mark;
  /** whatever distinguishes this one from the others of its kind */
  d?: string;
  /** metres along the line at the time */
  m?: number;
  /** metres per second at the time */
  v?: number;
}

export interface Trail {
  /** yyyy-mm-dd the trail was started or last cleared */
  since: string;
  beats: Beat[];
}

const SAVE_KEY = 'little-engineer:trail';

/**
 * How many beats are kept.
 *
 * A busy half-hour is somewhere near four hundred of them, so this is a few
 * weeks of real play. Past that the oldest go, because a save that grows
 * forever eventually stops being written at all — and the interesting end of
 * a trail is always the recent end.
 */
const MAX_BEATS = 6000;

/** What `m` and `v` are filled in from, once the game has said how. */
type Where = () => { m: number; v: number };

const today = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const KINDS = new Set<string>([
  'open', 'away', 'back', 'green', 'red', 'reverse', 'release', 'whistle', 'say',
  'camera', 'points', 'through', 'arrive', 'depart', 'yard', 'nothing', 'look',
  'pinch', 'grown-ups', 'closed',
]);

function empty(): Trail {
  return { since: today(), beats: [] };
}

function load(): Trail {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw) as Partial<Trail>;
    const t = empty();
    if (typeof p.since === 'string') t.since = p.since;
    if (Array.isArray(p.beats)) {
      for (const b of p.beats) {
        if (!b || typeof b.t !== 'number' || typeof b.k !== 'string' || !KINDS.has(b.k)) continue;
        const beat: Beat = { t: b.t, k: b.k as Mark };
        if (typeof b.d === 'string') beat.d = b.d;
        if (typeof b.m === 'number') beat.m = b.m;
        if (typeof b.v === 'number') beat.v = b.v;
        t.beats.push(beat);
      }
      t.beats = t.beats.slice(-MAX_BEATS);
    }
    return t;
  } catch {
    return empty();
  }
}

class TrailStore {
  private t = load();
  private dirty = false;
  private where: Where | null = null;

  constructor() {
    // Nothing to hook up where there is no browser. Reading the trail is
    // worth testing on its own, and the tests should not have to stand up a
    // window to import this file.
    if (typeof window === 'undefined') return;
    // Written now and then and whenever the app is put away, rather than on
    // every press — same as the scrapbook, and for the same reason.
    window.setInterval(() => this.flush(), 15_000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.mark('away');
        this.flush();
      } else {
        this.mark('back');
      }
    });
  }

  /**
   * Tell the trail how to find the train, once, from whatever owns it. Until
   * this is called the beats simply have no `m` or `v` — which is what the
   * ones from before the world was built ought to look like anyway.
   */
  watch(fn: Where): void {
    this.where = fn;
  }

  get(): Readonly<Trail> {
    return this.t;
  }

  mark(k: Mark, d?: string): void {
    const beat: Beat = { t: Date.now(), k };
    if (d !== undefined) beat.d = d;
    if (this.where) {
      try {
        const { m, v } = this.where();
        beat.m = Math.round(m * 10) / 10;
        beat.v = Math.round(v * 100) / 100;
      } catch {
        // Nothing here is worth breaking a button press over.
      }
    }
    this.t.beats.push(beat);
    if (this.t.beats.length > MAX_BEATS) this.t.beats.shift();
    this.dirty = true;
  }

  clear(): void {
    this.t = empty();
    this.dirty = true;
    this.flush();
  }

  flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(this.t));
    } catch {
      // A trail with gaps is still a trail.
    }
  }
}

export const trail = new TrailStore();

// --------------------------------------------------------------- reading it

/**
 * A sitting of the game: the beats between picking it up and putting it down.
 *
 * Sittings are worked out rather than recorded, because an `open` is not the
 * only way one begins. A tablet left face-up on the sofa with the app still
 * running is not one three-hour sitting, so a long enough quiet gap starts a
 * new one too.
 */
export interface Sitting {
  /** 1-based, oldest first */
  n: number;
  from: number;
  to: number;
  beats: Beat[];
}

/** Longer than this between two beats and it was two different sittings. */
export const GAP_MS = 4 * 60_000;

export function sittings(beats: readonly Beat[]): Sitting[] {
  const out: Sitting[] = [];
  for (const b of beats) {
    const last = out[out.length - 1];
    if (last === undefined || b.k === 'open' || b.t - last.to > GAP_MS) {
      out.push({ n: out.length + 1, from: b.t, to: b.t, beats: [b] });
      continue;
    }
    last.beats.push(b);
    last.to = b.t;
  }
  return out;
}

/** The handful of things worth saying about the trail in the panel itself. */
export interface Glance {
  sittings: number;
  /** how long the longest sitting ran, in seconds */
  longest: number;
  /** the middle sitting, in seconds — more honest here than an average */
  typical: number;
  presses: number;
  /** taps on the world that nothing answered */
  unanswered: number;
  /** how long he typically leaves it between touching anything, in seconds */
  betweenPresses: number;
  /** the commonest things he does one after the other */
  pairs: { from: Mark; to: Mark; n: number }[];
}

/** What a grown-up did in the panel is not him playing, so it is left out. */
const HIS = (b: Beat) => b.k !== 'grown-ups' && b.k !== 'closed';

/** The ones that are him deliberately doing something. */
const PRESSED = new Set<Mark>([
  'green', 'red', 'reverse', 'whistle', 'say', 'camera', 'points', 'yard', 'nothing', 'look', 'pinch',
]);

const middle = (ns: number[]): number => {
  if (ns.length === 0) return 0;
  const s = [...ns].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

export function glance(beats: readonly Beat[]): Glance {
  const his = beats.filter(HIS);
  const sits = sittings(his);
  const lengths = sits.map((s) => (s.to - s.from) / 1000);
  const presses = his.filter((b) => PRESSED.has(b.k));

  const gaps: number[] = [];
  for (let i = 1; i < presses.length; i++) {
    const gap = presses[i].t - presses[i - 1].t;
    // A gap that spans two sittings is not him thinking, it is bedtime.
    if (gap < GAP_MS) gaps.push(gap / 1000);
  }

  const counted = new Map<string, number>();
  for (const sit of sits) {
    const only = sit.beats.filter((b) => PRESSED.has(b.k));
    for (let i = 1; i < only.length; i++) {
      const key = `${only[i - 1].k}>${only[i].k}`;
      counted.set(key, (counted.get(key) ?? 0) + 1);
    }
  }
  const pairs = [...counted.entries()]
    // Something he did once is not something he tends to do, and saying it is
    // reads as a finding when it is a coincidence.
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, n]) => {
      const [from, to] = key.split('>') as [Mark, Mark];
      return { from, to, n };
    });

  return {
    sittings: sits.length,
    longest: Math.round(lengths.length > 0 ? Math.max(...lengths) : 0),
    typical: Math.round(middle(lengths)),
    presses: presses.length,
    unanswered: his.filter((b) => b.k === 'nothing').length,
    betweenPresses: Math.round(middle(gaps) * 10) / 10,
    pairs,
  };
}

// ---------------------------------------------------------- getting it off

const stamp = (ms: number): string => {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
};

/**
 * The whole trail as one piece of text: a few lines of preamble, then a row
 * per beat.
 *
 * CSV under a comment header, so the same export can be pasted into a message
 * and read by eye or dropped into a spreadsheet and sorted, rather than there
 * being two exports that can disagree. `sitting` and `at` are the two columns
 * that make it worth analysing: one groups the rows into visits, the other
 * says how far into the visit each row happened.
 */
export function asText(build: string): string {
  const t = trail.get();
  const g = glance(t.beats);
  const sits = sittings(t.beats.filter(HIS));
  const which = new Map<Beat, number>();
  for (const s of sits) for (const b of s.beats) which.set(b, s.n);

  const lines = [
    '# Little Engineer — play log',
    `# build ${build}`,
    `# kept since ${t.since}`,
    `# ${t.beats.length} beats, ${g.sittings} sittings, ${g.presses} presses, ` +
      `${g.unanswered} taps nothing answered`,
    '#',
    '# sitting is 0 for anything a grown-up did in the panel.',
    '# at is seconds since that sitting began.',
    '# metres is how far along the line the train was; speed is m/s.',
    '',
    'sitting,at,time,what,detail,metres,speed',
  ];
  for (const b of t.beats) {
    const n = which.get(b) ?? 0;
    const sit = sits[n - 1];
    const at = sit ? Math.round((b.t - sit.from) / 100) / 10 : '';
    const detail = (b.d ?? '').replace(/[",\n]/g, ' ');
    lines.push(`${n},${at},${stamp(b.t)},${b.k},${detail},${b.m ?? ''},${b.v ?? ''}`);
  }
  return lines.join('\n') + '\n';
}
