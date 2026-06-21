import type {
  Constellation,
  MemoryStar,
  SharedCosmos,
  StarColorKey,
  UserProfile,
} from '@/lib/types';
import { CURRENT_USER } from '@/lib/memoria';
import { estimateStarBytes } from '@/lib/storage';

/** Personal cosmos id (kept local to avoid importing the store and creating a cycle). */
const PERSONAL_COSMOS = 'personal';

/**
 * A pre-populated demo dataset — a realistic life documented over several years
 * as a cosmos of memories and constellations. Loaded by the hidden demo button
 * so the app can be shown as it would look after long-term use.
 *
 * The data is fully deterministic (no Date.now / Math.random) so the demo looks
 * identical every time it's loaded.
 */

/** A single seed memory. Positions are filled in deterministically below. */
interface SeedStar {
  id: string;
  title: string;
  story: string;
  colorKey: StarColorKey;
  /** ISO date (yyyy-mm-dd) for when it happened. */
  date: string;
  location?: { name: string; lat?: number; lng?: number };
  /** Number of photos to fake-attach (drives media size + star richness). */
  photos?: number;
  /** Voice notes as durations in seconds. */
  voice?: number[];
  /** Tagged friend ids (from DIRECTORY_USERS). */
  tags?: string[];
  /** Cosmos this memory belongs to (defaults to PERSONAL_COSMOS). */
  cosmosId?: string;
  /** Author of this memory (defaults to the current user). For shared cosmoses, a member id. */
  authorId?: string;
}

// Stable placeholder image URIs (so photo grids render in the demo).
function photoUris(n: number, seed: string): string[] {
  return Array.from({ length: n }, (_, i) => `https://picsum.photos/seed/${seed}-${i}/900/900`);
}

