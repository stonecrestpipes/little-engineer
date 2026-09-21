/**
 * Keep the screen on while he is playing.
 *
 * Watching the railway is half of how this game is played, and the tablet
 * dimming in the middle of it would read as the game switching itself off.
 * But the train only moves while the lever is held, so once nobody has touched
 * the screen for a few minutes nobody is playing: the lock is let go and the
 * tablet is allowed to sleep as it normally would.
 */

/** No touch for this long and the tablet may sleep again. */
const IDLE_MS = 5 * 60 * 1000;

interface Lock extends EventTarget {
  release(): Promise<void>;
}

export function keepAwake(): { touched(): void } {
  const wl = (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<Lock> } }).wakeLock;
  let lock: Lock | null = null;
  let asking = false;
  let lastTouch = -Infinity;

  const playing = () => performance.now() - lastTouch < IDLE_MS;

  const take = () => {
    if (!wl || lock || asking || !playing() || document.visibilityState !== 'visible') return;
    asking = true;
    wl.request('screen')
      .then((l) => {
        lock = l;
        l.addEventListener('release', () => (lock = null));
      })
      .catch(() => {
        // Battery saver, or not allowed. The screen just behaves as normal.
      })
      .finally(() => (asking = false));
  };

  document.addEventListener('visibilitychange', take);
  window.setInterval(() => {
    if (lock && !playing()) void lock.release();
  }, 30 * 1000);

  return {
    touched() {
      lastTouch = performance.now();
      take();
    },
  };
}
