import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

/**
 * Picked photos and recorded voice notes arrive as temporary cache URIs that the OS
 * can purge at any time. Everything the user keeps is copied into the app's document
 * directory under media/<kind>/ so memories survive restarts and can be synced.
 */
export type MediaKind = 'photos' | 'audio' | 'avatars';

export const MEDIA_KINDS: MediaKind[] = ['photos', 'audio', 'avatars'];

const FALLBACK_EXT: Record<MediaKind, string> = { photos: 'jpg', audio: 'm4a', avatars: 'jpg' };

/** Matches a managed media file regardless of which app container it was saved under. */
const MANAGED_RE = /\/media\/(photos|audio|avatars)\/([^/?#]+)$/;

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  webp: 'image/webp',
  gif: 'image/gif',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  caf: 'audio/x-caf',
  aac: 'audio/aac',
  wav: 'audio/wav',
  webm: 'audio/webm',
};

const isNative = Platform.OS !== 'web';

function documentRoot(): string {
  const uri = Paths.document.uri;
  return uri.endsWith('/') ? uri : `${uri}/`;
}

/** "media/photos/abc.jpg" for a managed URI, otherwise null (remote URLs, blobs, cache files). */
export function toRelativeMediaPath(uri: string): string | null {
  const match = MANAGED_RE.exec(uri);
  return match ? `media/${match[1]}/${match[2]}` : null;
}

/** Absolute file URI for a relative media path in the current app container. */
export function resolveMediaPath(relativePath: string): string {
  return `${documentRoot()}${relativePath}`;
}

/**
 * iOS can change the app container path between installs and updates, which would
 * orphan every stored absolute URI. Re-point managed URIs at the current container.
 */
export function rebaseMediaUri(uri: string): string {
  if (!isNative) return uri;
  const rel = toRelativeMediaPath(uri);
  return rel ? resolveMediaPath(rel) : uri;
}

export function mimeTypeFor(path: string): string {
  const ext = /\.([a-z0-9]+)$/i.exec(path)?.[1]?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

export function ensureMediaDirs(): void {
  if (!isNative) return;
  for (const kind of MEDIA_KINDS) {
    new Directory(Paths.document, 'media', kind).create({ intermediates: true, idempotent: true });
  }
}

export function mediaFileExists(uri: string): boolean {
  if (!isNative) return true;
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

/**
 * Copy a picked or recorded file into permanent storage and return its new URI.
 * Falls back to the original URI when copying is not possible (web, remote URLs,
 * or a copy failure) so saving a memory never fails because of media handling.
 */
export async function persistMedia(uri: string, kind: MediaKind): Promise<string> {
  if (!isNative) return uri;
  if (!/^(file|content):/i.test(uri)) return uri;
  if (toRelativeMediaPath(uri)) return rebaseMediaUri(uri);
  try {
    ensureMediaDirs();
    const ext =
      /\.([a-z0-9]{2,5})(?:[?#].*)?$/i.exec(uri)?.[1]?.toLowerCase() ?? FALLBACK_EXT[kind];
    const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const dest = new File(Paths.document, 'media', kind, name);
    new File(uri).copy(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}

export function persistAll(uris: string[], kind: MediaKind): Promise<string[]> {
  return Promise.all(uris.map((uri) => persistMedia(uri, kind)));
}
