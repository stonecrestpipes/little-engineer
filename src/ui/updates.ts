import { registerSW } from 'virtual:pwa-register';

export interface UpdateOptions {
  /**
   * True once the session is genuinely in use. We never reload over the top
   * of a child who is mid-journey — the update waits for a safe moment.
   */
  inUse: () => boolean;
}

/**
 * Keeps the installed app current.
 *
 * The default registration is fire-and-forget: it registers once on load and
 * never looks again, so a pushed update only shows up on the launch *after*
 * the one that happened to download it — and if the app sits in the
 * background for days, the browser may not check at all.
 *
 * Instead: actively check whenever the app is opened or brought back to the
 * front, and apply the new version at a moment that interrupts nothing —
 * either before he has touched anything, or once the app is hidden. Either
 * way the next time he looks at it, it is the new version.
 */
export function watchForUpdates({ inUse }: UpdateOptions): void {
  let pending = false;
  let applying = false;

  const updateSW = registerSW({
    immediate: true,

    onNeedRefresh() {
      pending = true;
      apply();
    },

    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      const check = (): void => {
        void registration.update().catch(() => {
          /* offline, or the host is unreachable — try again next time */
        });
      };

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          check(); // he just opened it: is there anything new?
        } else {
          apply(); // he just left it: safe to swap underneath
        }
      });

      // Just after launch, and occasionally during a long session.
      window.setTimeout(check, 3000);
      window.setInterval(check, 15 * 60 * 1000);
    },
  });

  function apply(): void {
    if (!pending || applying) return;
    // Only when nothing is being interrupted.
    if (inUse() && document.visibilityState === 'visible') return;
    applying = true;
    void updateSW(true); // activate the waiting worker, then reload
  }
}
