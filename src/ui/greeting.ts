/**
 * The speech: the hello when it opens, and the two things the voice buttons
 * say.
 *
 * All of it is synthesised by the device rather than recorded — there is no
 * audio file to ship, and changing the words is changing a string.
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
/**
 * How long to let the speaker have, after the touch that unblocks it, before
 * deciding the hello is never coming. The touch that triggers the retry is
 * the same gesture that releases an utterance which was only ever waiting for
 * one, so asking in the same task is a race — see `sayHello`.
 */
const RELEASED_MS = 350;

/**
 * The voice, chosen once and kept.
 *
 * It used to be chosen afresh for every utterance, and `getVoices()` does not
 * return the same list every time it is asked — the list arrives
 * asynchronously and grows. So the hello could come out in one voice and the
 * next thing in another, which is exactly what it sounded like.
 */
let chosen: SpeechSynthesisVoice | null = null;

/** A real voice in preference to the flat built-in one, when there is one. */
function voice(): SpeechSynthesisVoice | null {
  if (chosen) return chosen;
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  if (english.length === 0) return null; // ask again later, when the list has loaded
  const score = (v: SpeechSynthesisVoice) =>
    (/natural|enhanced|premium|google/i.test(v.name) ? 2 : 0) +
    (v.localService ? 1 : 0) +
    (v.lang.toLowerCase().startsWith('en-gb') ? 1 : 0);
  chosen = english.reduce((best, v) => (score(v) > score(best) ? v : best), english[0]);
  return chosen;
}

/** Put the kept voice on an utterance, if there is one to put. */
function inOurVoice(u: SpeechSynthesisUtterance): void {
  const v = voice();
  if (!v) return;
  u.voice = v;
  u.lang = v.lang;
}

/**
 * Say something, now. Used by the voice buttons, which he presses himself, so
 * there is no waiting to see whether the device will speak and no falling back
 * to the next touch: either it talks or it does not.
 *
 * A second press cuts the first off rather than queueing behind it. He will
 * press it again and again, and a queue would still be talking minutes later.
 */
export function say(text: string, volume = 1): void {
  const synth = window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  u.pitch = 1.15;
  u.volume = Math.max(0, Math.min(1, volume));
  inOurVoice(u);
  synth.cancel();
  synth.speak(u);
}

/**
 * Resolves once it has been said — or once it is clear it will not be said
 * until he touches the screen, so the caller can get on with things.
 *
 * **It is said once.** That is harder than it sounds, because the only way to
 * know whether a device is going to speak is to try it and wait, and the
 * waiting has to give up at some point in case it never does. When it gave up
 * it used to arrange to say the hello again on the next touch — and a device
 * that was merely slow would be half way through "Hello Orion, are you…" when
 * his finger landed on the loading screen, at which point the retry cancelled
 * it mid-word and started over. Everything below the timeouts is about that:
 * the retry now asks whether anything is already coming out of the speaker,
 * and stands down if it is.
 */
export function sayHello(text: string): Promise<void> {
  const synth = window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return Promise.resolve();

  return new Promise<void>((resolve) => {
    let started = false;
    let settled = false;
    /** Set the moment anything is handed to the speaker, so it is handed once. */
    let said = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    /** Anything at all coming out of, or queued for, the speaker. */
    const talking = () => started || synth.speaking || synth.pending;

    /**
     * The voice the first attempt went out with, kept so that a retry can
     * never come out in a different one. `getVoices()` is empty for the first
     * moments after an app launch, so an early utterance gets the device
     * default while anything later gets the chosen voice — which is what
     * "it said it twice in two different voices" sounded like.
     */
    let usedVoice: SpeechSynthesisVoice | null | undefined;

    const utter = (): void => {
      if (said) return;
      said = true;
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.92;
      u.pitch = 1.1;
      if (usedVoice === undefined) {
        inOurVoice(u);
        usedVoice = u.voice;
      } else if (usedVoice) {
        u.voice = usedVoice;
        u.lang = usedVoice.lang;
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
      const ready = () => utter(); // `said` already makes this once-only
      synth.addEventListener('voiceschanged', ready, { once: true });
      window.setTimeout(ready, 400);
    }

    window.setTimeout(() => {
      if (talking()) return;
      // Blocked, almost certainly for want of a gesture. Say it on his first
      // touch instead, and stop holding anything up in the meantime.
      //
      // Checked again when the touch actually arrives, not just now: between
      // here and then the device may have found its voice on its own, and
      // speaking over the top of it is worse than not speaking at all.
      const onTouch = () => {
        if (talking()) return;
        // This touch is also the gesture that unblocks the speaker, so an
        // utterance that was merely waiting for one is about to start. Give
        // it that moment before deciding it never will: re-uttering in the
        // same task as the gesture is a race, and losing it means both the
        // first utterance and the retry are heard.
        window.setTimeout(() => {
          if (talking()) return;
          said = false;
          utter();
        }, RELEASED_MS);
      };
      window.addEventListener('pointerdown', onTouch, { once: true });
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
