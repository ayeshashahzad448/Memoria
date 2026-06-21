import type { Router } from 'expo-router';

import type { MemoriaState } from '@/lib/store';

/**
 * A guided, auto-playing product walkthrough for recording a demo video.
 *
 * Each step shows a narration line (a draft voiceover script you can read over
 * the recording) and runs an `action` that drives the real app — navigating
 * screens, loading the demo dataset, focusing stars, drawing constellations —
 * so the app moves through its features on its own while you talk.
 *
 * The walkthrough has two acts:
 *   1. A blank, first-run perspective (splash → sign up → empty cosmos) so the
 *      viewer sees where every new user begins.
 *   2. The same cosmos after years of use (the demo dataset loads) so the
 *      viewer sees what it grows into — memories, constellations, recall,
 *      shared spaces, search and storage.
 *
 * Durations are a starting point tuned for a relaxed voiceover; adjust freely.
 */

/** Everything a step's action can use to drive the app. */
export interface TourContext {
  router: Router;
  store: MemoriaState;
  /** Resolve after `ms`, but rejects early if the tour is cancelled. */
  wait: (ms: number) => Promise<void>;
}

export interface TourStep {
  /** Short label for the controller (not shown to the viewer). */
  id: string;
  /** The draft voiceover line for this beat — read this aloud. */
  narration: string;
  /** How long this beat holds before auto-advancing (ms). */
  duration: number;
  /** Drives the app for this beat. May await ctx.wait for internal timing. */
  action?: (ctx: TourContext) => void | Promise<void>;
}

// Stable demo ids (see lib/demoData.ts). Used to focus specific memories and
// constellations during the tour.
const DEMO = {
  // A rich, photo-and-voice memory that reads well when opened.
  featureMemory: 'd-020', // Kyoto, Japan (Spring 2023)
  secondMemory: 'd-027', // "The Leap"
  // Constellations to frame and draw on screen.
  constellationFlat: 'dc-flat', // Life in the Flat
  constellationJapan: 'dc-japan', // Japan, Spring 2023
  constellationCoast: 'dc-coast', // By the Sea
} as const;

/**
 * The walkthrough script. Pure data + closures; the overlay executes it.
 */
