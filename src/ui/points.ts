/**
 * The two arrows at the points after The Farm.
 *
 * They appear as he comes up to the junction and go again once he is through
 * it. Touching one sets the points that way; touching nothing leaves them set
 * for the main line, so the game never waits on him to choose.
 */
export interface Points {
  show(visible: boolean): void;
  /** Light whichever way the points are set. */
  mark(line: number): void;
}

export function mountPoints(h: { touched(): void; choose(line: number): void }): Points {
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
    show(visible) {
      if (visible === !box.hidden) return;
      box.hidden = !visible;
      // Each time round starts undecided, and both arrows breathe until he picks.
      if (visible) box.classList.remove('chosen');
    },
    mark(line) {
      ways.forEach((w) => w.classList.toggle('on', Number(w.dataset.line) === line));
    },
  };
}
