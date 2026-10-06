import type { CraneJob } from '../content/places/crane';

/**
 * The one button that is only there sometimes and is not about driving.
 *
 * It appears while he is standing still at a crane — the quay at the harbour,
 * the building site in the city — and the picture on it says which way the
 * logs are about to go. Pressing it starts the crane; it goes away while the
 * crane is working, because there is nothing to press in the middle of a lift
 * and a second press should not queue another one.
 *
 * Built like the points arrows rather than like the driving buttons: it fires
 * on pointerdown, it has no latched state of its own, and what it looks like
 * is decided entirely by what the game tells it to show.
 */
export interface CraneButton {
  /** Show it for this job, or hide it with null. */
  show(job: CraneJob | null): void;
}

export function mountCrane(h: { touched(): void; work(job: CraneJob): void }): CraneButton {
  const btn = document.getElementById('btn-crane') as HTMLButtonElement;
  const pics = [...btn.querySelectorAll<SVGGElement>('.crane-pic')];
  /** What it is currently offering, which is what a press means. */
  let offering: CraneJob | null = null;

  const press = (): void => {
    if (!offering) return;
    h.touched();
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

  return {
    show(job) {
      offering = job;
      btn.hidden = job === null;
      if (job === null) return;
      for (const pic of pics) pic.classList.toggle('on', pic.dataset.for === job);
    },
  };
}
