import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  Constellation,
  ConstellationSuggestion,
  MemoryStar,
  SharedCosmos,
  Throwback,
  AccountTier,
  AppSettings,
  UserProfile,
} from '@/lib/types';
import { CURRENT_USER, userById } from '@/lib/memoria';
import { estimateStarBytes } from '@/lib/storage';

export const PERSONAL_COSMOS = 'personal';

export const DEFAULT_SETTINGS: AppSettings = {
  haptics: true,
  sound: true,
  reduceMotion: false,
  highContrast: false,
  textSize: 'medium',
  privacy: 'private',
  allowTagging: true,
};

let counter = 0;
function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

/** Deterministic pseudo-random in [0,1) from a string seed. */
function seedNum(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export interface NewStarInput {
  title: string;
  story: string;
  colorKey: MemoryStar['colorKey'];
  date: string;
  location?: MemoryStar['location'];
  photos: string[];
  voiceNotes: MemoryStar['voiceNotes'];
  taggedUserIds: string[];
  cosmosId: string;
}

interface MemoriaState {
  hasOnboarded: boolean;
  /** Whether the in-cosmos coachmark tutorial has been shown. */
  hasSeenTutorial: boolean;
  isAuthed: boolean;
  /** Account tier; gates cloud storage. */
  tier: AccountTier;
  /** Active cosmos: 'personal' or a shared cosmos id. */
  activeCosmosId: string;
  /** Transient: a star the cosmos should pan to and focus (e.g. from search). Not persisted. */
  focusStarId: string | null;
  /** Editable user profile. */
  profile: UserProfile;
  /** Accessibility / app preferences. */
  settings: AppSettings;

  stars: MemoryStar[];
  constellations: Constellation[];
  sharedCosmoses: SharedCosmos[];

  signIn: () => void;
  signOut: () => void;
  completeOnboarding: () => void;
  completeTutorial: () => void;
  setActiveCosmos: (id: string) => void;
  setTier: (tier: AccountTier) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  /** Request the cosmos to pan to and focus a star. Pass null to clear. */
  focusStar: (id: string | null) => void;

  addStar: (input: NewStarInput) => MemoryStar;
  updateStar: (id: string, patch: Partial<MemoryStar>) => void;
  removeStar: (id: string) => void;

  createConstellation: (
    name: string,
    starIds: string[],
    origin: Constellation['origin'],
  ) => Constellation | undefined;
  /** Add one or more stars to an existing constellation. */
  addStarsToConstellation: (id: string, starIds: string[]) => void;
  removeConstellation: (id: string) => void;

  createSharedCosmos: (name: string, memberIds: string[]) => SharedCosmos;
  joinSharedCosmos: (id: string) => void;

  /** Derived helpers (computed on call, not stored). */
  starsForActiveCosmos: () => MemoryStar[];
  constellationsForActiveCosmos: () => Constellation[];
  constellationsForStar: (starId: string) => Constellation[];
  suggestConstellations: () => ConstellationSuggestion[];
  suggestThrowbacks: () => Throwback[];
}

/** Scatter a new star into open cosmos space, biased away from the center. */
function placeStar(existing: MemoryStar[], cosmosId: string): { x: number; y: number } {
  const inCosmos = existing.filter((s) => s.cosmosId === cosmosId);
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 0.18 + Math.random() * 0.78;
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist;
    const tooClose = inCosmos.some((s) => Math.hypot(s.x - x, s.y - y) < 0.12);
    if (!tooClose) return { x, y };
  }
  return { x: (Math.random() - 0.5) * 1.6, y: (Math.random() - 0.5) * 1.6 };
}

