import { describe, expect, it } from 'vitest';
import { GAP_MS, glance, sittings, type Beat, type Mark } from './trail';

/**
 * Reading the trail is the half of it that can be wrong without anything
 * looking wrong: a sitting split in the wrong place, or an evening of
 * fiddling in the grown-ups' panel counted as him playing, would both produce
 * a perfectly confident answer to the wrong question.
 */

const MINUTE = 60_000;

/** Beats a given number of seconds apart, starting at an arbitrary epoch. */
function beats(...spec: [Mark, number][]): Beat[] {
  const base = 1_700_000_000_000;
  return spec.map(([k, seconds]) => ({ t: base + seconds * 1000, k }));
}

describe('sittings', () => {
  it('is one sitting while the beats keep coming', () => {
    const sits = sittings(beats(['open', 0], ['green', 4], ['whistle', 9], ['red', 30]));
    expect(sits).toHaveLength(1);
    expect(sits[0].beats).toHaveLength(4);
    expect(sits[0].to - sits[0].from).toBe(30_000);
  });

  it('starts a new one whenever the app is opened', () => {
    // Two sittings a minute apart — close enough that the gap alone would not
    // have split them, but an `open` always does.
    const sits = sittings(beats(['open', 0], ['green', 5], ['open', 65], ['green', 70]));
    expect(sits.map((s) => s.beats.length)).toEqual([2, 2]);
    expect(sits.map((s) => s.n)).toEqual([1, 2]);
  });

  it('starts a new one after a long enough quiet gap', () => {
    // The tablet left face-up on the sofa: no `open`, but nobody was playing.
    const quiet = GAP_MS / 1000 + 10;
    const sits = sittings(beats(['green', 0], ['whistle', 3], ['green', 3 + quiet]));
    expect(sits.map((s) => s.beats.length)).toEqual([2, 1]);
  });

  it('does not split on a gap that is merely a four-year-old thinking', () => {
    const sits = sittings(beats(['green', 0], ['whistle', GAP_MS / 1000 - 10]));
    expect(sits).toHaveLength(1);
  });

  it('has nothing to say about nothing', () => {
    expect(sittings([])).toEqual([]);
  });
});

describe('glance', () => {
  it('leaves out what a grown-up did in the panel', () => {
    const g = glance(beats(['green', 0], ['grown-ups', 10], ['closed', 20], ['red', 25]));
    // Two presses, not four: the panel is not him.
    expect(g.presses).toBe(2);
  });

  it('counts a tap that nothing answered', () => {
    const g = glance(beats(['nothing', 0], ['nothing', 4], ['green', 8]));
    expect(g.unanswered).toBe(2);
    // It is still something he did, so it still counts as a press.
    expect(g.presses).toBe(3);
  });

  it('takes the middle sitting rather than the average', () => {
    // Three sittings of 10s, 10s and 600s. The average would be over three
    // minutes, which describes none of them.
    const base = 1_700_000_000_000;
    const at = (ms: number, k: Mark): Beat => ({ t: base + ms, k });
    /** A sitting of the given length, pressing something every half minute. */
    const sitting = (from: number, seconds: number): Beat[] => {
      const out: Beat[] = [];
      for (let s = 0; s < seconds; s += 30) out.push(at(from + s * 1000, 'green'));
      out.push(at(from + seconds * 1000, 'red'));
      return out;
    };
    // Far enough after the last beat of the one before to be a new sitting.
    const g = glance([
      ...sitting(0, 10),
      ...sitting(10_000 + GAP_MS + MINUTE, 10),
      ...sitting(20_000 + (GAP_MS + MINUTE) * 2, 600),
    ]);
    expect(g.sittings).toBe(3);
    expect(g.typical).toBe(10);
    expect(g.longest).toBe(600);
  });

  it('finds what he tends to press next', () => {
    const g = glance(beats(
      ['green', 0], ['whistle', 2],
      ['green', 6], ['whistle', 8],
      ['green', 12], ['red', 14],
    ));
    expect(g.pairs[0]).toEqual({ from: 'green', to: 'whistle', n: 2 });
  });

  it('does not pair the last press of one sitting with the first of the next', () => {
    const quiet = GAP_MS / 1000 + 10;
    const g = glance(beats(
      ['green', 0], ['red', 2], ['green', 4], ['red', 6],
      ['green', quiet], ['red', quiet + 2], ['green', quiet + 4], ['red', quiet + 6],
    ));
    expect(g.sittings).toBe(2);
    // green>red and red>green within each sitting, twice over; never the pair
    // that would span the gap between them.
    expect(g.pairs).toEqual([
      { from: 'green', to: 'red', n: 4 },
      { from: 'red', to: 'green', n: 2 },
    ]);
  });

  it('does not call something he did once a thing he tends to do', () => {
    const g = glance(beats(['green', 0], ['whistle', 2], ['camera', 4]));
    expect(g.pairs).toEqual([]);
  });

  it('ignores a gap that spans two sittings when saying how fast he presses', () => {
    const quiet = GAP_MS / 1000 + 10;
    // 2s, then a night, then 2s. Only the two-second gaps are him.
    const g = glance(beats(['green', 0], ['red', 2], ['green', 2 + quiet], ['red', 4 + quiet]));
    expect(g.betweenPresses).toBe(2);
  });

  it('has nothing to say about nothing', () => {
    const g = glance([]);
    expect(g).toMatchObject({ sittings: 0, presses: 0, unanswered: 0, typical: 0, longest: 0 });
    expect(g.pairs).toEqual([]);
  });
});
