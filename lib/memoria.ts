import type { StarColor, StarColorKey, MemoriaUser, MemoryStar } from '@/lib/types';

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

/* ------------------------------ Stellar stats ----------------------------- */

export interface StarStats {
  /** Total "mass" score the stats are derived from (story + media + tags). */
  weight: number;
  /** Surface temperature in Kelvin. */
  temperatureK: number;
  /** Mass in solar masses (M☉). */
  massSolar: number;
  /** Luminosity in solar luminosities (L☉). */
  luminositySolar: number;
  /** Harvard spectral class letter (O,B,A,F,G,K,M). */
  spectralClass: string;
  /** Human-readable class name, e.g. "G-type main sequence". */
  spectralName: string;
}

/** Inputs the weight is computed from. Accepts a saved star or a draft. */
interface StatsInput {
  story?: string;
  title?: string;
  photos?: string[];
  voiceNotes?: { durationSec: number }[];
  taggedUserIds?: string[];
}

const SPECTRAL_BANDS: { letter: string; name: string; minTemp: number }[] = [
  { letter: 'M', name: 'M-type red dwarf', minTemp: 2400 },
  { letter: 'K', name: 'K-type orange dwarf', minTemp: 3700 },
  { letter: 'G', name: 'G-type (Sun-like)', minTemp: 5200 },
  { letter: 'F', name: 'F-type white star', minTemp: 6000 },
  { letter: 'A', name: 'A-type blue-white', minTemp: 7500 },
  { letter: 'B', name: 'B-type blue giant', minTemp: 10000 },
  { letter: 'O', name: 'O-type hypergiant', minTemp: 30000 },
];

/**
 * Derive playful-but-plausible stellar stats from how much the user poured into
 * a memory. The "weight" combines characters written, photos, voice seconds and
 * tagged people; heavier memories burn hotter, more massive, and brighter.
 */
export function starStats(input: StatsInput): StarStats {
  const text = (input.story && input.story.length > 0 ? input.story : input.title) ?? '';
  const chars = text.trim().length;
  const photos = input.photos?.length ?? 0;
  const voiceSec = (input.voiceNotes ?? []).reduce((sum, n) => sum + (n.durationSec || 0), 0);
  const tags = input.taggedUserIds?.length ?? 0;

  // Weight is a unitless score; chars dominate, media + people add heft.
  const weight = chars + photos * 90 + voiceSec * 6 + tags * 40;

  // Saturating curve 0..1 — even an epic memory stays in a believable range.
  const t = 1 - Math.exp(-weight / 520);

  const temperatureK = Math.round(2600 + t * (32000 - 2600));
  const massSolar = Math.round((0.18 + t * (24 - 0.18)) * 100) / 100;
  // Luminosity ~ mass^3.5 (mass-luminosity relation), kept in a readable band.
  const luminositySolar = Math.round(Math.pow(massSolar, 3.5) * 10) / 10;

  let band = SPECTRAL_BANDS[0];
  for (const b of SPECTRAL_BANDS) {
    if (temperatureK >= b.minTemp) band = b;
  }

  return {
    weight,
    temperatureK,
    massSolar,
    luminositySolar,
    spectralClass: band.letter,
    spectralName: band.name,
  };
}

/** Convenience overload reading directly from a saved star. */
export function starStatsForStar(star: MemoryStar): StarStats {
  return starStats({
    story: star.story,
    title: star.title,
    photos: star.photos,
    voiceNotes: star.voiceNotes,
    taggedUserIds: star.taggedUserIds,
  });
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
  // People the user can discover and add as friends.
  { id: 'u-kai', name: 'Kai', handle: 'kai', avatar: '\uD83C\uDF0B' },
  { id: 'u-mira', name: 'Mira', handle: 'mira', avatar: '\uD83C\uDF3F' },
  { id: 'u-jude', name: 'Jude', handle: 'jude', avatar: '\uD83C\uDFB8' },
  { id: 'u-ren', name: 'Ren', handle: 'ren', avatar: '\uD83C\uDF41' },
  { id: 'u-tessa', name: 'Tessa', handle: 'tessa', avatar: '\uD83C\uDF1E' },
  { id: 'u-omar', name: 'Omar', handle: 'omar', avatar: '\uD83C\uDFD4\uFE0F' },
  { id: 'u-wren', name: 'Wren', handle: 'wren', avatar: '\uD83D\uDD4A\uFE0F' },
  { id: 'u-iris', name: 'Iris', handle: 'iris', avatar: '\uD83C\uDF08' },
];

/** Ids of users the user starts out connected to (close circle). */
export const INITIAL_FRIEND_IDS = ['u-mom', 'u-dad', 'u-sam', 'u-noor', 'u-leo', 'u-ava'];

export function userById(id: string): MemoriaUser | undefined {
  return DIRECTORY_USERS.find((u) => u.id === id);
}