export const useMemoria = create<MemoriaState>()(
  persist(
    (set, get) => ({
      hasOnboarded: false,
      hasSeenTutorial: false,
      isAuthed: false,
      tier: 'free',
      activeCosmosId: PERSONAL_COSMOS,
      focusStarId: null,
      profile: {
        displayName: CURRENT_USER.name,
        bio: '',
        avatarColorKey: 'cyan',
      },
      settings: DEFAULT_SETTINGS,
      stars: [],
      constellations: [],
      sharedCosmoses: [],

      signIn: () => set({ isAuthed: true }),
      signOut: () => set({ isAuthed: false, hasOnboarded: false, activeCosmosId: PERSONAL_COSMOS }),
      completeOnboarding: () => set({ hasOnboarded: true }),
      completeTutorial: () => set({ hasSeenTutorial: true }),
      setActiveCosmos: (id) => set({ activeCosmosId: id }),
      setTier: (tier) => set({ tier }),
      updateProfile: (patch) => set((state) => ({ profile: { ...state.profile, ...patch } })),
      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
      focusStar: (id) => set({ focusStarId: id }),

      addStar: (input) => {
        const { x, y } = placeStar(get().stars, input.cosmosId);
        const now = new Date().toISOString();
        const star: MemoryStar = {
          id: uid('star'),
          title: input.title.trim() || 'Untitled memory',
          story: input.story,
          colorKey: input.colorKey,
          date: input.date,
          createdAt: now,
          location: input.location,
          photos: input.photos,
          voiceNotes: input.voiceNotes,
          mediaBytes: estimateStarBytes(input.photos, input.voiceNotes),
          taggedUserIds: input.taggedUserIds,
          x,
          y,
          authorId: CURRENT_USER.id,
          cosmosId: input.cosmosId,
        };
        set((state) => ({ stars: [...state.stars, star] }));
        return star;
      },

      updateStar: (id, patch) =>
        set((state) => ({
          stars: state.stars.map((s) => {
            if (s.id !== id) return s;
            const next = { ...s, ...patch };
            // Keep media size estimate in sync when attachments change.
            if (patch.photos !== undefined || patch.voiceNotes !== undefined) {
              next.mediaBytes = estimateStarBytes(next.photos, next.voiceNotes);
            }
            return next;
          }),
        })),

      removeStar: (id) =>
        set((state) => ({
          stars: state.stars.filter((s) => s.id !== id),
          constellations: state.constellations
            .map((c) => ({ ...c, starIds: c.starIds.filter((sid) => sid !== id) }))
            .filter((c) => c.starIds.length >= 2),
        })),

      createConstellation: (name, starIds, origin) => {
        if (starIds.length < 2) return undefined;
        const cosmosId = get().activeCosmosId;
        const constellation: Constellation = {
          id: uid('const'),
          name: name.trim() || 'Constellation',
          starIds,
          cosmosId,
          origin,
        };
        set((state) => ({
          constellations: [...state.constellations, constellation],
        }));
        return constellation;
      },

      removeConstellation: (id) =>
        set((state) => ({
          constellations: state.constellations.filter((c) => c.id !== id),
        })),

      addStarsToConstellation: (id, starIds) =>
        set((state) => ({
          constellations: state.constellations.map((c) =>
            c.id === id ? { ...c, starIds: Array.from(new Set([...c.starIds, ...starIds])) } : c,
          ),
        })),

      createSharedCosmos: (name, memberIds) => {
        const cosmos: SharedCosmos = {
          id: uid('cosmos'),
          name: name.trim() || 'Family Cosmos',
          memberIds: Array.from(new Set([CURRENT_USER.id, ...memberIds])),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ sharedCosmoses: [...state.sharedCosmoses, cosmos] }));
        return cosmos;
      },

      joinSharedCosmos: (id) =>
        set((state) => ({
          sharedCosmoses: state.sharedCosmoses.map((c) =>
            c.id === id
              ? { ...c, memberIds: Array.from(new Set([...c.memberIds, CURRENT_USER.id])) }
              : c,
          ),
        })),

      starsForActiveCosmos: () => {
        const { stars, activeCosmosId } = get();
        return stars.filter((s) => s.cosmosId === activeCosmosId);
      },

      constellationsForActiveCosmos: () => {
        const { constellations, activeCosmosId } = get();
        return constellations.filter((c) => c.cosmosId === activeCosmosId);
      },

      constellationsForStar: (starId) => {
        const { constellations, activeCosmosId } = get();
        return constellations.filter(
          (c) => c.cosmosId === activeCosmosId && c.starIds.includes(starId),
        );
      },

      suggestConstellations: () => {
        const stars = get().starsForActiveCosmos();
        const existing = get().constellationsForActiveCosmos();
        const grouped = new Map<string, MemoryStar[]>();

        const keyAlreadyForged = (ids: string[]) =>
          existing.some(
            (c) => c.starIds.length === ids.length && ids.every((id) => c.starIds.includes(id)),
          );

        // Cluster by location name.
        for (const s of stars) {
          if (s.location?.name) {
            const k = `loc:${s.location.name.toLowerCase()}`;
            grouped.set(k, [...(grouped.get(k) ?? []), s]);
          }
        }
        // Cluster by shared tagged user.
        for (const s of stars) {
          for (const t of s.taggedUserIds) {
            const k = `tag:${t}`;
            grouped.set(k, [...(grouped.get(k) ?? []), s]);
          }
        }
        // Cluster by month.
        for (const s of stars) {
          const k = `month:${s.date.slice(0, 7)}`;
          grouped.set(k, [...(grouped.get(k) ?? []), s]);
        }

        const suggestions: ConstellationSuggestion[] = [];
        const seen = new Set<string>();
        for (const [key, list] of grouped) {
          if (list.length < 2) continue;
          const ids = list.map((s) => s.id).sort();
          const signature = ids.join('|');
          if (seen.has(signature) || keyAlreadyForged(ids)) continue;
          seen.add(signature);

          let reason = '';
          if (key.startsWith('loc:')) reason = `Memories near ${list[0].location?.name}`;
          else if (key.startsWith('tag:')) {
            const u = userById(key.slice(4));
            reason = `Moments shared with ${u?.name ?? 'someone'}`;
          } else reason = 'Memories from the same month';

          suggestions.push({ id: uid('sg'), reason, starIds: ids });
          if (suggestions.length >= 5) break;
        }
        return suggestions;
      },

      suggestThrowbacks: () => {
        const stars = get().starsForActiveCosmos();
        const now = new Date();
        const todayMonth = now.getMonth();
        const todayDay = now.getDate();
        const thisYear = now.getFullYear();

        const olderStars = stars.filter((s) => {
          const d = new Date(s.date);
          return !Number.isNaN(d.getTime()) && thisYear - d.getFullYear() >= 1;
        });

        const anniversaries: Throwback[] = [];
        const usedIds = new Set<string>();
        for (const s of olderStars) {
          const d = new Date(s.date);
          const sameMonth = d.getMonth() === todayMonth;
          const dayDelta = Math.abs(d.getDate() - todayDay);
          if (!sameMonth || dayDelta > 2) continue;
          const yearsAgo = thisYear - d.getFullYear();
          const where = s.location?.name ? ` at ${s.location.name}` : '';
          anniversaries.push({
            id: `tb-anniv-${s.id}`,
            headline: yearsAgo === 1 ? 'One year ago today' : `${yearsAgo} years ago today`,
            detail: `${s.title}${where}`,
            kind: 'anniversary',
            star: s,
          });
          usedIds.add(s.id);
        }

        // Weighted shuffle of remaining older memories as random highlights.
        // Older memories are weighted slightly higher so deeper history resurfaces.
        const pool = olderStars.filter((s) => !usedIds.has(s.id));
        const weighted = pool
          .map((s) => {
            const yearsAgo = thisYear - new Date(s.date).getFullYear();
            const richness = s.photos.length + s.voiceNotes.length + s.story.length / 200;
            const weight = (1 + yearsAgo * 0.5 + richness) * (0.5 + seedNum(s.id));
            return { s, weight };
          })
          .sort((a, b) => b.weight - a.weight);

        const highlights: Throwback[] = weighted.slice(0, 5).map(({ s }) => {
          const d = new Date(s.date);
          const where = s.location?.name ? ` at ${s.location.name}` : '';
          return {
            id: `tb-hl-${s.id}`,
            headline: `Highlight from ${d.getFullYear()}`,
            detail: `${s.title}${where}`,
            kind: 'highlight',
            star: s,
          };
        });

        // Blend: anniversaries lead, then weave in highlights up to a cap.
        const blended: Throwback[] = [...anniversaries];
        const cap = 8;
        for (const h of highlights) {
          if (blended.length >= cap) break;
          blended.push(h);
        }
        return blended;
      },
    }),
    {
      name: 'memoria-store-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasOnboarded: state.hasOnboarded,
        hasSeenTutorial: state.hasSeenTutorial,
        isAuthed: state.isAuthed,
        tier: state.tier,
        activeCosmosId: state.activeCosmosId,
        profile: state.profile,
        settings: state.settings,
        stars: state.stars,
        constellations: state.constellations,
        sharedCosmoses: state.sharedCosmoses,
      }),
    },
  ),
);
