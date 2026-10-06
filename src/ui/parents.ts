import { settings, SPEEDS, type Settings } from '../settings';
import { ENGINES } from '../content/engines';
import { journal } from '../journal';
import { trail, glance, asText, type Mark } from '../trail';
import type { UpdateCheck } from './updates';
import { install, installReport, installState, onInstallChange } from './install';

const PLACES: [string, string][] = [
  ['sheds', 'The Sheds'],
  ['farm', 'The Farm'],
  ['windmill', 'The Windmill'],
  ['city', 'The City'],
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
        ? `Leaving The Sheds: ${turns('city', 'the meadow', 'the city')}. ` +
            `Across the meadow: ${turns('woods', 'The Farm', 'the woods')}. ` +
            `After The Farm: ${turns('farm', 'the tunnel', 'the windmill')}. ` +
            `After The Harbour: ${turns('coast', 'home', 'the lighthouse')}.`
        : 'He has not been past any points yet.',
      el('br'),
      // The two open questions about the buttons: does he use R at all, and
      // does he go and get himself a car now he can see the yard.
      `Backed up with R ${count(j.reverses)} times. ` +
        `Changed what is behind the engine ${count(j.couplings)} times.`,
      el('br'),
      `Kept on this tablet since ${since}. He never sees any of this.`,
    ),
  );
}

/** Plain English for the names the trail keeps things under. */
const SAID: Partial<Record<Mark, string>> = {
  green: 'green',
  red: 'red',
  reverse: 'R',
  whistle: 'the whistle',
  say: 'a voice',
  camera: 'the camera',
  points: 'an arrow',
  yard: 'the yard',
  crane: 'the crane',
  nothing: 'nothing',
  look: 'a look round',
  pinch: 'a pinch',
};

const spell = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const rest = Math.round(seconds - m * 60);
  return rest === 0 ? `${m}m` : `${m}m ${rest}s`;
};

/**
 * The trail, in a few lines: how long he plays for, how fast he presses
 * things, and what he tends to press next.
 *
 * Deliberately short. The whole trail is in the log the two buttons below it
 * hand over, and that is where the real looking happens; this is only enough
 * to know whether the log is worth asking for yet.
 */