const SEED: SeedStar[] = [
  // ---- 2021 — early days ----
  {
    id: 'd-001',
    title: 'First night in the new flat',
    story:
      'Boxes everywhere, no curtains yet, and we ate pizza on the floor under a single lamp. It did not feel like home yet but it felt like the start of something. Sam kept saying we would regret the tiny kitchen and we probably will.',
    colorKey: 'amber',
    date: '2021-02-14',
    location: { name: 'Hackney, London' },
    photos: 3,
    tags: ['u-sam'],
  },
  {
    id: 'd-002',
    title: 'Morning runs by the canal',
    story:
      'Started running three times a week along Regent\u2019s Canal. Slow, awful, but the light on the water at 7am is worth it.',
    colorKey: 'cyan',
    date: '2021-03-22',
    location: { name: "Regent's Canal, London" },
    photos: 1,
  },
  {
    id: 'd-003',
    title: 'Dad taught me to fish again',
    story:
      'We drove out to the reservoir before sunrise. Caught nothing for hours and then one tiny perch right at the end. Dad laughed so hard he scared the rest of the fish away. I want to remember the sound of that laugh.',
    colorKey: 'emerald',
    date: '2021-05-09',
    location: { name: 'Grafham Water' },
    photos: 2,
    voice: [34],
    tags: ['u-dad'],
  },
  {
    id: 'd-004',
    title: 'Promotion at work',
    story: 'Got the senior role. Called Mom first. She cried, obviously.',
    colorKey: 'amber',
    date: '2021-06-18',
    location: { name: 'Old Street, London' },
    tags: ['u-mom'],
  },
  {
    id: 'd-005',
    title: 'Heatwave rooftop evening',
    story:
      'The whole city was melting. We dragged chairs up to the roof and watched the sky go pink and orange over the chimneys. Someone three roofs over was playing old soul records.',
    colorKey: 'amber',
    date: '2021-07-20',
    location: { name: 'Hackney, London' },
    photos: 2,
    tags: ['u-sam', 'u-ava'],
  },
  {
    id: 'd-006',
    title: 'Grandma\u2019s last summer',
    story:
      'Sat with Grandma in her garden while she told the same three stories about her wedding. I recorded her voice without telling her. I am so glad I did. Her hands never stopped moving when she talked.',
    colorKey: 'violet',
    date: '2021-08-11',
    location: { name: 'Whitby' },
    photos: 1,
    voice: [62, 41],
    tags: ['u-mom'],
  },
  {
    id: 'd-007',
    title: 'Autumn in the Peak District',
    story:
      'Three days walking with no phone signal. Mud to the knees, the best chips of my life in a tiny pub, and a sky so full of stars I forgot how big it all is.',
    colorKey: 'cyan',
    date: '2021-10-16',
    location: { name: 'Peak District' },
    photos: 3,
    voice: [28],
    tags: ['u-sam', 'u-leo'],
  },
  {
    id: 'd-008',
    title: 'First snow of the year',
    story: 'Woke up to a white street. Made a terrible snowman. No carrot so we used a crayon.',
    colorKey: 'cyan',
    date: '2021-12-02',
    location: { name: 'Hackney, London' },
    photos: 1,
  },

  // ---- 2022 ----
  {
    id: 'd-009',
    title: 'New Year, new ankle',
    story:
      'Slipped on the ice walking home from the party and sprained my ankle on the very first minute of the year. Started 2022 on crutches. Sam has not let me forget it.',
    colorKey: 'rose',
    date: '2022-01-01',
    location: { name: 'Hackney, London' },
    tags: ['u-sam'],
  },
  {
    id: 'd-010',
    title: 'Learning to make bread',
    story:
      'Fourth loaf and it finally rose properly. The flat smelled like a bakery all weekend. The crust cracked exactly the way it is supposed to.',
    colorKey: 'amber',
    date: '2022-02-27',
    photos: 2,
  },
  {
    id: 'd-011',
    title: 'Weekend in Lisbon',
    story:
      'Tiles, custard tarts, and a tram ride that felt like a rollercoaster. We got hopelessly lost in Alfama and it turned out to be the best part. The whole city smells of grilled sardines and the ocean.',
    colorKey: 'amber',
    date: '2022-04-08',
    location: { name: 'Lisbon, Portugal' },
    photos: 3,
    voice: [45],
    tags: ['u-sam'],
  },
  {
    id: 'd-012',
    title: 'Noor\u2019s wedding',
    story:
      'Cried during the vows, danced until my feet gave out, and made a toast I had rehearsed for two weeks. Noor looked impossibly happy. The garden was strung with hundreds of little lights.',
    colorKey: 'amber',
    date: '2022-06-04',
    location: { name: 'Cotswolds' },
    photos: 3,
    tags: ['u-noor', 'u-ava', 'u-leo'],
  },
  {
    id: 'd-013',
    title: 'Lost the pitch',
    story:
      'Months of work and we lost the client in the last meeting. Sat in the stairwell for twenty minutes before I could face anyone.',
    colorKey: 'rose',
    date: '2022-07-19',
    location: { name: 'Old Street, London' },
  },
  {
    id: 'd-014',
    title: 'Camping under the Perseids',
    story:
      'Lay in a field in Wales counting shooting stars until 3am. Lost count somewhere past forty. Leo swears he saw one split in two. The cold was worth every minute.',
    colorKey: 'cyan',
    date: '2022-08-12',
    location: { name: 'Brecon Beacons' },
    photos: 2,
    voice: [51],
    tags: ['u-leo', 'u-sam'],
  },
  {
    id: 'd-015',
    title: 'Adopted Juniper',
    story:
      'Drove to the shelter just to look. Came home with a one-eyed tabby who immediately claimed the warmest chair in the flat and has not given it back since.',
    colorKey: 'emerald',
    date: '2022-09-24',
    location: { name: 'Hackney, London' },
    photos: 2,
    tags: ['u-sam'],
  },
  {
    id: 'd-016',
    title: 'Mom\u2019s 60th',
    story:
      'Surprise dinner with everyone hiding in the back room. The look on her face when the lights came up is something I will keep forever. She kept saying she knew, but she absolutely did not know.',
    colorKey: 'amber',
    date: '2022-11-05',
    location: { name: 'Whitby' },
    photos: 3,
    voice: [38],
    tags: ['u-mom', 'u-dad'],
  },
  {
    id: 'd-017',
    title: 'Quiet Christmas',
    story: 'Just the two of us and Juniper. Films, leftovers, no plans. Perfect.',
    colorKey: 'cyan',
    date: '2022-12-25',
    location: { name: 'Hackney, London' },
    photos: 1,
    tags: ['u-sam'],
  },

  // ---- 2023 ----
  {
    id: 'd-018',
    title: 'Started therapy',
    story:
      'First session today. Nervous the whole way there. Left feeling like I had set something heavy down for a moment. A small step but it counts.',
    colorKey: 'violet',
    date: '2023-01-17',
  },
  {
    id: 'd-019',
    title: 'Snowed in with old films',
    story:
      'The trains stopped so we cancelled everything and worked through a stack of films we kept meaning to watch.',
    colorKey: 'cyan',
    date: '2023-02-08',
    location: { name: 'Hackney, London' },
    tags: ['u-sam'],
  },
  {
    id: 'd-020',
    title: 'Cherry blossom in Kyoto',
    story:
      'We saved for two years for this trip. Walking the Philosopher\u2019s Path under the blossom, petals in our hair, completely silent because there was nothing left to say. The most beautiful place I have ever stood.',
    colorKey: 'emerald',
    date: '2023-04-02',
    location: { name: 'Kyoto, Japan' },
    photos: 3,
    voice: [57, 33],
    tags: ['u-sam'],
  },
  {
    id: 'd-021',
    title: 'Tokyo neon nights',
    story:
      'Got beautifully lost in Shinjuku at midnight. Tiny ramen bar with six seats, the chef nodded once and made us the best meal of the trip. The whole street was electric.',
    colorKey: 'amber',
    date: '2023-04-06',
    location: { name: 'Tokyo, Japan' },
    photos: 3,
    tags: ['u-sam'],
  },
  {
    id: 'd-022',
    title: 'Ran the half marathon',
    story:
      'Two years of those slow canal runs and I finally did it. 1:58. Wept at the finish line like an idiot. Dad was there with a hand-painted sign.',
    colorKey: 'amber',
    date: '2023-05-21',
    location: { name: 'Hackney, London' },
    photos: 2,
    tags: ['u-dad', 'u-sam'],
  },
  {
    id: 'd-022b',
    title: 'Midsummer picnic in the park',
    story:
      'Longest day of the year. We laid out blankets at noon and did not move until the light finally gave up near eleven. Strawberries, a slightly out-of-tune guitar, and the whole gang sprawled in the grass. One of those days you know you will remember while it is still happening.',
    colorKey: 'amber',
    date: '2023-06-21',
    location: { name: 'London Fields' },
    photos: 3,
    voice: [37],
    tags: ['u-sam', 'u-ava', 'u-leo'],
  },
  {
    id: 'd-023',
    title: 'Sam\u2019s health scare',
    story:
      'A week of tests and waiting rooms and pretending to be calm. It came back clear in the end but I have never been so frightened. Holding hands in that corridor.',
    colorKey: 'violet',
    date: '2023-06-30',
    location: { name: 'Royal London Hospital' },
    tags: ['u-sam'],
  },
  {
    id: 'd-024',
    title: 'Sea swimming in Cornwall',
    story:
      'Freezing, screaming, laughing, doing it again. The kind of cold that makes you feel completely alive. Pasties on the harbour wall after.',
    colorKey: 'cyan',
    date: '2023-08-15',
    location: { name: 'St Ives, Cornwall' },
    photos: 3,
    voice: [29],
    tags: ['u-ava', 'u-leo', 'u-sam'],
  },
  {
    id: 'd-025',
    title: 'Built the bookshelf',
    story: 'Flat-pack that took six hours and two arguments. It is slightly crooked. We love it.',
    colorKey: 'amber',
    date: '2023-09-30',
    location: { name: 'Hackney, London' },
    photos: 1,
    tags: ['u-sam'],
  },
  {
    id: 'd-026',
    title: 'Foggy morning at the coast',
    story:
      'Could not see ten feet ahead. The foghorn going every minute. Felt like the edge of the world.',
    colorKey: 'violet',
    date: '2023-11-12',
    location: { name: 'Whitby' },
    photos: 2,
  },
  {
    id: 'd-026b',
    title: 'Solstice fire on the beach',
    story:
      'Drove down on a whim for the summer solstice. A handful of us, driftwood fire, the tide coming in slow under a sky that never fully went dark. Talked about everything and nothing until the embers died.',
    colorKey: 'violet',
    date: '2024-06-20',
    location: { name: 'St Ives, Cornwall' },
    photos: 2,
    voice: [42],
    tags: ['u-sam', 'u-leo'],
  },

  // ---- 2024 ----
  {
    id: 'd-027',
    title: 'Quit the job',
    story:
      'Handed in my notice today. Terrifying and freeing in equal measure. I have wanted to go out on my own for years and finally I have the nerve. No safety net now.',
    colorKey: 'rose',
    date: '2024-01-29',
    location: { name: 'Old Street, London' },
  },
  {
    id: 'd-028',
    title: 'First freelance client',
    story:
      'Signed the first contract for the new business. Tiny project but it is mine. Bought myself a proper coffee to celebrate and sat in the park grinning.',
    colorKey: 'amber',
    date: '2024-03-11',
    location: { name: 'London Fields' },
    voice: [22],
  },
  {
    id: 'd-029',
    title: 'Road trip up the coast',
    story:
      'A week with no schedule, just a car and a playlist. Slept in laybys, ate too many chips, swam at every beach we passed. The far north of Scotland looks like another planet.',
    colorKey: 'cyan',
    date: '2024-05-18',
    location: { name: 'North Coast 500, Scotland' },
    photos: 3,
    voice: [47, 31],
    tags: ['u-sam', 'u-leo'],
  },
  {
    id: 'd-030',
    title: 'Garden finally growing',
    story:
      'The tomatoes I almost gave up on are everywhere now. Picked the first one warm off the vine and ate it standing in the dirt.',
    colorKey: 'emerald',
    date: '2024-07-08',
    location: { name: 'Hackney, London' },
    photos: 2,
  },
  {
    id: 'd-031',
    title: 'Ava moved away',
    story:
      'Helped Ava load the last of the boxes and waved her off to Berlin. Happy for her, hollow in the flat after. The end of a chapter for all of us.',
    colorKey: 'violet',
    date: '2024-08-20',
    location: { name: 'Hackney, London' },
    photos: 1,
    voice: [40],
    tags: ['u-ava', 'u-sam'],
  },
  {
    id: 'd-032',
    title: 'Northern lights',
    story:
      'We chased a forecast all the way to Tromso and on the third night the whole sky turned green and rippled like a curtain. I have never been so quiet in my life. Just stood there, breath fogging, watching the universe show off.',
    colorKey: 'cyan',
    date: '2024-10-03',
    location: { name: 'Troms\u00f8, Norway' },
    photos: 3,
    voice: [55, 36],
    tags: ['u-sam', 'u-leo'],
  },
  {
    id: 'd-033',
    title: 'Cosy autumn weekend',
    story: 'Rain all weekend. Soup, candles, a thousand-piece jigsaw. Nowhere to be.',
    colorKey: 'amber',
    date: '2024-11-16',
    location: { name: 'Hackney, London' },
    tags: ['u-sam'],
  },
  {
    id: 'd-034',
    title: 'Christmas back home',
    story:
      'Whole family under one roof for the first time in years. Too much food, an argument about the board game rules, and Dad falling asleep by 8pm as tradition demands.',
    colorKey: 'amber',
    date: '2024-12-25',
    location: { name: 'Whitby' },
    photos: 3,
    tags: ['u-mom', 'u-dad'],
  },

  // ---- 2025 ----
  {
    id: 'd-035',
    title: 'Business turned a profit',
    story:
      'Did the numbers for the first year and we are actually in the black. Quietly the proudest I have ever been. The leap was worth it.',
    colorKey: 'amber',
    date: '2025-02-04',
    location: { name: 'London Fields' },
    voice: [26],
  },
  {
    id: 'd-036',
    title: 'Snowdonia summit',
    story:
      'Up Snowdon in the cloud, no view at the top at all, then it cleared for ninety seconds and we saw the whole of Wales laid out below. Worth every aching step.',
    colorKey: 'cyan',
    date: '2025-03-29',
    location: { name: 'Snowdonia, Wales' },
    photos: 3,
    tags: ['u-leo', 'u-sam'],
  },
  {
    id: 'd-037',
    title: 'Visited Ava in Berlin',
    story:
      'Three days of galleries, late dinners, and her new favourite bar with no sign on the door. She seems lighter here. We picked up exactly where we left off.',
    colorKey: 'amber',
    date: '2025-05-10',
    location: { name: 'Berlin, Germany' },
    photos: 2,
    voice: [44],
    tags: ['u-ava'],
  },
  {
    id: 'd-038',
    title: 'Juniper turned three',
    story: 'Cake we could not eat, a new cardboard box she loves more than any toy. Spoiled cat.',
    colorKey: 'emerald',
    date: '2025-06-12',
    location: { name: 'Hackney, London' },
    photos: 1,
    tags: ['u-sam'],
  },
];

