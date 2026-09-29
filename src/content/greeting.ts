/**
 * Said out loud when the app opens, and shown on the loading screen while it
 * is being said. Using his name is the point: it is the one moment in the game
 * that is addressed to him rather than to whoever is holding the tablet.
 *
 * The name itself is a parent setting, so it can be changed on the tablet.
 */
export function greetingFor(name: string): string {
  const who = name.trim();
  return who ? `Hello ${who}. Are you ready for a great train day?` : 'Hello! Are you ready for a great train day?';
}

/**
 * The two things the voice buttons say, in the order they sit on screen.
 *
 * They are the same words every time on purpose: he cannot read the buttons,
 * so the only way to learn which is which is that each one never changes its
 * mind. Nothing in the game depends on either having been said.
 */
export const PHRASES = ['All aboard!', 'Full steam ahead!'] as const;
