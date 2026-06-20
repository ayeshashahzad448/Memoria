import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Constellation, ConstellationSuggestion, MemoryStar, SharedCosmos } from '@/lib/types';
import { CURRENT_USER, userById } from '@/lib/memoria';

export const PERSONAL_COSMOS = 'personal';

let counter = 0;
function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
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
  isAuthed: boolean;
  /** Active cosmos: 'personal' or a shared cosmos id. */
  activeCosmosId: string;

  stars: MemoryStar[];
  constellations: Constellation[];
  sharedCosmoses: SharedCosmos[];

  signIn: () => void;
  signOut: () => void;
  completeOnboarding: () => void;
  setActiveCosmos: (id: string) => void;

  addStar: (input: NewStarInput) => MemoryStar;
  updateStar: (id: string, patch: Partial<MemoryStar>) => void;
  removeStar: (id: string) => void;

  createConstellation: (name: string, starIds: string[], origin: Constellation['origin']) => void;
  removeConstellation: (id: string) => void;

  createSharedCosmos: (name: string, memberIds: string[]) => SharedCosmos;
  joinSharedCosmos: (id: string) => void;

  /** Derived helpers (computed on call, not stored). */
  starsForActiveCosmos: () => MemoryStar[];
  constellationsForActiveCosmos: () => Constellation[];
  constellationsForStar: (starId: string) => Constellation[];
  suggestConstellations: () => ConstellationSuggestion[];
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
      isAuthed: false,
      activeCosmosId: PERSONAL_COSMOS,
      stars: [],
      constellations: [],
      sharedCosmoses: [],

      signIn: () => set({ isAuthed: true }),
      signOut: () => set({ isAuthed: false, hasOnboarded: false, activeCosmosId: PERSONAL_COSMOS }),
      completeOnboarding: () => set({ hasOnboarded: true }),
      setActiveCosmos: (id) => set({ activeCosmosId: id }),

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
          stars: state.stars.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),

      removeStar: (id) =>
        set((state) => ({
          stars: state.stars.filter((s) => s.id !== id),
          constellations: state.constellations
            .map((c) => ({ ...c, starIds: c.starIds.filter((sid) => sid !== id) }))
            .filter((c) => c.starIds.length >= 2),
        })),

      createConstellation: (name, starIds, origin) => {
        if (starIds.length < 2) return;
        const cosmosId = get().activeCosmosId;
        set((state) => ({
          constellations: [
            ...state.constellations,
            { id: uid('const'), name: name.trim() || 'Constellation', starIds, cosmosId, origin },
          ],
        }));
      },

      removeConstellation: (id) =>
        set((state) => ({
          constellations: state.constellations.filter((c) => c.id !== id),
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
    }),
    {
      name: 'memoria-store-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasOnboarded: state.hasOnboarded,
        isAuthed: state.isAuthed,
        activeCosmosId: state.activeCosmosId,
        stars: state.stars,
        constellations: state.constellations,
        sharedCosmoses: state.sharedCosmoses,
      }),
    },
  ),
);
