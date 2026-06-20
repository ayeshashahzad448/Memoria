import type { MemoryStar, VoiceNote } from '@/lib/types';

/** Free accounts are capped at 5 GB of media. */
export const FREE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024;
/** Warn the user once they cross 80% of the free limit. */
export const WARN_RATIO = 0.8;

/**
 * Estimate the byte size of one photo. We can't always read the real file size
 * synchronously, so we use a realistic average for a compressed phone photo.
 */
const AVG_PHOTO_BYTES = 2.6 * 1024 * 1024;
/** Voice notes encode at roughly this bitrate (~96 kbps AAC). */
const VOICE_BYTES_PER_SEC = 12 * 1024;

export function estimatePhotoBytes(count: number): number {
  return Math.round(count * AVG_PHOTO_BYTES);
}

export function estimateVoiceBytes(notes: VoiceNote[]): number {
  return Math.round(notes.reduce((sum, n) => sum + n.durationSec * VOICE_BYTES_PER_SEC, 0));
}

/** Total estimated media bytes for a single star. */
export function estimateStarBytes(photos: string[], voiceNotes: VoiceNote[]): number {
  return estimatePhotoBytes(photos.length) + estimateVoiceBytes(voiceNotes);
}

/** Sum stored media bytes across a list of stars. */
export function totalMediaBytes(stars: MemoryStar[]): number {
  return stars.reduce(
    (sum, s) => sum + (s.mediaBytes ?? estimateStarBytes(s.photos, s.voiceNotes)),
    0,
  );
}

/** Human-readable size, e.g. "3.4 GB" or "812 MB". */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${Math.round(mb)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
