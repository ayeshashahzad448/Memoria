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

// The first memory the tour "writes" live on screen. Typed out so the viewer
// sees the star grow brighter and larger the more story is added.
const FIRST_STAR = {
  title: 'The morning we got the keys',
  // Built up word-by-word; the star preview grows as this fills in.
  story:
    'We picked up the keys just after nine, both of us still half asleep and grinning like idiots. The flat was completely empty — bare floors, light pouring through windows with no curtains yet — and it echoed when we laughed. We sat on the floor with coffee in paper cups and just looked around at the space that was finally ours, imagining where everything would go.',
  colorKey: 'amber' as const, // Joy
  photo: 'https://picsum.photos/seed/memoria-first-0/900/900',
} as const;

// A blank starting compose object for the live create screen.
function emptyCompose() {
  return {
    title: '',
    story: '',
    colorKey: FIRST_STAR.colorKey,
    date: new Date().toISOString(),
    photos: [] as string[],
    voiceNotes: [],
    taggedIds: [] as string[],
  };
}

// Carries the in-progress first memory between consecutive typing beats so each
// beat builds on what the previous one typed. Reset when the tour restarts.
let composeState: ReturnType<typeof emptyCompose> | null = null;

/**
 * Type `full` into `field` of the demo compose object, a few characters at a
 * time, so the Create screen renders it as if a person were typing. Updates the
 * store after each chunk and pauses with ctx.wait so it stays cancellable.
 */
async function typeInto(
  ctx: TourContext,
  base: ReturnType<typeof emptyCompose>,
  field: 'title' | 'story',
  full: string,
  opts: { chunk: number; delay: number },
) {
  let shown = '';
  for (let i = 0; i < full.length; i += opts.chunk) {
    shown = full.slice(0, i + opts.chunk);
    ctx.store.setDemoCompose({ ...base, [field]: shown });
    base[field] = shown;
    await ctx.wait(opts.delay);
  }
  // Ensure the full string is shown at the end.
  base[field] = full;
  ctx.store.setDemoCompose({ ...base });
}

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
      store.setDemoCompose(null);
      composeState = null;
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
    id: 'open-create',
    narration:
      'So you light your first star. You tap to create a memory, and a blank star is already waiting — it just needs you to fill it with something real.',
    duration: 6500,
    action: async ({ router, store, wait }) => {
      store.completeOnboarding();
      store.setDemoCompose(emptyCompose());
      router.replace('/(tabs)');
      await wait(900);
      router.push('/star/create');
      await wait(1200);
    },
  },
  {
    id: 'type-title',
    narration:
      'You give it a title — the morning we got the keys. A small, ordinary moment, but one worth keeping.',
    duration: 5500,
    action: async (ctx) => {
      const base = emptyCompose();
      ctx.store.setDemoCompose(base);
      await ctx.wait(500);
      await typeInto(ctx, base, 'title', FIRST_STAR.title, { chunk: 2, delay: 95 });
      // Stash so the next beat keeps the typed title.
      composeState = base;
    },
  },
  {
    id: 'type-story-grows',
    narration:
      'Now watch the star itself. As you write the story — the empty rooms, the coffee in paper cups, the light through bare windows — the star grows brighter and larger. The deeper the memory, the brighter it shines.',
    duration: 13000,
    action: async (ctx) => {
      const base = composeState ?? { ...emptyCompose(), title: FIRST_STAR.title };
      ctx.store.setDemoCompose({ ...base });
      await ctx.wait(700);
      // Type the story in small chunks so the live preview visibly grows.
      await typeInto(ctx, base, 'story', FIRST_STAR.story, { chunk: 3, delay: 130 });
      composeState = base;
    },
  },
  {
    id: 'add-color-photo',
    narration:
      'You choose a colour for how it felt — warm gold for joy — and add a photo from that morning. Everything about the moment lives in this one point of light.',
    duration: 7500,
    action: async (ctx) => {
      const base = composeState ?? {
        ...emptyCompose(),
        title: FIRST_STAR.title,
        story: FIRST_STAR.story,
      };
      base.colorKey = FIRST_STAR.colorKey;
      ctx.store.setDemoCompose({ ...base });
      await ctx.wait(1400);
      base.photos = [FIRST_STAR.photo];
      ctx.store.setDemoCompose({ ...base });
      composeState = base;
      await ctx.wait(1600);
    },
  },
  {
    id: 'ignite',
    narration:
      'And when you save it, the star ignites — collapsing and flaring to life, finding its place in your sky. Your universe has its first point of light.',
    duration: 8000,
    action: async ({ router, store, wait }) => {
      const c = composeState ?? {
        ...emptyCompose(),
        title: FIRST_STAR.title,
        story: FIRST_STAR.story,
        photos: [FIRST_STAR.photo],
      };
      const star = store.addStar({
        title: c.title,
        story: c.story,
        colorKey: c.colorKey,
        date: c.date,
        location: undefined,
        photos: c.photos,
        voiceNotes: [],
        taggedUserIds: [],
        cosmosId: 'personal',
      });
      store.setDemoCompose(null);
      composeState = null;
      router.replace({ pathname: '/star/ignite', params: { id: star.id } });
      await wait(5600);
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
      // Frame and draw the "M" constellation right in the cosmos.
      store.focusConstellation(DEMO.constellationFlat);
    },
  },
  {
    id: 'constellation-draw',
    narration:
      'This one is called Life in the Flat — years of small moments in the same home. Watch as the cosmos pulls back: the stars line up and draw a perfect letter M, hanging in the sky.',
    duration: 9500,
    action: async ({ store, wait }) => {
      // Linger on the M while it draws and the camera frames the full shape.
      await wait(6500);
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
