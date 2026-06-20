import type { StarColor, StarColorKey, MemoriaUser } from '@/lib/types';

/** Emotion color palette for the star glow grid — Midnight Aurora resonance accents. */
export const STAR_COLORS: StarColor[] = [
  { key: 'cyan', label: 'Cyan', emotion: 'Calm', hex: '#45F3FF' },
  { key: 'rose', label: 'Rose', emotion: 'Love', hex: '#FF2A6D' },
  { key: 'amber', label: 'Amber', emotion: 'Nostalgia', hex: '#FFC75F' },
  { key: 'violet', label: 'Violet', emotion: 'Wonder', hex: '#7A04EB' },
  { key: 'emerald', label: 'Emerald', emotion: 'Growth', hex: '#5FE0A8' },
  { key: 'gold', label: 'Gold', emotion: 'Joy', hex: '#FFE066' },
  { key: 'ice', label: 'Ice', emotion: 'Peace', hex: '#BFD9FF' },
  { key: 'crimson', label: 'Crimson', emotion: 'Passion', hex: '#FF6B6B' },
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
