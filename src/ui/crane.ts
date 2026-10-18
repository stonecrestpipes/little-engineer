import { trail } from '../trail';
import type { CraneJob } from '../content/places/crane';

/**
 * The one button that is only there sometimes and is not about driving.
 *
 * It appears while he is standing still at a crane — the quay at the harbour,
 * the building site in the city — and the picture on it says which way the
 * logs are about to go. Pressing it starts the crane.
 *
 * **Once pressed it stays put, pressed-looking, for the length of the lift**,
 * and it will not take a second press. It used to vanish instead, which came
 * out of the same instinct — there is nothing to press in the middle of a
 * lift — but vanishing is the one thing the install row taught us not to do:
 * the button he pressed disappearing and the button never having been there
 * look identical, and only one of them means his press worked. Sunk down and
 * breathing says *I have it, wait*, which is the true answer, and it is the
 * same button that comes back up when the bundle lands.
 *
 * Built like the points arrows rather than like the driving buttons: it fires
 * on pointerdown, it has no latched state of its own, and what it looks like
 * is decided entirely by what the game tells it to show.
 */
export interface CraneButton {
  /** Show it for this job, or hide it with null. */
  show(job: CraneJob | null): void;
  /** Hold it on screen for the length of the lift: visibly busy, and inert. */
  working(job: CraneJob): void;
}

export function mountCrane(h: { touched(): void; work(job: CraneJob): void }): CraneButton {
  const btn = document.getElementById('btn-crane') as HTMLButtonElement;
  const pics = [...btn.querySelectorAll<SVGGElement>('.crane-pic')];
  /** What it is currently offering, which is what a press means. */
  let offering: CraneJob | null = null;

  const press = (): void => {
    h.touched();
    if (!offering) {
      // Pressed while the crane already has it. Nothing happens — and that is
      // the press worth keeping, because it is the only record of whether
      // waiting eight seconds is a thing he can do or a thing he fights.
      if (!btn.hidden) trail.mark('held', 'crane');
      return;
    }
    h.work(offering);
  };

  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    btn.classList.add('press');
    press();
  });
  const release = () => btn.classList.remove('press');
  for (const type of ['pointerup', 'pointerleave', 'pointercancel'] as const) {
    btn.addEventListener(type, release);
  }
  // Keyboard, for working it on a laptop while building.
  btn.addEventListener('click', (e) => {
    if (e.detail !== 0) return; // a real tap already went through pointerdown
    press();
  });

  /** What it is showing now, so sixty frames a second cost one paint. */
  let painted = '';

  /** Both methods are the same paint; only whether a press means anything differs. */
  const paint = (job: CraneJob | null, busy: boolean): void => {
    // A busy button offers nothing, so a second press cannot queue a lift.
    offering = busy ? null : job;
    const want = `${job ?? ''}:${busy}`;
    if (want === painted) return;
    painted = want;
    btn.hidden = job === null;
    btn.classList.toggle('working', busy);
    // Not `disabled`: a disabled button stops reporting presses, and a press
    // he makes while waiting is exactly the thing worth knowing about him.
    btn.setAttribute('aria-disabled', busy ? 'true' : 'false');
    if (job === null) return;
    for (const pic of pics) pic.classList.toggle('on', pic.dataset.for === job);
  };

  return {
    show(job) {
      paint(job, false);
    },
    working(job) {
      paint(job, true);
    },
  };
}
