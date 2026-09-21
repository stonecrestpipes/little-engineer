/**
 * The two arrows at a junction: the main way on the left, the branch on the
 * right, each with a picture of where it goes for whichever junction it is.
 *
 * They appear as he comes up to the junction and go again once he is through
 * it. Touching one sets the points that way; touching nothing leaves them set
 * for the main line, so the game never waits on him to choose.
 */
export interface Points {
  /** Show the arrows for this junction, or hide them with null. */
  show(junction: string | null): void;
  /** Light whichever way the points are set: 0 the main way, 1 the branch. */
  mark(way: number): void;
}

export function mountPoints(h: { touched(): void; choose(way: number): void }): Points {
  const box = document.getElementById('points') as HTMLDivElement;
  const ways = [...box.querySelectorAll<HTMLButtonElement>('.way')];

  for (const way of ways) {
    const line = Number(way.dataset.line);
    way.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      h.touched();
      way.classList.add('press');
      box.classList.add('chosen');
      h.choose(line);
    });
    const release = () => way.classList.remove('press');
    way.addEventListener('pointerup', release);
    way.addEventListener('pointerleave', release);
    way.addEventListener('pointercancel', release);
    // Keyboard, for trying it on a laptop.
    way.addEventListener('click', (e) => {
      if (e.detail !== 0) return; // a real tap already went through pointerdown
      h.touched();
      box.classList.add('chosen');
      h.choose(line);
    });
  }

  return {
    show(junction) {
      box.hidden = junction === null;
      if (junction === null) return;
      box.dataset.junction = junction;
      // Each time round starts undecided, and both arrows breathe until he picks.
      box.classList.remove('chosen');
    },
    mark(way) {
      ways.forEach((w) => w.classList.toggle('on', Number(w.dataset.line) === way));
    },
  };
}