/** Constellations linking the seed stars into meaningful threads. */
const CONSTELLATION_DEFS: { id: string; name: string; starIds: string[] }[] = [
  {
    id: 'dc-japan',
    name: 'Japan, Spring 2023',
    starIds: ['d-020', 'd-021'],
  },
  {
    id: 'dc-family',
    name: 'Family Gatherings',
    starIds: ['d-016', 'd-034', 'd-006', 'd-017'],
  },
  {
    id: 'dc-running',
    name: 'The Running Story',
    starIds: ['d-002', 'd-022'],
  },
  {
    id: 'dc-flat',
    name: 'Life in the Flat',
    starIds: ['d-001', 'd-015', 'd-025', 'd-030', 'd-038'],
  },
  {
    id: 'dc-skies',
    name: 'Nights Under the Stars',
    starIds: ['d-007', 'd-014', 'd-032'],
  },
  {
    id: 'dc-leap',
    name: 'The Leap',
    starIds: ['d-027', 'd-028', 'd-035'],
  },
  {
    id: 'dc-coast',
    name: 'By the Sea',
    starIds: ['d-024', 'd-026', 'd-026b', 'd-029'],
  },
  {
    id: 'dc-ava',
    name: 'Ava, Near and Far',
    starIds: ['d-005', 'd-022b', 'd-031', 'd-037'],
  },
];

