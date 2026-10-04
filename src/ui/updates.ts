import { registerSW } from 'virtual:pwa-register';

/** What came of asking the host whether there is a newer build. */
export type UpdateCheck =
  /** There is one, it is coming in, and the page is about to reload itself. */
  | 'updating'
  /** Asked, answered: this is the newest build there is. */
  | 'current'
  /** Could not ask — no connection, or the host did not answer. */
  | 'offline'
  /** Nothing to ask: this copy is not installed as an app. */
  | 'unmanaged';

export interface Updates {
  /**
   * Ask now, rather than waiting for the next safe moment.
   *
   * This is the grown-ups' button, and it deliberately ignores the "not while
   * he is playing" rule that the automatic path obeys: somebody has asked for
   * the new version on purpose, with the panel open and the game already let
   * go of, so there is nothing to interrupt.
   */
  checkNow(): Promise<UpdateCheck>;
}

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
export function watchForUpdates({ inUse }: UpdateOptions): Updates {
  let pending = false;
  let applying = false;
  let registration: ServiceWorkerRegistration | undefined;

  const updateSW = registerSW({
    immediate: true,

    onNeedRefresh() {
      pending = true;
      apply();
    },

    onRegisteredSW(_swUrl, reg) {
      if (!reg) return;
      registration = reg;

      const check = (): void => {
        void reg.update().catch(() => {
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

  /** Take whatever is already waiting, now. */
  function take(): UpdateCheck {
    applying = true;
    void updateSW(true);
    return 'updating';
  }

  return {
    async checkNow() {
      // One already downloaded and being held back because he was playing.
      if (pending) return take();
      if (!registration) return 'unmanaged';
      try {
        await registration.update();
      } catch {
        return 'offline';
      }
      // `update()` resolves when the new worker has been *fetched*; it still
      // has to install before it counts as waiting, and onNeedRefresh fires at
      // the end of that. So give it a moment rather than answering too early
      // and telling a grown-up there is nothing new when there is.
      const until = Date.now() + 8000;
      while (!pending && Date.now() < until) {
        if (!registration.installing && !registration.waiting) break;
        await new Promise((done) => window.setTimeout(done, 200));
      }
      if (pending || registration.waiting) return take();
      return 'current';
    },
  };
}