function trailGlance(into: HTMLElement): void {
  const t = trail.get();
  if (t.beats.length === 0) {
    into.replaceChildren(el('p', { className: 'p-note' }, 'Nothing recorded yet.'));
    return;
  }
  const g = glance(t.beats);
  const tile = (value: string, label: string) =>
    el('div', { className: 'p-tile' }, el('b', {}, value), el('small', {}, label));

  const pairs = g.pairs.length
    ? g.pairs
        .map((p) => `${SAID[p.from] ?? p.from} then ${SAID[p.to] ?? p.to} (${count(p.n)})`)
        .join(', ')
    : 'nothing twice in a row yet';

  into.replaceChildren(
    el('div', { className: 'p-tiles' },
      tile(count(g.sittings), g.sittings === 1 ? 'sitting' : 'sittings'),
      tile(spell(g.typical), 'typical sitting'),
      tile(spell(g.longest), 'longest'),
      tile(count(g.presses), 'things pressed'),
    ),
    el('p', { className: 'p-note' },
      `Usually ${g.betweenPresses}s between touching anything. `,
      `He most often does: ${pairs}.`,
      el('br'),
      g.unanswered > 0
        ? `He has tapped the world and had nothing answer ${count(g.unanswered)} times — ` +
            'where that happened is in the log, and it is the best clue there is about ' +
            'what he expects to be able to touch.'
        : 'He has not yet tapped anything that failed to answer.',
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
  /**
   * Ask the host whether there is a newer build, and take it if there is.
   *
   * The tablet keeps the whole game cached so it works in flight mode, which
   * means a build pushed an hour ago may not be the one he opens. Normally
   * that sorts itself out the next time the app is closed and reopened; this
   * is for when somebody wants to be sure.
   */
  checkForUpdate(): Promise<UpdateCheck>;
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
    if (!window.confirm('Clear the scrapbook and the play log? This cannot be undone.')) return;
    journal.clear();
    trail.clear();
    scrapbook(book);
    trailGlance(trailBox);
    logSaid.textContent = '';
  });

  // --- the play log --------------------------------------------------------
  // Two ways off the tablet, because the right one depends on where you are:
  // copying it goes straight into a message, saving it gives you a file to
  // keep. Neither sends it anywhere by itself — nothing in the game ever
  // talks to the outside world except the update check.
  const trailBox = el('div', { className: 'p-book' });
  const logSaid = el('small', { className: 'p-said' });
  const said = (what: string) => {
    logSaid.textContent = what;
    window.setTimeout(() => (logSaid.textContent = ''), 4000);
  };
  const logName = () => `little-engineer-log-${new Date().toISOString().slice(0, 10)}.csv`;

  const copyLog = el('button', { type: 'button', className: 'p-plain', textContent: 'Copy the play log' });
  copyLog.addEventListener('click', () => {
    trail.flush();
    const text = asText(__BUILD__);
    // The clipboard needs permission it may not have, and an iPad will refuse
    // it outright in some contexts. The old way still works everywhere, so it
    // is what happens when the new way says no rather than nothing happening.
    const fallback = () => {
      const box = el('textarea', { value: text });
      box.style.position = 'fixed';
      box.style.opacity = '0';
      document.body.append(box);
      box.select();
      const ok = document.execCommand('copy');
      box.remove();
      said(ok ? 'Copied — paste it anywhere.' : 'This tablet would not let it be copied. Save it instead.');
    };
    if (!navigator.clipboard) return fallback();
    void navigator.clipboard.writeText(text).then(
      () => said('Copied — paste it anywhere.'),
      () => fallback(),
    );
  });

  const saveLog = el('button', { type: 'button', className: 'p-plain', textContent: 'Save the play log' });
  saveLog.addEventListener('click', () => {
    trail.flush();
    const blob = new Blob([asText(__BUILD__)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: logName() });
    document.body.append(a);
    a.click();
    a.remove();
    // Freed on the next turn of the loop rather than immediately: revoking it
    // in the same tick cancels the download on some browsers.
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    said('Saved to wherever this tablet puts downloads.');
  });

  const logBox = el('div', { className: 'p-logs' }, copyLog, saveLog, logSaid);

  // --- checking for a new build -------------------------------------------
  // The one control in here that talks to the outside world. It says what it
  // found rather than just doing something invisible, because "nothing
  // happened" and "nothing needed to happen" look identical otherwise.
  const CHECK_LABEL = 'Check now';
  const update = el('button', { type: 'button', className: 'p-plain', textContent: CHECK_LABEL });
  const updateSaid = el('small', { className: 'p-said' });
  const updateBox = el('div', { className: 'p-stack' }, update, updateSaid);
  update.addEventListener('click', () => {
    if (update.disabled) return;
    update.disabled = true;
    update.textContent = 'Checking…';
    updateSaid.textContent = '';
    void hooks.checkForUpdate().then((what) => {
      update.textContent = CHECK_LABEL;
      update.disabled = false;
      updateSaid.textContent = {
        // Nothing follows this one: the page reloads underneath it.
        updating: 'Found a newer one — restarting…',
        current: 'This is the newest one there is.',
        offline: 'No connection, so there was nobody to ask.',
        unmanaged: 'Only installed copies are cached, and this one is not.',
      }[what];
    });
  });

  // --- putting it on the home screen ---------------------------------------
  // The row is always here and always says where it stands, because the three
  // reasons there is no button — this *is* the installed app, a copy is already
  // on this device, the browser has not offered one — all look identical from
  // the outside: an absence. Saying which it is costs a line and saves a hunt.
  // src/ui/install.ts says why the page has to make the offer itself at all.
  const installApp = el('button', { type: 'button', className: 'p-plain', textContent: 'Install app' });
  const installSaid = el('small', { className: 'p-said' });
  // Everything the page can observe about its own installability. It is on
  // screen because the device where this goes wrong is a phone, with no console
  // to open and nothing to ask — so the answer has to be readable from the
  // panel itself.
  const installFacts = el('small', { className: 'p-facts' });
  const installRow = row(
    'Install app',
    'Put it on the home screen, so it opens fullscreen and works offline',
    installApp,
  );
  installRow.classList.add('p-install');
  installRow.append(installSaid, installFacts);

  /** Where it stands, in a sentence, whenever there is no button to press. */
  const WHY: Record<ReturnType<typeof installState>, string> = {
    running: 'Already installed — this is it running.',
    offered: '',
    installed: 'Installed from here just now. Open it from the home screen.',
    // No guess about *why*. The page cannot tell "already installed here" from
    // "the browser has not got round to it" — an earlier version claimed it
    // could, on the strength of getInstalledRelatedApps(), which only ever
    // reports apps named in the manifest's related_applications and so answers
    // the same on every device. What the page *can* do is say what it observed,
    // which is the line underneath.
    unoffered: 'Chrome has not offered an install on this device. If it is already on the home screen, that is why.',
  };

  /**
   * The offer arrives whenever the browser feels like it, which may well be
   * after this panel was built, and it is spent as soon as it is used — so both
   * the button and the line hang on the live answer rather than on whatever was
   * true at mount.
   */
  const syncInstall = () => {
    const state = installState();
    installApp.hidden = state !== 'offered';
    installSaid.textContent = WHY[state];
    installSaid.hidden = installSaid.textContent === '';
    installFacts.textContent = installReport();
  };
  syncs.push(syncInstall);
  onInstallChange(syncInstall);

  installApp.addEventListener('click', () => {
    // Nothing may be awaited before the prompt: the browser only allows it
    // while the tap is still being handled.
    const asked = install();
    installApp.disabled = true;
    void asked.then((what) => {
      installApp.disabled = false;
      // The standing wording first, so the button is right, then what just
      // happened over the top of it — that is the more interesting of the two
      // until the panel is next opened.
      syncInstall();
      installSaid.textContent = {
        accepted: 'Installing — look for it on the home screen.',
        // Chrome will not offer again in this page load, and its own menu is
        // no help on this origin, so say what actually will work.
        dismissed: 'Not installed. Close the game and open it again to be asked afresh.',
        // A refused prompt keeps the offer, so the button is still there and
        // trying again is the right advice.
        unavailable: installApp.hidden
          ? 'The browser would not show the prompt. Close the game and open it again.'
          : 'The browser would not show it just then. Try again.',
      }[what];
      installSaid.hidden = false;
    });
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
    el('section', { className: 'p-section' },
      el('h3', { className: 'p-title' }, 'How he plays'),
      trailBox,
      el('p', { className: 'p-note' },
        'Every press, tap, drag and arrival, in the order it happened and with ' +
          'where the train was at the time. Kept on this tablet only. Take a copy ' +
          'of it to work out what to build next.'),
      logBox,
    ),
    row('His name', 'Used in the spoken hello, from the next time it opens', name),
    row('Say hello', 'Out loud, when the app opens', hello.node),
    row('Speed', 'For every engine', speed.node),
    row('Help stopping', 'How early pulling down still arrives', stop.node),
    row('Volume', '', volume),
    row('Evenings', 'The sky slowly turns golden, then dusk, and back', dayNight.node),
    row('Branch lines', 'Arrows at the four places the railway divides', junction.node),
    row('Blue engine’s face', 'Original is drawn for this game and safe to share. Familiar is the photograph', face.node),
    row('Nameplates', 'Painted on the side tanks. Blank for none', plates),
    row('Picture', 'Auto turns shadows down if the tablet struggles', picture.node),
    installRow,
    row('Updates', 'The tablet keeps its own copy so the game works offline. This asks whether a newer one has been put out', updateBox),
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
    trail.mark('closed');
  };

  /**
   * When the panel last opened, so that the gesture which opened it cannot also
   * close it.
   *
   * The panel appears *underneath a finger that is still on the glass*, and
   * whatever is at that point — the backdrop, or Done, which sits in the same
   * top-right corner the way in is — gets the tail of that gesture and shuts it
   * again. It opened and closed in a blink. Nobody can deliberately press Done
   * within a third of a second of it existing, so anything that quick is the
   * gesture that opened it, not a decision to leave.
   */
  let openedAt = 0;
  const SETTLE_MS = 350;
  const settled = () => performance.now() - openedAt > SETTLE_MS;

  done.addEventListener('click', () => {
    if (settled()) close();
  });
  panel.addEventListener('click', (e) => {
    if (e.target === panel && settled()) close();
  });

  const open = () => {
    // Everything from here until the panel closes is a grown-up, and the log
    // marks it so, because a fortnight of his play is worth nothing if an
    // evening of fiddling in here is mixed into it.
    trail.mark('grown-ups');
    syncs.forEach((f) => f());
    scrapbook(book);
    trailGlance(trailBox);
    logSaid.textContent = '';
    footnote.textContent = `${hooks.status()} · Build ${__BUILD__}`;
    hooks.opened();
    panel.hidden = false;
    body.scrollTop = 0;
    openedAt = performance.now();
  };

  // --- the version stamp, as the way in -------------------------------------
  // Three seconds of holding a corner is a lot to ask of someone who only wants
  // to check a setting, and there is nothing there to aim at. The build stamp is
  // already sat in that same corner saying which build this is, so it doubles as
  // the handle: two taps on it and the panel opens.
  //
  // Two rather than one, because a single tap is well within what he does to the
  // screen all day — the trail is full of taps on things that answer nothing —
  // and behind this panel are every setting and the only copy of his play log.
  // The corner hold stays as it was, so nothing anyone has learned stops working.
  const DOUBLE_TAP_MS = 450;
  const stamp = document.getElementById('version');
  let lastTap = 0;
  stamp?.addEventListener('click', (e) => {
    if (!panel.hidden) return;
    e.stopPropagation();
    const t = performance.now();
    const quick = t - lastTap < DOUBLE_TAP_MS;
    // Reset rather than chain, so three taps is not two openings.
    lastTap = quick ? 0 : t;
    if (quick) open();
  });

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
