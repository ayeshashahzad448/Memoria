import type { StarColor, StarColorKey, MemoriaUser } from '@/lib/types';

/**
 * Emotion color palette for the star glow grid — Midnight Aurora resonance
 * accents. Each color maps to an emotion the memory evokes.
 */
export const STAR_COLORS: StarColor[] = [
  { key: 'cyan', label: 'Cyan', emotion: 'Calm', hex: '#45F3FF' },
  { key: 'rose', label: 'Rose', emotion: 'Love', hex: '#FF2A6D' },
  { key: 'amber', label: 'Amber', emotion: 'Nostalgia', hex: '#FFC75F' },
  { key: 'violet', label: 'Violet', emotion: 'Wonder', hex: '#7A04EB' },
  { key: 'emerald', label: 'Emerald', emotion: 'Growth', hex: '#5FE0A8' },
];

export const DEFAULT_STAR_COLOR: StarColorKey = 'cyan';

export function colorFor(key: StarColorKey): StarColor {
  return STAR_COLORS.find((c) => c.key === key) ?? STAR_COLORS[0];
}

/**
 * Dynamic sizing engine: the more text the user writes, the larger the star.
 * Returns a radius in cosmos-local units. "Large text = a large star = a core memory."
 */
export const MIN_STAR_RADIUS = 4;
export const MAX_STAR_RADIUS = 26;

export function radiusForText(text: string): number {
  const len = text.trim().length;
  // Smooth growth that saturates around ~600 characters.
  const t = 1 - Math.exp(-len / 220);
  return MIN_STAR_RADIUS + (MAX_STAR_RADIUS - MIN_STAR_RADIUS) * t;
}

/**
 * Soft pan boundary: the explorable universe expands with memory density so a
 * user with few stars can't drift into an endless empty void. Returns the max
 * pan distance (in screen px) allowed in each direction before elastic snap-back.
 */
export function panBoundsForCount(count: number, viewport: number): number {
  // 0 stars -> tight; grows and saturates as the cosmos fills out.
  const t = 1 - Math.exp(-count / 8);
  const min = viewport * 0.35;
  const max = viewport * 1.6;
  return min + (max - min) * t;
}

/** Deterministic pseudo-random in [0,1) from a string seed (FNV-1a). */
function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** Half-extent of the 3D world cube the stars are distributed within. */
export const WORLD_RADIUS = 10;

/**
 * Map a memory's normalized 2D position (x,y in ~ -1..1) into a stable 3D
 * point. The depth (z) is derived deterministically from the star id so an
 * existing memory always lands at the same place in space without needing a
 * stored z coordinate. x/y are spread to the world cube and given a small
 * id-seeded jitter so stars don't sit on a perfect plane.
 */
export function star3DPosition(id: string, x: number, y: number): [number, number, number] {
  const jx = (hashSeed(`${id}-jx`) - 0.5) * 0.5;
  const jy = (hashSeed(`${id}-jy`) - 0.5) * 0.5;
  const z = (hashSeed(`${id}-z`) - 0.5) * 2; // -1..1
  return [
    (x + jx) * WORLD_RADIUS,
    (-y + jy) * WORLD_RADIUS, // invert y so +y reads as "up" in 3D
    z * WORLD_RADIUS,
  ];
}

/**
 * Convert a memory's text-driven radius (screen px units) into a world-space
 * star size for the 3D scene.
 */
export function starWorldSize(radius: number): number {
  // radius ranges ~4..26; map to a pleasant world scale.
  return 0.18 + (radius / MAX_STAR_RADIUS) * 0.55;
}

/** Local-first mock directory of taggable users (stands in for a backend search). */
export const CURRENT_USER: MemoriaUser = {
  id: 'u-me',
  name: 'You',
  handle: 'you',
  avatar: '\u2728',
};

export const DIRECTORY_USERS: MemoriaUser[] = [
  CURRENT_USER,
  { id: 'u-mom', name: 'Mom', handle: 'mom', avatar: '\uD83C\uDF37' },
  { id: 'u-dad', name: 'Dad', handle: 'dad', avatar: '\uD83C\uDFA3' },
  { id: 'u-sam', name: 'Sam', handle: 'sam', avatar: '\uD83C\uDF0A' },
  { id: 'u-noor', name: 'Noor', handle: 'noor', avatar: '\uD83C\uDF19' },
  { id: 'u-leo', name: 'Leo', handle: 'leo', avatar: '\uD83E\uDD81' },
  { id: 'u-ava', name: 'Ava', handle: 'ava', avatar: '\uD83C\uDF38' },
];

export function userById(id: string): MemoriaUser | undefined {
  return DIRECTORY_USERS.find((u) => u.id === id);
}
