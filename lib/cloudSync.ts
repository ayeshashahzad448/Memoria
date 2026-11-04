import { AppState, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

import { useMemoria, type CloudData } from '@/lib/store';
import type { MemoryStar, SyncProvider } from '@/lib/types';
import {
  ensureMediaDirs,
  mediaFileExists,
  mimeTypeFor,
  rebaseMediaUri,
  resolveMediaPath,
  toRelativeMediaPath,
} from '@/lib/media';

/**
 * Mirrors the user's memories to their own cloud drive: iCloud on Apple devices,
 * Google Drive on Android. Text data is one JSON snapshot; photos and voice notes are
 * individual files named after their local media path.
 *
 * Conflict policy: whole-snapshot last-writer-wins, except when both sides changed
 * since they last met (e.g. two phones edited offline). Then memories are unioned
 * by id so nothing is lost; deletions made during such a conflict can reappear.
 */

const ROOT = '/memoria';
const SNAPSHOT_PATH = `${ROOT}/snapshot.json`;
const MEDIA_ROOT = `${ROOT}/media`;
const MEDIA_FOLDERS = ['photos', 'audio', 'avatars'] as const;
const SNAPSHOT_VERSION = 1;
const AUTO_SYNC_DELAY_MS = 4000;

interface Snapshot {
  version: number;
  updatedAt: string;
  /** Media references are stored as relative paths ("media/photos/x.jpg"). */
  data: CloudData;
}

export interface SyncResult {
  ok: boolean;
  action: 'noop' | 'push' | 'pull' | 'merge';
  uploaded: number;
  downloaded: number;
  /** Media files that could not be transferred this round (retried next sync). */
  pendingMedia: number;
  error?: string;
}

export interface SyncAvailability {
  provider: SyncProvider | null;
  available: boolean;
  /** Why sync can't run, in words suitable for the UI. */
  reason?: string;
}

type DriveTokenProvider = () => string | null | Promise<string | null>;

let driveTokenProvider: DriveTokenProvider | null = null;

/**
 * Android sync uses Google Drive's hidden app-data folder and needs an OAuth access
 * token with the drive.appdata scope (e.g. from @react-native-google-signin). Register
 * the token source once at startup; until then Android reports sync as unavailable.
 */
export function setGoogleDriveTokenProvider(provider: DriveTokenProvider | null): void {
  driveTokenProvider = provider;
}

/**
 * Demo mode: pretend to connect to iCloud so the flow can be shown without an Apple
 * Developer account or a native build. It is on in development (dev server, Expo Go,
 * web preview) and can be forced with EXPO_PUBLIC_SIMULATE_CLOUD=true. Release builds
 * never simulate, and a development build with the real iCloud module uses the real one.
 */
export function isCloudSimulated(): boolean {
  if (process.env.EXPO_PUBLIC_SIMULATE_CLOUD === 'true') return true;
  if (!__DEV__) return false;
  return (
    Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** How long the pretend "Connecting to iCloud" step takes. */
export const SIMULATED_CONNECT_MS = 1400;

export function syncProviderForPlatform(): SyncProvider | null {
  if (isCloudSimulated()) return 'icloud';
  if (Platform.OS === 'ios') return 'icloud';
  if (Platform.OS === 'android') return 'googledrive';
  return null;
}

export function providerLabel(provider: SyncProvider | null): string {
  if (provider === 'icloud') return 'iCloud';
  if (provider === 'googledrive') return 'Google Drive';
  return 'Cloud';
}

type CloudModule = typeof import('react-native-cloud-storage');
/** The library exposes its API as static methods on this class. */
type CloudStorageApi = CloudModule['CloudStorage'];

let cloudModule: CloudModule | null | undefined;

/** The native module is missing in Expo Go and on web, so load it lazily and tolerate absence. */
function loadCloudModule(): CloudModule | null {
  if (cloudModule !== undefined) return cloudModule;
  try {
    cloudModule = require('react-native-cloud-storage') as CloudModule;
  } catch {
    cloudModule = null;
  }
  return cloudModule;
}

function getCloud(provider: SyncProvider): CloudStorageApi | null {
  const mod = loadCloudModule();
  if (!mod) return null;
  const { CloudStorage, CloudStorageProvider, CloudStorageScope } = mod;
  CloudStorage.setProvider(
    provider === 'icloud' ? CloudStorageProvider.ICloud : CloudStorageProvider.GoogleDrive,
  );
  if (provider === 'googledrive') {
    CloudStorage.setProviderOptions({
      scope: CloudStorageScope.AppData,
      accessToken: driveTokenProvider ?? null,
    });
  } else {
    CloudStorage.setProviderOptions({ scope: CloudStorageScope.AppData });
  }
  return CloudStorage;
}

export async function checkSyncAvailability(): Promise<SyncAvailability> {
  if (isCloudSimulated()) return { provider: 'icloud', available: true };
  const provider = syncProviderForPlatform();
  if (!provider) {
    return {
      provider,
      available: false,
      reason: 'Cloud sync is available in the iOS and Android apps.',
    };
  }
  if (provider === 'googledrive' && !driveTokenProvider) {
    return {
      provider,
      available: false,
      reason: 'Google Drive sign-in isn’t set up in this build.',
    };
  }
  const cloud = getCloud(provider);
  if (!cloud) {
    return {
      provider,
      available: false,
      reason: 'Needs a development build; cloud sync doesn’t run in Expo Go.',
    };
  }
  try {
    if (await cloud.isCloudAvailable()) return { provider, available: true };
  } catch {
    // fall through to the generic message
  }
  return {
    provider,
    available: false,
    reason:
      provider === 'icloud'
        ? 'Sign in to iCloud and turn on iCloud Drive in the Settings app.'
        : 'Sign in to Google Drive to sync.',
  };
}

// --- snapshot helpers -------------------------------------------------------

function mapMedia(data: CloudData, fn: (uri: string) => string): CloudData {
  return {
    ...data,
    stars: data.stars.map((s) => ({
      ...s,
      photos: s.photos.map(fn),
      voiceNotes: s.voiceNotes.map((n) => ({ ...n, uri: fn(n.uri) })),
    })),
    profile: data.profile.avatarUri
      ? { ...data.profile, avatarUri: fn(data.profile.avatarUri) }
      : data.profile,
  };
}

const toRelative = (uri: string) => toRelativeMediaPath(uri) ?? uri;
const toLocal = (uri: string) => {
  if (/^media\/(photos|audio|avatars)\//.test(uri)) return resolveMediaPath(uri);
  return rebaseMediaUri(uri);
};

function currentData(): CloudData {
  const { stars, constellations, sharedCosmoses, profile, friendIds } = useMemoria.getState();
  return { stars, constellations, sharedCosmoses, profile, friendIds };
}

/** Every managed media file (as a relative path) that the given data points at. */
function referencedMedia(data: CloudData): string[] {
  const out = new Set<string>();
  const add = (uri: string | undefined) => {
    const rel = uri ? toRelativeMediaPath(uri) : null;
    if (rel) out.add(rel);
  };
  for (const s of data.stars) {
    s.photos.forEach(add);
    s.voiceNotes.forEach((n) => add(n.uri));
  }
  add(data.profile.avatarUri);
  return [...out];
}

function unionById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of local) byId.set(item.id, item);
  for (const item of remote) byId.set(item.id, item);
  return [...byId.values()];
}

function mergeData(local: CloudData, remote: CloudData, preferRemoteProfile: boolean): CloudData {
  const stars: MemoryStar[] = unionById(local.stars, remote.stars);
  const starIds = new Set(stars.map((s) => s.id));
  return {
    stars,
    constellations: unionById(local.constellations, remote.constellations)
      .map((c) => ({ ...c, starIds: c.starIds.filter((id) => starIds.has(id)) }))
      .filter((c) => c.starIds.length >= 2),
    sharedCosmoses: unionById(local.sharedCosmoses, remote.sharedCosmoses),
    profile: preferRemoteProfile ? remote.profile : local.profile,
    friendIds: [...new Set([...local.friendIds, ...remote.friendIds])],
  };
}

async function ensureRemoteDirs(cloud: CloudStorageApi): Promise<void> {
  for (const dir of [ROOT, MEDIA_ROOT, ...MEDIA_FOLDERS.map((f) => `${MEDIA_ROOT}/${f}`)]) {
    if (!(await cloud.exists(dir))) await cloud.mkdir(dir);
  }
}

async function readRemoteSnapshot(cloud: CloudStorageApi): Promise<Snapshot | null> {
  if (!(await cloud.exists(SNAPSHOT_PATH))) return null;
  try {
    // iCloud can list a file before its bytes have arrived; ask for it first.
    await cloud.triggerSync(SNAPSHOT_PATH);
  } catch {
    // Non-fatal: the read below reports the real problem.
  }
  const parsed = JSON.parse(await cloud.readFile(SNAPSHOT_PATH)) as Snapshot;
  if (typeof parsed.version !== 'number' || parsed.version > SNAPSHOT_VERSION) {
    throw new Error(
      'The cloud copy was made by a newer version of Memoria. Update the app to sync.',
    );
  }
  return parsed;
}

async function writeRemoteSnapshot(cloud: CloudStorageApi, updatedAt: string): Promise<void> {
  const snapshot: Snapshot = {
    version: SNAPSHOT_VERSION,
    updatedAt,
    data: mapMedia(currentData(), toRelative),
  };
  await cloud.writeFile(SNAPSHOT_PATH, JSON.stringify(snapshot));
}

/**
 * Make the media files on this device and in the cloud match what the memories
 * reference: upload what's only here, download what's only there.
 */
async function reconcileMedia(
  cloud: CloudStorageApi,
  data: CloudData,
): Promise<{ uploaded: number; downloaded: number; pending: number }> {
  ensureMediaDirs();
  const remoteFiles = new Set<string>();
  for (const folder of MEDIA_FOLDERS) {
    for (const name of await cloud.readdir(`${MEDIA_ROOT}/${folder}`)) {
      remoteFiles.add(`media/${folder}/${name}`);
    }
  }

  let uploaded = 0;
  let downloaded = 0;
  let pending = 0;
  for (const rel of referencedMedia(data)) {
    const localUri = resolveMediaPath(rel);
    const remotePath = `${ROOT}/${rel}`;
    const hasLocal = mediaFileExists(localUri);
    const hasRemote = remoteFiles.has(rel);
    try {
      if (hasLocal && !hasRemote) {
        await cloud.uploadFile(remotePath, localUri, { mimeType: mimeTypeFor(rel) });
        uploaded += 1;
      } else if (!hasLocal && hasRemote) {
        await cloud.triggerSync(remotePath).catch(() => undefined);
        await cloud.downloadFile(remotePath, localUri);
        downloaded += 1;
      } else if (!hasLocal && !hasRemote) {
        pending += 1;
      }
    } catch {
      pending += 1;
    }
  }
  return { uploaded, downloaded, pending };
}

// --- sync -------------------------------------------------------------------

let running: Promise<SyncResult> | null = null;

/** Run one sync pass. Calls made while a pass is running share its result. */
export function syncNow(): Promise<SyncResult> {
  running ??= runSync().finally(() => {
    running = null;
  });
  return running;
}

async function runSimulatedSync(): Promise<SyncResult> {
  const store = useMemoria.getState;
  await delay(1500);
  const { dataUpdatedAt, stars } = store();
  const media = stars.reduce((n, s) => n + s.photos.length + s.voiceNotes.length, 0);
  store().setSync({
    lastSyncedAt: new Date().toISOString(),
    syncedLocalAt: dataUpdatedAt,
    syncedRemoteAt: dataUpdatedAt,
    lastError: undefined,
  });
  return { ok: true, action: 'push', uploaded: media, downloaded: 0, pendingMedia: 0 };
}

async function runSync(): Promise<SyncResult> {
  if (isCloudSimulated()) return runSimulatedSync();
  const store = useMemoria.getState;
  const availability = await checkSyncAvailability();
  const failure = (error: string): SyncResult => {
    store().setSync({ lastError: error });
    return { ok: false, action: 'noop', uploaded: 0, downloaded: 0, pendingMedia: 0, error };
  };
  if (!availability.provider || !availability.available) {
    return failure(availability.reason ?? 'Cloud sync isn’t available.');
  }
  const cloud = getCloud(availability.provider);
  if (!cloud) return failure('Cloud sync isn’t available.');

  try {
    await ensureRemoteDirs(cloud);
    const remote = await readRemoteSnapshot(cloud);

    const startState = store();
    const localStamp = startState.dataUpdatedAt;
    const localChanged =
      Date.parse(localStamp) > Date.parse(startState.sync.syncedLocalAt ?? '1970-01-01');
    const remoteChanged = !!remote && remote.updatedAt !== startState.sync.syncedRemoteAt;

    let action: SyncResult['action'] = 'noop';
    let pushStamp: string | null = null;

    if (!remote) {
      if (localChanged || startState.stars.length > 0) {
        action = 'push';
        pushStamp = localStamp;
      }
    } else if (remoteChanged && !localChanged) {
      action = 'pull';
    } else if (localChanged && !remoteChanged) {
      action = 'push';
      pushStamp = localStamp;
    } else if (localChanged && remoteChanged) {
      action = 'merge';
    }

    if (remote && (action === 'pull' || action === 'merge')) {
      const remoteData = mapMedia(remote.data, toLocal);
      const next =
        action === 'pull'
          ? remoteData
          : mergeData(
              currentData(),
              remoteData,
              Date.parse(remote.updatedAt) > Date.parse(localStamp),
            );
      const stamp = action === 'pull' ? remote.updatedAt : new Date().toISOString();

      // Fetch media before swapping data in so images are already there when screens render.
      const media = await reconcileMedia(cloud, next);

      // Bail out if the user edited while we were downloading; the next pass will merge.
      if (store().dataUpdatedAt !== localStamp) {
        return {
          ok: true,
          action: 'noop',
          uploaded: 0,
          downloaded: media.downloaded,
          pendingMedia: media.pending,
        };
      }
      store().applyCloudData(next, stamp, {});
      if (action === 'merge') {
        pushStamp = stamp;
      } else {
        store().setSync({ syncedLocalAt: stamp, syncedRemoteAt: remote.updatedAt });
      }
      const result = await finish(cloud, action, pushStamp, media);
      return result;
    }

    const media = await reconcileMedia(cloud, currentData());
    return await finish(cloud, action, pushStamp, media);
  } catch (e) {
    return failure(e instanceof Error ? e.message : 'Sync failed. Try again.');
  }
}

async function finish(
  cloud: CloudStorageApi,
  action: SyncResult['action'],
  pushStamp: string | null,
  media: { uploaded: number; downloaded: number; pending: number },
): Promise<SyncResult> {
  const store = useMemoria.getState;
  let uploaded = media.uploaded;
  let downloaded = media.downloaded;
  let pending = media.pending;

  if (pushStamp) {
    // Merged or edited data may reference files that only exist here; upload them first.
    const extra = await reconcileMedia(cloud, currentData());
    uploaded += extra.uploaded;
    downloaded += extra.downloaded;
    pending = extra.pending;
    await writeRemoteSnapshot(cloud, pushStamp);
    store().setSync({ syncedLocalAt: pushStamp, syncedRemoteAt: pushStamp });
  }

  store().setSync({
    lastSyncedAt: new Date().toISOString(),
    lastError:
      pending > 0
        ? `${pending} photo or audio file${pending === 1 ? '' : 's'} still syncing`
        : undefined,
  });
  return { ok: true, action, uploaded, downloaded, pendingMedia: pending };
}

// --- automatic sync ---------------------------------------------------------

/**
 * Sync shortly after edits and whenever the app returns to the foreground.
 * Returns a cleanup function. Safe to call when sync is switched off.
 */
export function startAutoSync(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const syncIfEnabled = () => {
    if (useMemoria.getState().sync.enabled) void syncNow();
  };

  const unsubscribe = useMemoria.subscribe((state, prev) => {
    if (!state.sync.enabled) return;
    const justEnabled = !prev.sync.enabled;
    if (!justEnabled && state.dataUpdatedAt === prev.dataUpdatedAt) return;
    clearTimeout(timer);
    timer = setTimeout(syncIfEnabled, justEnabled ? 0 : AUTO_SYNC_DELAY_MS);
  });
  const appState = AppState.addEventListener('change', (next) => {
    if (next === 'active') syncIfEnabled();
  });

  // Initial pass once saved state has loaded.
  const startup = () => syncIfEnabled();
  if (useMemoria.persist.hasHydrated()) startup();
  const offHydrate = useMemoria.persist.onFinishHydration(startup);

  return () => {
    clearTimeout(timer);
    unsubscribe();
    appState.remove();
    offHydrate();
  };
}
