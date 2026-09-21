/**
 * The spoken hello.
 *
 * This is the only speech in the game, and it is synthesised by the device
 * rather than recorded — there is no audio file to ship, and changing the
 * words is changing a string.
 *
 * The complication is that Chrome on Android will not speak until the page has
 * been touched, and an app launched from the home screen has not been touched.
 * So: try immediately, and if nothing comes out, say it on the first touch
 * instead. Either way the loading screen is never left waiting on it.
 */

/** How long to wait for the device to make a sound before assuming it won't. */
const GIVE_UP_MS = 1200;
/** Queued but still silent by now means it is not going to speak. */
const STILL_SILENT_MS = 2200;
/** Nothing holds the loading screen longer than this, whatever happens. */
const LONGEST_MS = 8000;

/** A real voice in preference to the flat built-in one, when there is one. */
function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  if (english.length === 0) return null;
  const score = (v: SpeechSynthesisVoice) =>
    (/natural|enhanced|premium|google/i.test(v.name) ? 2 : 0) +
    (v.localService ? 1 : 0) +
    (v.lang.toLowerCase().startsWith('en-gb') ? 1 : 0);
  return english.reduce((best, v) => (score(v) > score(best) ? v : best), english[0]);
}

/**
 * Resolves once it has been said — or once it is clear it will not be said
 * until he touches the screen, so the caller can get on with things.
 */
export function sayHello(text: string): Promise<void> {
  const synth = window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return Promise.resolve();

  return new Promise<void>((resolve) => {
    let started = false;
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const utter = (): void => {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.92;
      u.pitch = 1.1;
      const voice = pickVoice(synth.getVoices());
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      }
      u.onstart = () => {
        started = true;
      };
      u.onend = done;
      u.onerror = done;
      synth.cancel();
      synth.speak(u);
    };

    // getVoices() is empty until the list has loaded on some browsers, and an
    // utterance queued before then gets the default voice.
    if (synth.getVoices().length > 0) {
      utter();
    } else {
      let once = false;
      const ready = () => {
        if (once) return;
        once = true;
        utter();
      };
      synth.addEventListener('voiceschanged', ready, { once: true });
      window.setTimeout(ready, 400);
    }

    window.setTimeout(() => {
      if (started || synth.speaking || synth.pending) return;
      // Blocked, almost certainly for want of a gesture. Say it on his first
      // touch instead, and stop holding anything up in the meantime.
      window.addEventListener('pointerdown', () => utter(), { once: true });
      done();
    }, GIVE_UP_MS);

    window.setTimeout(() => {
      // Queued, accepted, and nothing has come out of the speaker. Some
      // devices never fire onend either, so stop waiting on it.
      if (!started) done();
    }, STILL_SILENT_MS);

    window.setTimeout(done, LONGEST_MS);
  });
}
