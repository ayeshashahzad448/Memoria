/**
 * Coordinator for the subtle "memory comes alive" effect in the cosmos.
 *
 * At most one star at a time briefly reveals a hint of its content — a photo
 * gently illuminating inside the star, or a slow audio waveform playing — then
 * fades back out. Cycles are randomized and spaced at least MIN_GAP_MS apart so
 * the effect stays rare and quiet rather than constant.
 */
import type { MemoryStar } from '@/lib/types';

export type MediaKind = 'photo' | 'audio';

export interface ActiveMedia {
  starId: string;
  kind: MediaKind;
  /** Photo uri to illuminate (only for kind === 'photo'). */
  photoUri?: string;
}

/** Minimum quiet interval between two reveals (ms). */
export const MIN_GAP_MS = 30_000;
/** Extra random spread added on top of the minimum gap (ms). */
export const GAP_SPREAD_MS = 20_000;
/** How long a single reveal lasts, including fade in/out (seconds). */
export const REVEAL_DURATION_S = 7;

interface Candidate {
  starId: string;
  kind: MediaKind;
  photoUri?: string;
}

/** Build the pool of stars that have something worth revealing. */
export function buildCandidates(stars: MemoryStar[]): Candidate[] {
  const pool: Candidate[] = [];
  for (const star of stars) {
    if (star.photos.length > 0) {
      pool.push({ starId: star.id, kind: 'photo', photoUri: star.photos[0] });
    }
    if (star.voiceNotes.length > 0) {
      pool.push({ starId: star.id, kind: 'audio' });
    }
  }
  return pool;
}

/** Pick a random candidate, avoiding repeating the immediately previous star. */
export function pickCandidate(pool: Candidate[], lastStarId: string | null): Candidate | null {
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0];
  const choices = pool.filter((c) => c.starId !== lastStarId);
  const from = choices.length > 0 ? choices : pool;
  return from[Math.floor(Math.random() * from.length)];
}

/** A randomized gap (ms) before the next reveal. */
export function nextGapMs(): number {
  return MIN_GAP_MS + Math.random() * GAP_SPREAD_MS;
}
