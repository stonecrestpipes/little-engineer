export interface ControlHandlers {
  /** -1 (stop) … 0 (released) … +1 (full power) */
  throttle(value: number): void;
  whistle(): void;
  camera(): void;
  /** any touch at all: starts the audio context and marks the app as in use */
  touched(): void;
}

export interface Controls {
  reflect(state: { moving: boolean; atStop: boolean }): void;
  show(): void;
}

/**
 * The lever, the whistle and the camera. Three things on screen.
 *
 * Buttons fire on pointerdown, not click. A four-year-old's press drifts, and
 * waiting for the pointerup that matches feels broken to them.
 */
export function mountControls(h: ControlHandlers): Controls {
  const ui = document.getElementById('ui') as HTMLDivElement;
  const whistle = document.getElementById('btn-whistle') as HTMLButtonElement;
  const camera = document.getElementById('btn-camera') as HTMLButtonElement;
  const lever = document.getElementById('lever') as HTMLDivElement;
  const slot = lever.querySelector('.slot') as HTMLDivElement;
  const knob = lever.querySelector('.knob') as HTMLDivElement;

  const wire = (el: HTMLButtonElement, fn: () => void) => {
    // True between a pointerdown and the click the browser echoes after it.
    // Anything else arriving as a bare click is a real press we must honour.
    let handledByPointer = false;
    const press = (e: Event) => {
      e.preventDefault();
      el.classList.add('press');
      h.touched();
      fn();
    };
    const release = () => el.classList.remove('press');

    el.addEventListener('pointerdown', (e) => {
      handledByPointer = true;
      press(e);
    });
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', () => {
      handledByPointer = false;
      release();
    });
    el.addEventListener('pointerleave', release);
    // Keyboard still works, for testing on a laptop.
    el.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        handledByPointer = true;
        press(e);
      }
    });
    el.addEventListener('keyup', release);
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (handledByPointer) {
        handledByPointer = false;
        return; // the browser's echo of a press we already ran
      }
      press(e);
      window.setTimeout(release, 110);
    });
  };

  wire(whistle, h.whistle);
  wire(camera, h.camera);

  // ------------------------------------------------------------------ lever
  let value = 0;
  let holding: number | null = null;

  /**
   * Where the knob sits, as a fraction of the slot: 0 at the bottom, 1 at the
   * top. Measured live rather than cached, because the tablet can be rotated
   * and the CSS steps down at small sizes.
   */
  function paint(): void {
    lever.style.setProperty('--p', String((value + 1) / 2));
    lever.classList.toggle('up', value > 0);
    lever.classList.toggle('down', value < 0);
    lever.setAttribute('aria-valuenow', value.toFixed(2));
  }

  function set(v: number): void {
    const next = Math.max(-1, Math.min(1, v));
    if (next === value) return;
    value = next;
    paint();
    h.throttle(value);
  }

  function valueAt(clientY: number): number {
    const r = slot.getBoundingClientRect();
    const half = knob.offsetHeight / 2;
    const top = r.top + half;
    const span = Math.max(1, r.height - half * 2);
    return 1 - ((clientY - top) / span) * 2;
  }

  /** Letting go always means letting go. The lever never latches. */
  function release(): void {
    holding = null;
    lever.classList.remove('dragging');
    set(0);
  }

  lever.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    h.touched();
    holding = e.pointerId;
    try {
      // Keeps tracking his thumb even when it slides off the lever, which it
      // will. Not every environment has a capturable pointer, and failing to
      // capture is not a reason to refuse the press.
      lever.setPointerCapture(e.pointerId);
    } catch {
      /* no capture available; the drag still works over the lever itself */
    }
    lever.classList.add('dragging');
    set(valueAt(e.clientY));
  });

  lever.addEventListener('pointermove', (e) => {
    if (holding !== e.pointerId) return;
    e.preventDefault();
    set(valueAt(e.clientY));
  });

  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    lever.addEventListener(type, (e) => {
      if (holding !== e.pointerId) return;
      release();
    });
  }

  // Keyboard, for driving it on a laptop while building.
  lever.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      h.touched();
      set(1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      h.touched();
      set(-1);
    }
  });
  lever.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') release();
  });
  lever.addEventListener('blur', () => {
    if (holding === null && value !== 0) release();
  });

  paint();

  return {
    reflect({ moving, atStop }) {
      // A soft halo on the lever when he is standing at a platform: the only
      // nudge in the game, and it goes away the moment he sets off.
      lever.classList.toggle('invite', atStop && !moving);
    },
    show() {
      ui.hidden = false;
    },
  };
}
