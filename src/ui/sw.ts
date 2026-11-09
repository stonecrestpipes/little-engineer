/**
 * Registering the service worker, and noticing when a new build is waiting.
 *
 * This is the half-page that `virtual:pwa-register` used to provide. It keeps
 * that function's shape — same options, same returned `updateSW` — so the
 * reasoning in src/ui/updates.ts about *when* to apply an update did not have to
 * be rewritten to lose a dependency.
 *
 * Two things it deliberately does not do, because the worker in
 * scripts/build-sw.mjs and the policy in updates.ts do them instead: it never
 * activates a new worker on its own, and it never decides when to reload.
 */

/** The callbacks updates.ts hangs its policy on. */
export interface RegisterSWOptions {
  /** Register now rather than waiting for the window's load event. */
  immediate?: boolean;
  /** A new build is installed and waiting for permission to take over. */
  onNeedRefresh?: () => void;
  /** Registration succeeded; here is the registration to ask `update()` of. */
  onRegisteredSW?: (swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
  /** Registration failed. */
  onRegisterError?: (error: unknown) => void;
}

/**
 * Ask the waiting worker to take over, and reload when it does.
 *
 * `reloadPage` only arms the reload — it does not force one. A page that is not
 * controlled by any worker never gets a `controllerchange`, which is the state
 * the app is in the first time it is opened after an install, so the caller
 * keeps a backstop of its own. See `swap()` in updates.ts.
 */
export type UpdateSW = (reloadPage?: boolean) => Promise<void>;

export function registerSW(options: RegisterSWOptions = {}): UpdateSW {
  const { immediate = false, onNeedRefresh, onRegisteredSW, onRegisterError } = options;

  let registration: ServiceWorkerRegistration | undefined;
  let reloading = false;

  const updateSW: UpdateSW = async (reloadPage = true) => {
    if (reloadPage) {
      navigator.serviceWorker.addEventListener(
        'controllerchange',
        () => {
          if (reloading) return;
          reloading = true;
          window.location.reload();
        },
        { once: true },
      );
    }
    // No waiting worker means there is nothing to hurry along; the caller's
    // backstop deals with it rather than this reloading on a guess.
    registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  };

  // There is no worker in `npm run dev`: the build is what generates one, and
  // registering a 404 would only produce a console error on every reload. The
  // old virtual module stubbed itself out the same way, which is why
  // `checkNow()` answers 'unmanaged' on this machine.
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return updateSW;

  const swUrl = `${import.meta.env.BASE_URL}sw.js`;

  /**
   * A worker that has finished installing while another one is still in charge
   * is a new build waiting. On the very first install there is no controller and
   * nothing to refresh into, which is why the controller is part of the test.
   */
  function announceIfWaiting(worker: ServiceWorker | null): void {
    if (!worker || !navigator.serviceWorker.controller) return;
    if (worker.state === 'installed') {
      onNeedRefresh?.();
      return;
    }
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) onNeedRefresh?.();
    });
  }

  async function register(): Promise<void> {
    try {
      // `updateViaCache: 'none'` keeps the browser from answering the check for a
      // new worker out of its own HTTP cache, which on GitHub Pages can be ten
      // minutes stale — the same reason the worker precaches with cache:
      // 'reload'.
      const reg = await navigator.serviceWorker.register(swUrl, {
        scope: import.meta.env.BASE_URL,
        updateViaCache: 'none',
      });
      registration = reg;

      announceIfWaiting(reg.waiting);
      reg.addEventListener('updatefound', () => announceIfWaiting(reg.installing));

      onRegisteredSW?.(swUrl, reg);
    } catch (error) {
      onRegisterError?.(error);
    }
  }

  if (immediate) void register();
  else window.addEventListener('load', () => void register(), { once: true });

  return updateSW;
}