/** Shared (collaborative) cosmos spaces in the demo profile. */
const SHARED_COSMOS_DEFS: { id: string; name: string; memberIds: string[] }[] = [
  // The current user is always a member of their shared spaces.
  { id: 'sc-family', name: 'The Rivera Family', memberIds: ['u-me', 'u-mom', 'u-dad'] },
  { id: 'sc-trip', name: 'Japan 2023 Trip', memberIds: ['u-me', 'u-sam'] },
  { id: 'sc-crew', name: 'The Old Crew', memberIds: ['u-me', 'u-ava', 'u-leo', 'u-sam'] },
];

/** Memories that live inside the shared cosmos spaces (co-authored by members). */
const SHARED_SEED: SeedStar[] = [
  // ---- The Rivera Family ----
  {
    id: 's-fam-01',
    title: 'Sunday roast, all of us',
    story:
      'Three generations around one table for the first time in too long. Mom carved, Dad fell asleep before dessert, and the noise of everyone talking over each other was the best sound in the world.',
    colorKey: 'amber',
    date: '2024-04-14',
    location: { name: 'Whitby' },
    photos: 3,
    voice: [33],
    cosmosId: 'sc-family',
    authorId: 'u-me',
    tags: ['u-mom', 'u-dad'],
  },
  {
    id: 's-fam-02',
    title: 'Dad found the old photo albums',
    story:
      'He scanned a whole box of photos from the 80s and shared them. Me as a toddler covered in cake. Grandma young and laughing. A whole life I half-remember.',
    colorKey: 'violet',
    date: '2024-05-02',
    location: { name: 'Whitby' },
    photos: 2,
    cosmosId: 'sc-family',
    authorId: 'u-dad',
  },
  {
    id: 's-fam-03',
    title: 'Mom learned to video call',
    story:
      'She called just to show me the garden. Forty minutes of tomatoes and neighbourhood gossip. I would not trade it for anything.',
    colorKey: 'emerald',
    date: '2024-07-19',
    photos: 1,
    voice: [41],
    cosmosId: 'sc-family',
    authorId: 'u-mom',
  },
  {
    id: 's-fam-04',
    title: 'Christmas morning chaos',
    story:
      'Everyone in pyjamas, wrapping paper everywhere, Dad insisting on his annual terrible cracker jokes. Recorded a clip of the whole room laughing.',
    colorKey: 'amber',
    date: '2024-12-25',
    location: { name: 'Whitby' },
    photos: 3,
    voice: [28],
    cosmosId: 'sc-family',
    authorId: 'u-me',
    tags: ['u-mom', 'u-dad'],
  },

  // ---- Japan 2023 Trip ----
  {
    id: 's-trip-01',
    title: 'Landed in Tokyo',
    story:
      'Jet-lagged and grinning in the arrivals hall. We just stood on the platform watching the trains for ten minutes, completely overwhelmed in the best way.',
    colorKey: 'cyan',
    date: '2023-04-01',
    location: { name: 'Tokyo, Japan' },
    photos: 2,
    cosmosId: 'sc-trip',
    authorId: 'u-me',
    tags: ['u-sam'],
  },
  {
    id: 's-trip-02',
    title: 'Best ramen of my life',
    story:
      'Sam found this tiny place down an alley with no English menu. We pointed at a picture and it was perfect. Slurped in happy silence.',
    colorKey: 'amber',
    date: '2023-04-03',
    location: { name: 'Tokyo, Japan' },
    photos: 1,
    voice: [22],
    cosmosId: 'sc-trip',
    authorId: 'u-sam',
  },
  {
    id: 's-trip-03',
    title: 'Blossom on the Philosopher\u2019s Path',
    story:
      'We walked it slowly, petals coming down like snow. Sam took a hundred photos and I just tried to stand still and keep it.',
    colorKey: 'emerald',
    date: '2023-04-04',
    location: { name: 'Kyoto, Japan' },
    photos: 3,
    voice: [44],
    cosmosId: 'sc-trip',
    authorId: 'u-me',
    tags: ['u-sam'],
  },
  {
    id: 's-trip-04',
    title: 'Last night, rooftop bar',
    story:
      'Toasted to the trip with the whole city lit up below us. Already planning when we can come back.',
    colorKey: 'violet',
    date: '2023-04-07',
    location: { name: 'Tokyo, Japan' },
    photos: 2,
    cosmosId: 'sc-trip',
    authorId: 'u-sam',
    tags: ['u-me'],
  },

  // ---- The Old Crew ----
  {
    id: 's-crew-01',
    title: 'Festival weekend',
    story:
      'Mud, terrible tents, and a headline set we screamed every word to. The whole crew together before everyone scattered across the map.',
    colorKey: 'rose',
    date: '2023-07-15',
    location: { name: 'Somerset' },
    photos: 3,
    voice: [37],
    cosmosId: 'sc-crew',
    authorId: 'u-leo',
    tags: ['u-ava', 'u-sam'],
  },
  {
    id: 's-crew-02',
    title: 'Ava\u2019s leaving drinks',
    story:
      'A loud, happy, slightly tearful night before Berlin. We made her promise to keep this cosmos going so we never lose the thread.',
    colorKey: 'violet',
    date: '2024-08-17',
    location: { name: 'Hackney, London' },
    photos: 2,
    cosmosId: 'sc-crew',
    authorId: 'u-ava',
    tags: ['u-leo', 'u-sam'],
  },
  {
    id: 's-crew-03',
    title: 'New Year video call',
    story:
      'Four time zones, four screens, one terrible synchronised countdown. We were off by about nine seconds and it did not matter at all.',
    colorKey: 'cyan',
    date: '2025-01-01',
    photos: 1,
    voice: [31],
    cosmosId: 'sc-crew',
    authorId: 'u-me',
    tags: ['u-ava', 'u-leo'],
  },
];

