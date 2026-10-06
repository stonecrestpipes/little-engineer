/**
 * Installing the app from inside the app, via the browser's
 * `beforeinstallprompt` event.
 *
 * Why this exists rather than leaving it to Chrome's own menu: on Android,
 * *Install and create shortcut* treats a page as already installed when **any**
 * installed app shares its origin (`WebappRegistry.isAppInstalledForUrl` ->
 * `hasAtLeastOneWebApkForOrigin`). Every app on `stonecrestpipes.github.io`
 * shares one origin, so once a sibling is installed that menu refuses this one:
 * "This app is already installed", then "Could not open app". The page's own
 * install prompt checks the app's `start_url` instead
 * (`WebappsUtils::IsWebApkInstalled`), so it still offers a real install.
 *
 * Nothing here can be fixed by clearing site data for that origin — it is
 * shared by every app on it, and clearing it would take the others' storage
 * with it. The page prompt is the fix.
 *
 * Imported first thing in `main.ts`, before three.js and before the game is
 * built, so the listener is in place whenever the event fires. The browser
 * fires it once per page load at a moment of its own choosing and will not
 * replay it for a listener that turned up late.
 */

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** What came of asking. */
export type InstallOutcome =
  /** He said yes; the app is being installed. */
  | 'accepted'
  /** He said no. Chrome offers again on a later launch, not straight away. */
  | 'dismissed'
  /** There was no offer to make, or the browser refused to make it. */
  | 'unavailable';

/** The offer the browser made, kept until it is used or the app is installed. */
let offered: InstallPromptEvent | null = null;
const watchers = new Set<() => void>();
const changed = () => watchers.forEach((f) => f());

window.addEventListener('beforeinstallprompt', (e) => {
  // Deliberately no `preventDefault()`: suppressing the event is what hides
  // the browser's own install affordances, and this is meant to sit alongside
  // them rather than replace them.
  offered = e as InstallPromptEvent;
  changed();
});

window.addEventListener('appinstalled', () => {
  offered = null;
  changed();
});

/** True when this copy is the installed app rather than a browser tab. */
export function runningInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
}

/**
 * True when there is an install to offer from a tap.
 *
 * False inside the installed app, which has nowhere to go: the event does not
 * fire there anyway, but a window opened before the install happened can still
 * be holding one.
 */
export function canInstall(): boolean {
  return offered !== null && !runningInstalled();
}

/**
 * Offer it. **Must be called from inside the tap handler** — the browser only
 * allows the prompt while a gesture is still being handled, so there can be no
 * `await` before this. On a touch screen the gesture is the finger *lifting*,
 * which is what `click` fires on.
 *
 * Once the prompt is actually shown the offer is spent, however he answers: one
 * event prompts once, and the browser sends a fresh one if it still wants to
 * offer. If the browser refuses to show it the offer is put back, so the next
 * tap can try again rather than finding the button gone.
 */
export async function install(): Promise<InstallOutcome> {
  const offer = offered;
  offered = null;
  changed();
  if (!offer) return 'unavailable';
  try {
    await offer.prompt();
  } catch {
    // Refused — most likely the tap did not count as a gesture, or this offer
    // has already been used. Either way, keep it and let him try again.
    offered = offer;
    changed();
    return 'unavailable';
  }
  try {
    const { outcome } = await offer.userChoice;
    return outcome;
  } catch {
    // Shown, but the answer never came back. The offer is spent regardless.
    return 'unavailable';
  }
}

/** Told whenever the answer to `canInstall()` may have changed. */
export function onInstallChange(f: () => void): () => void {
  watchers.add(f);
  return () => watchers.delete(f);
}
