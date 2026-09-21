import { settings, SPEEDS, type Settings } from '../settings';
import { ENGINES } from '../content/engines';

/**
 * The grown-ups' panel. Hidden behind a long hold on the top-right corner of
 * the screen, where there is nothing to press and nothing a four-year-old's
 * thumb has a reason to rest for three whole seconds.
 *
 * Everything here writes to the settings store and takes effect immediately;
 * there is no save button to forget.
 */

const HOLD_MS = 3000;
/** How big the invisible corner is, in CSS pixels. */
const CORNER = 110;
/** Thumbs wander. Move further than this and it was not a hold. */
const SLOP = 28;

export interface ParentHooks {
  /** Called as the panel opens, so the game can let go of the lever. */
  opened(): void;
  /** Put his train back to the blue engine with nothing behind it. */
  resetTrain(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...kids: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
}

function row(label: string, hint: string, control: Node): HTMLElement {
  return el(
    'div',
    { className: 'p-row' },
    el('div', { className: 'p-label' }, el('b', {}, label), hint ? el('small', {}, hint) : ''),
    control,
  );
}

/** A row of big buttons, one of which is lit. */
function choice<T>(
  options: readonly { value: T; label: string }[],
  current: () => T,
  pick: (v: T) => void,
): { node: HTMLElement; sync(): void } {
  const node = el('div', { className: 'p-seg' });
  const buttons = options.map((o) => {
    const b = el('button', { type: 'button', textContent: o.label });
    b.addEventListener('click', () => {
      pick(o.value);
      sync();
    });
    node.append(b);
    return b;
  });
  const sync = () => buttons.forEach((b, i) => b.classList.toggle('on', options[i].value === current()));
  sync();
  return { node, sync };
}

const onOff = (key: 'greetingOn' | 'junctions' | 'dayNight') =>
  choice(
    [
      { value: true, label: 'On' },
      { value: false, label: 'Off' },
    ],
    () => settings.get()[key],
    (v) => settings.set({ [key]: v } as Partial<Settings>),
  );

export function mountParentPanel(hooks: ParentHooks): void {
  const syncs: (() => void)[] = [];
  const s = () => settings.get();

  // --- the controls ------------------------------------------------------
  const name = el('input', { type: 'text', maxLength: 24, value: s().childName, placeholder: 'No name' });
  name.addEventListener('input', () => settings.set({ childName: name.value }));
  syncs.push(() => (name.value = s().childName));

  const hello = onOff('greetingOn');
  const speed = choice(SPEEDS, () => s().speed, (v) => settings.set({ speed: v }));
  const stop = choice(
    [
      { value: 'more', label: 'More' },
      { value: 'normal', label: 'Normal' },
      { value: 'less', label: 'Less' },
    ] as const,
    () => s().stopHelp,
    (v) => settings.set({ stopHelp: v }),
  );
  syncs.push(hello.sync, speed.sync, stop.sync);

  const volume = el('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(s().volume) });
  volume.addEventListener('input', () => settings.set({ volume: Number(volume.value) }));
  syncs.push(() => (volume.value = String(s().volume)));

  const plates = el('div', { className: 'p-plates' });
  for (const spec of ENGINES) {
    const input = el('input', {
      type: 'text',
      maxLength: 12,
      value: s().nameplates[spec.id] ?? spec.nameplate,
      placeholder: 'Blank',
    });
    input.addEventListener('input', () =>
      settings.set({ nameplates: { ...s().nameplates, [spec.id]: input.value } }),
    );
    syncs.push(() => (input.value = s().nameplates[spec.id] ?? spec.nameplate));
    const swatch = el('i', { className: 'p-swatch' });
    swatch.style.background = '#' + spec.colour.body.toString(16).padStart(6, '0');
    plates.append(el('label', {}, swatch, input));
  }

  const resetTrain = el('button', { type: 'button', className: 'p-plain', textContent: 'Put his train back to the start' });
  resetTrain.addEventListener('click', () => hooks.resetTrain());
  const resetAll = el('button', { type: 'button', className: 'p-plain', textContent: 'Reset these settings' });
  resetAll.addEventListener('click', () => {
    settings.reset();
    syncs.forEach((f) => f());
  });
  const done = el('button', { type: 'button', className: 'p-done', textContent: 'Done' });

  const body = el(
    'div',
    { className: 'p-body' },
    row('His name', 'Used in the spoken hello', name),
    row('Say hello', 'Out loud, when the app opens', hello.node),
    row('Speed', 'For every engine', speed.node),
    row('Help stopping', 'How early pulling down still arrives', stop.node),
    row('Volume', '', volume),
    row('Nameplates', 'Painted on the side tanks. Blank for none', plates),
  );

  const sheet = el(
    'div',
    { className: 'p-sheet', role: 'dialog', ariaLabel: 'Grown-ups' },
    el('header', {}, el('h2', {}, 'Grown-ups'), done),
    body,
    el('footer', {}, resetTrain, resetAll, el('small', { textContent: `Build ${__BUILD__}` })),
  );
  const panel = el('div', { id: 'parents', hidden: true }, sheet);
  document.body.append(panel);

  // Nothing typed in here should reach the game underneath.
  for (const type of ['pointerdown', 'pointerup', 'keydown', 'keyup'] as const) {
    panel.addEventListener(type, (e) => e.stopPropagation());
  }

  const close = () => {
    (document.activeElement as HTMLElement | null)?.blur();
    panel.hidden = true;
  };
  done.addEventListener('click', close);
  panel.addEventListener('click', (e) => {
    if (e.target === panel) close();
  });

  const open = () => {
    syncs.forEach((f) => f());
    hooks.opened();
    panel.hidden = false;
    body.scrollTop = 0;
  };

  // --- the hold ------------------------------------------------------------
  const ring = el('div', { id: 'parents-ring' });
  document.body.append(ring);

  let timer = 0;
  let pointer: number | null = null;
  let x0 = 0;
  let y0 = 0;
  const cancel = () => {
    window.clearTimeout(timer);
    pointer = null;
    ring.classList.remove('filling');
  };

  window.addEventListener(
    'pointerdown',
    (e) => {
      if (!panel.hidden || pointer !== null) return;
      if (e.clientX < window.innerWidth - CORNER || e.clientY > CORNER) return;
      pointer = e.pointerId;
      x0 = e.clientX;
      y0 = e.clientY;
      ring.classList.add('filling');
      timer = window.setTimeout(() => {
        cancel();
        open();
      }, HOLD_MS);
    },
    true,
  );
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerId !== pointer) return;
      if (Math.hypot(e.clientX - x0, e.clientY - y0) > SLOP) cancel();
    },
    true,
  );
  for (const type of ['pointerup', 'pointercancel'] as const) {
    window.addEventListener(
      type,
      (e) => {
        if (e.pointerId === pointer) cancel();
      },
      true,
    );
  }
}