/** Constellations that live inside the shared cosmoses. */
const SHARED_CONSTELLATION_DEFS: {
  id: string;
  name: string;
  cosmosId: string;
  starIds: string[];
}[] = [
  {
    id: 'sc-trip-arc',
    name: 'Tokyo to Kyoto',
    cosmosId: 'sc-trip',
    starIds: ['s-trip-01', 's-trip-02', 's-trip-03', 's-trip-04'],
  },
  {
    id: 'sc-fam-gather',
    name: 'Around the Table',
    cosmosId: 'sc-family',
    starIds: ['s-fam-01', 's-fam-04'],
  },
];

/** Deterministic [0,1) from a string seed (FNV-1a) — no Math.random. */
function seed01(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** Spread the stars across the cosmos with stable, well-separated positions. */
function buildStars(): MemoryStar[] {
  const all = [...SEED, ...SHARED_SEED];
  // Track placed positions per cosmos so spacing is computed within each space.
  const placedByCosmos = new Map<string, { x: number; y: number }[]>();
  return all.map((s) => {
    const cosmosId = s.cosmosId ?? PERSONAL_COSMOS;
    const placed = placedByCosmos.get(cosmosId) ?? [];
    // Deterministic placement biased away from the exact center, avoiding overlaps.
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const a = seed01(`${s.id}-a-${attempt}`) * Math.PI * 2;
      const d = 0.2 + seed01(`${s.id}-d-${attempt}`) * 0.78;
      x = Math.cos(a) * d;
      y = Math.sin(a) * d;
      const tooClose = placed.some((p) => Math.hypot(p.x - x, p.y - y) < 0.16);
      if (!tooClose) break;
    }
    placed.push({ x, y });
    placedByCosmos.set(cosmosId, placed);

    const photos = photoUris(s.photos ?? 0, s.id);
    const voiceNotes = (s.voice ?? []).map((durationSec, i) => ({
      id: `${s.id}-v${i}`,
      uri: `memoria://demo-voice/${s.id}-${i}`,
      durationSec,
    }));

    const star: MemoryStar = {
      id: s.id,
      title: s.title,
      story: s.story,
      colorKey: s.colorKey,
      date: s.date,
      createdAt: `${s.date}T12:00:00.000Z`,
      location: s.location,
      photos,
      voiceNotes,
      mediaBytes: estimateStarBytes(photos, voiceNotes),
      taggedUserIds: s.tags ?? [],
      x,
      y,
      authorId: s.authorId ?? CURRENT_USER.id,
      cosmosId,
    };
    return star;
  });
}

