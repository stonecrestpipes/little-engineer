import type { EngineSpec } from './spec';
import { thomas } from './thomas';
import { marigold } from './marigold';
import { pip } from './pip';
import { bramble } from './bramble';

export type { EngineSpec } from './spec';

/**
 * Every engine, in the order they stand in the yard.
 *
 * The first is the one he starts with the very first time. After that the
 * choice is remembered, because having to find his engine again every morning
 * would be the game taking something back off him.
 */
export const ENGINES: EngineSpec[] = [thomas, marigold, pip, bramble];

export function engineById(id: string): EngineSpec {
  return ENGINES.find((e) => e.id === id) ?? ENGINES[0];
}