export const TOUR_STEPS: TourStep[] = [
  // ───────────────────────────── Act 1 — the blank beginning ──────────────
  {
    id: 'intro',
    narration:
      'This is Memoria — a place to keep your memories. Not as a list or a feed, but as a night sky. Every memory you save becomes a star.',
    duration: 7000,
    action: ({ router, store }) => {
      // Start from a clean, signed-out, un-onboarded slate so the viewer sees
      // exactly what a brand-new user sees.
      store.resetApp();
      router.replace('/');
    },
  },
  {
    id: 'signup',
    narration:
      'When you first arrive, you make an account in seconds — name, email, or just sign in with Google or Apple. No setup, no empty folders to organise.',
    duration: 7500,
    action: ({ router }) => {
      router.replace('/auth');
    },
  },
  {
    id: 'onboarding-empty',
    narration:
      'And then you land in your own universe. At the start it is completely empty — quiet, dark, and waiting. The app even says it: it seems a bit empty in here.',
    duration: 8000,
    action: ({ router, store }) => {
      store.signIn();
      router.replace('/onboarding');
    },
  },
  {
    id: 'first-memory',
    narration:
      'So you light your first star. You give a memory a title, write as little or as much as you like, add photos, a voice note, who you were with, and where it happened.',
    duration: 8500,
    action: ({ router, store }) => {
      store.completeOnboarding();
      router.replace('/(tabs)');
    },
  },

  // ───────────────────────── Act 2 — a life, years later ──────────────────
  {
    id: 'load-demo',
    narration:
      'Now let me show you what that same sky looks like after a few years of doing this. Every point of light here is a real moment someone chose to keep.',
    duration: 8500,
    action: async ({ router, store, wait }) => {
      store.loadDemoProfile();
      router.replace('/(tabs)');
      // Let the cosmos settle, then drift the view a touch.
      await wait(1600);
    },
  },
  {
    id: 'cosmos-explore',
    narration:
      'The brighter, larger stars are the memories you poured the most into — long stories, lots of photos. The faint ones are quick, fleeting notes. You can pinch, drag, and orbit through all of them in 3D.',
    duration: 9000,
    action: ({ store }) => {
      // Make sure no panel or focus is lingering so the full field is visible.
      store.setOpenMemoryStar(null);
      store.focusStar(null);
      store.focusConstellation(null);
    },
  },
  {
    id: 'open-memory',
    narration:
      'Tap any star and it opens. Here is a trip to Kyoto — the photos, the story exactly as it was written, the people who were there, and even a voice note from that day.',
    duration: 9500,
    action: ({ store }) => {
      // Zooms to the star and slides in its floating detail panel.
      store.setOpenMemoryStar(DEMO.featureMemory);
    },
  },
  {
    id: 'memory-detail',
    narration:
      'Nothing is buried in an album. The whole memory — words, images, sound, place, and the friends tagged in it — lives right inside its star.',
    duration: 8000,
  },
  {
    id: 'constellations-intro',
    narration:
      'Memories rarely stand alone. So you can connect them into constellations — your own groupings that tell a bigger story across time.',
    duration: 8000,
    action: ({ store }) => {
      store.setOpenMemoryStar(null);
      // Frame and draw a constellation right in the cosmos.
      store.focusConstellation(DEMO.constellationFlat);
    },
  },
  {
    id: 'constellation-draw',
    narration:
      'This one is called Life in the Flat — years of small moments in the same home, drawn together into a single shape in the sky.',
    duration: 8500,
    action: async ({ store, wait }) => {
      await wait(4200);
      store.focusConstellation(DEMO.constellationJapan);
    },
  },
  {
    id: 'constellations-screen',
    narration:
      'You can browse every constellation in one place — Japan in spring, family gatherings, the year by the sea. Tap one and the cosmos flies you straight to it.',
    duration: 9000,
    action: async ({ router, store, wait }) => {
      store.focusConstellation(null);
      await wait(400);
      router.push('/constellations');
    },
  },
  {
    id: 'recall',
    narration:
      'Recall brings the past back to you on its own. On this day a year ago, a quiet highlight you had forgotten — Memoria resurfaces what matters before you go looking.',
    duration: 9000,
    action: async ({ router, wait }) => {
      router.back();
      await wait(500);
      router.navigate('/(tabs)/throwbacks');
    },
  },
  {
    id: 'shared',
    narration:
      'Some skies are meant to be shared. You can create a shared cosmos and invite family or friends, so a trip or a whole life chapter is remembered together, by everyone who lived it.',
    duration: 9500,
    action: ({ router }) => {
      router.navigate('/(tabs)/shared');
    },
  },
  {
    id: 'search',
    narration:
      'When you are looking for something specific, search finds it by word, place, person, or date — and then dives you right into that star.',
    duration: 8500,
    action: ({ router }) => {
      router.navigate('/(tabs)/search');
    },
  },
  {
    id: 'profile',
    narration:
      'Your profile is the quiet centre of it all — who you are, the friends you share with, and how much of your sky you have filled, all kept safely in one place.',
    duration: 8500,
    action: ({ router }) => {
      router.navigate('/(tabs)/profile');
    },
  },
  {
    id: 'pricing',
    narration:
      'Memoria is free to start — five gigabytes of secure storage, your starfield, and everything you need to begin remembering. When your sky fills up, Premium unlocks unlimited cloud storage, uncompressed photos and voice notes, full constellation mapping, and the Reflections recall feed — two ninety-nine a month, or twenty-nine ninety-nine a year.',
    duration: 11000,
    action: async ({ router, store, wait }) => {
      store.setOpenMemoryStar(null);
      store.focusConstellation(null);
      await wait(300);
      router.push('/paywall');
    },
  },
  {
    id: 'pricing-family',
    narration:
      'And because some memories belong to a whole family, there is a Family plan — everything in Premium for up to five people, with one shared cosmos to pass down across generations — seven ninety-nine a month, or seventy-nine ninety-nine a year. Every plan is cancel-anytime, private, and end-to-end encrypted.',
    duration: 10000,
  },
  {
    id: 'outro',
    narration:
      'That is Memoria. Not somewhere you scroll, but somewhere you return — a universe of everything worth remembering, and it only gets brighter with time.',
    duration: 9000,
    action: async ({ router, store, wait }) => {
      router.back();
      await wait(400);
      router.navigate('/(tabs)');
      await wait(600);
      // Leave the viewer on the full, glowing cosmos.
      store.setOpenMemoryStar(null);
      store.focusConstellation(DEMO.constellationCoast);
    },
  },
];

/** Total scripted runtime, for the controller's progress display. */
export const TOUR_TOTAL_MS = TOUR_STEPS.reduce((sum, s) => sum + s.duration, 0);