function buildConstellations(): Constellation[] {
  const personal = CONSTELLATION_DEFS.map((c) => ({
    id: c.id,
    name: c.name,
    starIds: c.starIds,
    cosmosId: PERSONAL_COSMOS,
    origin: 'manual' as const,
  }));
  const shared = SHARED_CONSTELLATION_DEFS.map((c) => ({
    id: c.id,
    name: c.name,
    starIds: c.starIds,
    cosmosId: c.cosmosId,
    origin: 'manual' as const,
  }));
  return [...personal, ...shared];
}

/** Build the demo shared cosmos spaces. */
function buildSharedCosmoses(): SharedCosmos[] {
  return SHARED_COSMOS_DEFS.map((c) => {
    // Anchor each space's createdAt to its earliest memory for realism.
    const dates = SHARED_SEED.filter((s) => s.cosmosId === c.id)
      .map((s) => s.date)
      .sort();
    const created = dates[0] ?? '2023-01-01';
    return {
      id: c.id,
      name: c.name,
      memberIds: c.memberIds,
      createdAt: `${created}T12:00:00.000Z`,
    };
  });
}

export interface DemoDataset {
  stars: MemoryStar[];
  constellations: Constellation[];
  sharedCosmoses: SharedCosmos[];
  profile: UserProfile;
  friendIds: string[];
}

/** Build the full deterministic demo dataset. */
export function buildDemoDataset(): DemoDataset {
  return {
    stars: buildStars(),
    constellations: buildConstellations(),
    sharedCosmoses: buildSharedCosmoses(),
    profile: {
      displayName: 'Alex Rivera',
      bio: 'Documenting the constellations of an ordinary, extraordinary life.',
      avatarColorKey: 'cyan',
    },
    friendIds: ['u-mom', 'u-dad', 'u-sam', 'u-noor', 'u-leo', 'u-ava'],
  };
}
