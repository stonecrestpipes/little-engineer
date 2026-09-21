import { settings, SPEEDS, type Settings } from '../settings';
import { ENGINES } from '../content/engines';
import { journal } from '../journal';

const PLACES: [string, string][] = [
  ['sheds', 'The Sheds'],
  ['farm', 'The Farm'],
  ['windmill', 'The Windmill'],
  ['harbour', 'The Harbour'],
  ['lighthouse', 'The Lighthouse'],
];

const distance = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);
const count = (n: number) => n.toLocaleString();

/** The scrapbook: how he plays, drawn fresh each time the panel opens. */
function scrapbook(into: HTMLElement): void {
  const j = journal.get();
  const total = Object.values(j.metres).reduce((a, b) => a + b, 0);
  const stops = Object.values(j.stops).reduce((a, b) => a + b, 0);
  const tile = (value: string, label: string) =>
    el('div', { className: 'p-tile' }, el('b', {}, value), el('small', {}, label));

  const places = el('div', { className: 'p-bars' });
  const most = Math.max(1, ...PLACES.map(([id]) => j.stops[id] ?? 0));
  for (const [id, name] of PLACES) {
    const n = j.stops[id] ?? 0;
    const bar = el('i');
    bar.style.width = `${(n / most) * 100}%`;
    places.append(el('span', {}, name), el('span', { className: 'p-bar' }, bar), el('span', {}, count(n)));
  }

  const engines = el('div', { className: 'p-bars' });
  const longest = Math.max(1, ...ENGINES.map((e) => j.metres[e.id] ?? 0));
  for (const spec of ENGINES) {
    const m = j.metres[spec.id] ?? 0;
    const bar = el('i');
    bar.style.width = `${(m / longest) * 100}%`;
    bar.style.background = '#' + spec.colour.body.toString(16).padStart(6, '0');
    const label = spec.name.replace(/^the /, '');
    engines.append(
      el('span', {}, label[0].toUpperCase() + label.slice(1)),
      el('span', { className: 'p-bar' }, bar),
      el('span', {}, distance(m)),
    );
  }

  const turns = (junction: string, main: string, branch: string): string => {
    const a = j.turns[`${junction}:0`] ?? 0;
    const b = j.turns[`${junction}:1`] ?? 0;
    return `${main} ${count(a)}, ${branch} ${count(b)}`;
  };
  const anyTurns = Object.values(j.turns).some((n) => n > 0);
  const since = new Date(j.since + 'T12:00').toLocaleDateString(undefined, { day: 'numeric', month: 'long' });

  into.replaceChildren(
    el('div', { className: 'p-tiles' },
      tile(count(j.days.length), j.days.length === 1 ? 'day played' : 'days played'),
      tile(distance(total), 'driven'),
      tile(count(j.whistles), 'whistles'),
      tile(count(stops), 'stops'),
    ),
    el('h3', {}, 'Where he stops'),
    places,
    el('h3', {}, 'What he drives'),
    engines,
    el('p', { className: 'p-note' },
      anyTurns
        ? `After The Farm: ${turns('farm', 'the tunnel', 'the windmill')}. ` +
            `After The Harbour: ${turns('coast', 'home', 'the lighthouse')}.`
        : 'He has not been past any points yet.',
      el('br'),
      `Kept on this tablet since ${since}. He never sees any of this.`,
    ),
  );
}

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
  /** A line for the footer about how the game is running. */
  status(): string;
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
  const junction = onOff('junctions');
  const dayNight = onOff('dayNight');
  const face = choice(
    [
      { value: false, label: 'Familiar' },
      { value: true, label: 'Original' },
    ],
    () => s().originalFace,
    (v) => settings.set({ originalFace: v }),
  );
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
  const picture = choice(
    [
      { value: 'auto', label: 'Auto' },
      { value: 'high', label: 'Sharp' },
      { value: 'low', label: 'Simple' },
    ] as const,
    () => s().quality,
    (v) => settings.set({ quality: v }),
  );
  syncs.push(hello.sync, speed.sync, stop.sync, picture.sync, junction.sync, dayNight.sync, face.sync);

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

  const book = el('div', { className: 'p-book' });
  const clearBook = el('button', { type: 'button', className: 'p-plain', textContent: 'Clear the scrapbook' });
  clearBook.addEventListener('click', () => {
    if (!window.confirm('Clear everything in the scrapbook? This cannot be undone.')) return;
    journal.clear();
    scrapbook(book);
  });

  const resetTrain = el('button', { type: 'button', className: 'p-plain', textContent: 'Put his train back to the start' });
  resetTrain.addEventListener('click', () => hooks.resetTrain());
  const resetAll = el('button', { type: 'button', className: 'p-plain', textContent: 'Reset these settings' });
  resetAll.addEventListener('click', () => {
    settings.reset();
    syncs.forEach((f) => f());
  });
  const done = el('button', { type: 'button', className: 'p-done', textContent: 'Done' });

  const footnote = el('small');
  const body = el(
    'div',
    { className: 'p-body' },
    el('section', { className: 'p-section' }, el('h3', { className: 'p-title' }, 'His railway so far'), book),
    row('His name', 'Used in the spoken hello, from the next time it opens', name),
    row('Say hello', 'Out loud, when the app opens', hello.node),
    row('Speed', 'For every engine', speed.node),
    row('Help stopping', 'How early pulling down still arrives', stop.node),
    row('Volume', '', volume),
    row('Evenings', 'The sky slowly turns golden, then dusk, and back', dayNight.node),
    row('Branch line', 'Arrows to choose the windmill or the lighthouse', junction.node),
    row('Blue engine’s face', 'Original is drawn for this game and safe to share', face.node),
    row('Nameplates', 'Painted on the side tanks. Blank for none', plates),
    row('Picture', 'Auto turns shadows down if the tablet struggles', picture.node),
  );

  const sheet = el(
    'div',
    { className: 'p-sheet', role: 'dialog', ariaLabel: 'Grown-ups' },
    el('header', {}, el('h2', {}, 'Grown-ups'), done),
    body,
    el('footer', {}, resetTrain, resetAll, clearBook, footnote),
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
    scrapbook(book);
    footnote.textContent = `${hooks.status()} · Build ${__BUILD__}`;
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
