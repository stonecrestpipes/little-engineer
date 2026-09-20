export interface ControlHandlers {
  go(): void;
  stop(): void;
  whistle(): void;
  camera(): void;
}

export interface Controls {
  /** GO quietens while running, STOP quietens while stopped. */
  reflect(state: { moving: boolean; atStop: boolean }): void;
  show(): void;
}

/**
 * Buttons fire on pointerdown, not click. A four-year-old's press drifts, and
 * waiting for the pointerup that matches feels broken to them.
 */
export function mountControls(h: ControlHandlers): Controls {
  const ui = document.getElementById('ui') as HTMLDivElement;
  const go = document.getElementById('btn-go') as HTMLButtonElement;
  const stop = document.getElementById('btn-stop') as HTMLButtonElement;
  const whistle = document.getElementById('btn-whistle') as HTMLButtonElement;
  const camera = document.getElementById('btn-camera') as HTMLButtonElement;

  const wire = (el: HTMLButtonElement, fn: () => void) => {
    // True between a pointerdown and the click the browser echoes after it.
    // Anything else arriving as a bare click is a real press we must honour.
    let handledByPointer = false;
    const press = (e: Event) => {
      e.preventDefault();
      el.classList.add('press');
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

  wire(go, h.go);
  wire(stop, h.stop);
  wire(whistle, h.whistle);
  wire(camera, h.camera);

  return {
    reflect({ moving, atStop }) {
      go.classList.toggle('idle', moving);
      stop.classList.toggle('idle', !moving);
      go.classList.toggle('invite', atStop && !moving);
    },
    show() {
      ui.hidden = false;
    },
  };
}
