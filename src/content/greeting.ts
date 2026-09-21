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
