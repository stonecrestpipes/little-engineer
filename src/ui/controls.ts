export interface ControlHandlers {
  /** -1 (stop now) … 0 (no power) … +1 (full power) */
  throttle(value: number): void;
  /** Held down: creep backwards. Released: stop. */
  reverse(on: boolean): void;
  whistle(): void;
  /** Say the nth thing out loud. */
  say(which: number): void;
  camera(): void;
  /** any touch at all: starts the audio context and marks the app as in use */
  touched(): void;
}

export interface Controls {
  reflect(state: { moving: boolean; atStop: boolean }): void;
  show(): void;
  /** Let go of everything — the grown-ups' panel is opening. */
  letGo(): void;
}

/**
 * How hard the engine pulls on each press of green.
 *
 * An amble he can watch, a middle gear, then the engine's own top speed. The
 * middle one is the one that matters: full steam is quick enough that a bend
 * arrives before he has decided anything about it, and before there was a gear
 * between them the only way to have time to think was to potter.
 *
 * Three is the whole ladder, and a fourth press does nothing — so there is
 * never a wrong number of presses, only a slower or a faster train.
 */
const NOTCHES = [0.22, 0.55, 1];

/**
 * Green, red, R, the two that talk, the whistle and the camera.
 *
 * Buttons fire on pointerdown, not click. A four-year-old's press drifts, and
 * waiting for the pointerup that matches feels broken to them. R is the one
 * exception, because a button you hold has to know when you stop holding it.
 *
 * Green and red latch: whatever he pressed last is what the engine is doing,
 * and it stays that way until he presses the other one. That is the trade the
 * buttons make against the lever, which could never be left set.
 *
 * Green also counts up: each press is the next speed, and the chevrons on it
 * light to say which one he is on.
 */
export function mountControls(h: ControlHandlers): Controls {
  const ui = document.getElementById('ui') as HTMLDivElement;
  const whistle = document.getElementById('btn-whistle') as HTMLButtonElement;
  const camera = document.getElementById('btn-camera') as HTMLButtonElement;
  const go = document.getElementById('btn-go') as HTMLButtonElement;
  const stop = document.getElementById('btn-stop') as HTMLButtonElement;
  const back = document.getElementById('btn-back') as HTMLButtonElement;
  const says = [...document.querySelectorAll<HTMLButtonElement>('.say')];

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

  /**
   * A button that does something for as long as it is held. The pointer is
   * captured so it keeps going when his thumb slides off — but every way a
   * press can end, including the window losing it altogether, lets go.
   */
  const hold = (el: HTMLButtonElement, fn: (down: boolean) => void) => {
    let down = false;
    const start = (e: Event) => {
      e.preventDefault();
      if (down) return;
      down = true;
      el.classList.add('press');
      h.touched();
      fn(true);
    };
    const end = () => {
      if (!down) return;
      down = false;
      el.classList.remove('press');
      fn(false);
    };

    el.addEventListener('pointerdown', (e) => {
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* no capture available; sliding off the button then lets go, which is
           the safe way round for the one control that moves the engine while
           it is held */
      }
      start(e);
    });
    for (const type of ['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture'] as const) {
      el.addEventListener(type, end);
    }
    el.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') start(e);
    });
    el.addEventListener('keyup', end);
    el.addEventListener('blur', end);
    // A press that ends anywhere else — a notification, the app going away —
    // must not leave the engine backing up on its own.
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    window.addEventListener('blur', end);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') end();
    });
    return { end };
  };

  wire(whistle, h.whistle);
  wire(camera, h.camera);
  says.forEach((el, i) => wire(el, () => {
    // Which one is talking, briefly, so a press always looks like a press.
    el.classList.add('saying');
    window.setTimeout(() => el.classList.remove('saying'), 900);
    h.say(Number(el.dataset.say ?? i));
  }));

  // ----------------------------------------------------------- green and red
  /** 0 not driving, then one notch per press of green. */
  let notch = 0;

  function paint(): void {
    go.dataset.notch = String(notch);
    go.classList.toggle('on', notch > 0);
    stop.classList.toggle('on', notch === 0);
    go.setAttribute('aria-pressed', notch > 0 ? 'true' : 'false');
  }

  wire(go, () => {
    if (notch < NOTCHES.length) notch++;
    h.throttle(NOTCHES[notch - 1]);
    paint();
  });

  wire(stop, () => {
    notch = 0;
    h.throttle(-1);
    paint();
  });

  const reverse = hold(back, (down) => h.reverse(down));

  // Keyboard, for driving it on a laptop while building.
  window.addEventListener('keydown', (e) => {
    if (e.repeat || e.target !== document.body) return;
    if (e.key === 'ArrowUp') go.click();
    else if (e.key === 'ArrowDown') stop.click();
    else if (e.key === 'r' || e.key === 'R') {
      h.touched();
      back.classList.add('press');
      h.reverse(true);
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'r' || e.key === 'R') {
      back.classList.remove('press');
      h.reverse(false);
    }
  });

  paint();

  return {
    reflect({ moving, atStop }) {
      // A soft halo on green when he is standing at a platform: the only
      // nudge in the game, and it goes away the moment he sets off.
      go.classList.toggle('invite', atStop && !moving);
    },
    show() {
      ui.hidden = false;
    },
    letGo() {
      reverse.end();
      notch = 0;
      h.throttle(0);
      paint();
    },
  };
}
