/** Memoria domain types. */

export type StarColorKey =
  | 'amber'
  | 'cyan'
  | 'rose'
  | 'violet'
  | 'emerald'
  | 'gold'
  | 'ice'
  | 'crimson';

export interface StarColor {
  key: StarColorKey;
  label: string;
  /** Emotion association shown to the user. */
  emotion: string;
  /** Hex used by the Skia renderer and glow. */
  hex: string;
}

export interface MemoriaUser {
  id: string;
  name: string;
  handle: string;
  /** Single emoji used as a lightweight avatar. */
  avatar: string;
}

export interface StarLocation {
  name: string;
  /** Present when chosen from Google Places; absent for manual entries. */
  lat?: number;
  lng?: number;
  /** Google Places id when applicable. */
  placeId?: string;
}

export interface VoiceNote {
  id: string;
  uri: string;
  /** Duration in seconds. */
  durationSec: number;
}

export interface MemoryStar {
  id: string;
  title: string;
  story: string;
  colorKey: StarColorKey;
  /** ISO date string for when the memory happened. */
  date: string;
  createdAt: string;
  location?: StarLocation;
  photos: string[];
  voiceNotes: VoiceNote[];
  /** Estimated total bytes of attached media (photos + voice notes). */
  mediaBytes?: number;
  /** Ids of tagged MemoriaUsers (co-experiencers). */
  taggedUserIds: string[];
  /** Normalized position in cosmos space, range roughly -1..1. */
  x: number;
  y: number;
  /** Author of the star. */
  authorId: string;
  /** Cosmos space this star belongs to: 'personal' or a shared cosmos id. */
  cosmosId: string;
}

export interface Constellation {
  id: string;
  name: string;
  starIds: string[];
  cosmosId: string;
  /** Whether it was forged manually or accepted from an AI suggestion. */
  origin: 'manual' | 'suggested';
}

export interface SharedCosmos {
  id: string;
  name: string;
  /** Member user ids. */
  memberIds: string[];
  createdAt: string;
}

export interface ConstellationSuggestion {
  id: string;
  reason: string;
  starIds: string[];
}

export type AccountTier = 'free' | 'premium';

export interface UserProfile {
  displayName: string;
  bio: string;
  /** Star color key used to tint the avatar. */
  avatarColorKey: StarColorKey;
}

export interface Throwback {
  id: string;
  /** Headline line, e.g. "On this day in 2020". */
  headline: string;
  /** Supporting detail, e.g. "You were at Regent's Park". */
  detail: string;
  /** Anniversary = exact "X years ago today"; highlight = surfaced older memory. */
  kind: 'anniversary' | 'highlight';
  star: MemoryStar;
}
