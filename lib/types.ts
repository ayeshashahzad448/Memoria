/** Memoria domain types. */

export type StarColorKey = 'amber' | 'cyan' | 'rose' | 'violet' | 'emerald';

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
  /**
   * When true the line is drawn as an open path (the last star is NOT joined
   * back to the first). Used for shape constellations like the demo "M".
   * Defaults to false, i.e. 3+ star groups close into a loop.
   */
  open?: boolean;
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

/** Who can see your cosmos and tagged memories. */
export type MemoryPrivacy = 'private' | 'friends' | 'public';

/** Visual density / text size scaling. */
export type TextSize = 'small' | 'medium' | 'large';

export interface AppSettings {
  /** Haptic feedback on gestures and selections. */
  haptics: boolean;
  /** Twinkle / pulse sounds and UI sound effects. */
  sound: boolean;
  /** Reduce continuous motion (star twinkle, animations). */
  reduceMotion: boolean;
  /** Higher contrast UI for legibility. */
  highContrast: boolean;
  /** Larger touch targets and labels. */
  textSize: TextSize;
  /** Default privacy for new memories. */
  privacy: MemoryPrivacy;
  /** Allow friends to tag you in their memories. */
  allowTagging: boolean;
}

export interface UserProfile {
  displayName: string;
  bio: string;
  /** Star color key used to tint the avatar when no photo is set. */
  avatarColorKey: StarColorKey;
  /** Optional profile photo URI. Falls back to the color avatar when absent. */
  avatarUri?: string;
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
