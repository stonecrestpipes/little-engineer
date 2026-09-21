/**
 * A quiet record of his railway, for the grown-ups.
 *
 * This is what became of the sticker book. Collecting things for him to see
 * is exactly what the game refuses to do, so nothing here is ever shown to
 * him, nothing counts toward anything, and nothing is lost if it is cleared.
 * It is read only in the grown-ups' panel, as a little scrapbook of how he
 * plays: where he stops, which engine he drives, how often he whistles.
 */

export interface Journal {
  /** yyyy-mm-dd of the first day it was played on */
  since: string;
  /** every day it has been played on, most recent last */
  days: string[];
  /** metres driven, by engine id */
  metres: Record<string, number>;
  whistles: number;
  /** platform stops, by stop id */
  stops: Record<string, number>;
  /** times each way was taken at the points, by line (0 main, 1 branch) */
  turns: Record<string, number>;
}

const SAVE_KEY = 'little-engineer:journal';
/** Enough to show a season of play without the save growing forever. */
const MAX_DAYS = 400;

const today = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function empty(): Journal {
  return { since: today(), days: [], metres: {}, whistles: 0, stops: {}, turns: {} };
}

function load(): Journal {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw) as Partial<Journal>;
    const j = empty();
    if (typeof p.since === 'string') j.since = p.since;
    if (Array.isArray(p.days)) j.days = p.days.filter((d) => typeof d === 'string').slice(-MAX_DAYS);
    if (typeof p.whistles === 'number') j.whistles = p.whistles;
    for (const key of ['metres', 'stops', 'turns'] as const) {
      const v = p[key];
      if (v && typeof v === 'object') {
        for (const [k, n] of Object.entries(v)) if (typeof n === 'number' && n >= 0) j[key][k] = n;
      }
    }
    return j;
  } catch {
    return empty();
  }
}

class JournalStore {
  private j = load();
  private dirty = false;

  constructor() {
    // Written now and then and whenever the app is put away, rather than on
    // every metre driven.
    window.setInterval(() => this.flush(), 15_000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush();
    });
  }

  get(): Readonly<Journal> {
    return this.j;
  }

  /** He touched it today. */
  played(): void {
    const d = today();
    if (this.j.days[this.j.days.length - 1] === d) return;
    this.j.days.push(d);
    if (this.j.days.length > MAX_DAYS) this.j.days.shift();
    this.dirty = true;
  }

  drove(engine: string, metres: number): void {
    if (metres <= 0) return;
    this.j.metres[engine] = (this.j.metres[engine] ?? 0) + metres;
    this.dirty = true;
  }

  whistled(): void {
    this.j.whistles++;
    this.dirty = true;
  }

  stopped(stop: string): void {
    this.j.stops[stop] = (this.j.stops[stop] ?? 0) + 1;
    this.dirty = true;
  }

  turned(line: number): void {
    this.j.turns[line] = (this.j.turns[line] ?? 0) + 1;
    this.dirty = true;
  }

  clear(): void {
    this.j = empty();
    this.dirty = true;
    this.flush();
  }

  private flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(this.j));
    } catch {
      // Nothing depends on this. A scrapbook with gaps is still a scrapbook.
    }
  }
}

export const journal = new JournalStore();
