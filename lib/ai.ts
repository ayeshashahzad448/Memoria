/**
 * Lightweight client for the two AI features in Memoria:
 *  - AI constellation suggestions (group related memories with a poetic name + reason)
 *  - AI writing help (draft or expand a memory's story)
 *
 * Calls the OpenAI Chat Completions API directly from the client using the
 * EXPO_PUBLIC_OPENAI_API_KEY. Model is gpt-4o-mini (low cost, fast).
 *
 * Every function fails soft: if the key is missing or the request errors, the
 * caller receives a clear { ok: false, error } result and the UI degrades to
 * the existing heuristic behaviour.
 */

import type { MemoryStar } from '@/lib/types';
import { userById } from '@/lib/memoria';

const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

export const aiEnabled = (): boolean => Boolean(API_KEY && API_KEY.length > 0);

type ChatMessage = { role: 'system' | 'user'; content: string };

interface ChatChoice {
  message?: { content?: string | null };
}
interface ChatResponse {
  choices?: ChatChoice[];
}

function isChatResponse(v: unknown): v is ChatResponse {
  return typeof v === 'object' && v !== null && ('choices' in v || true);
}

/** Core request helper. Returns the assistant text or throws. */
async function chat(messages: ChatMessage[], opts?: { json?: boolean }): Promise<string> {
  if (!API_KEY) throw new Error('AI is not configured.');
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.8,
      max_tokens: 700,
      ...(opts?.json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AI request failed (${res.status}). ${text.slice(0, 140)}`);
  }
  const raw: unknown = await res.json();
  if (!isChatResponse(raw)) throw new Error('AI returned an unexpected response shape.');
  const content = raw.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('AI returned an empty response.');
  return content;
}

/* -------------------------- Constellation suggestions ---------------------- */

type ConstellationItem = { name?: string; reason?: string; starIds?: string[] };
type ConstellationsPayload = { constellations?: ConstellationItem[] };

function isConstellationsPayload(v: unknown): v is ConstellationsPayload {
  return typeof v === 'object' && v !== null;
}

export interface AISuggestion {
  id: string;
  /** Poetic constellation name. */
  name: string;
  /** One-sentence reason these memories belong together. */
  reason: string;
  /** Ids of the member memories. */
  starIds: string[];
}

export type AIResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Compact a star into the minimal fields the model needs (no media URIs). */
function describeStar(s: MemoryStar) {
  const people = s.taggedUserIds
    .map((id) => userById(id)?.name)
    .filter(Boolean)
    .join(', ');
  return {
    id: s.id,
    title: s.title || '(untitled)',
    date: s.date.slice(0, 10),
    location: s.location?.name ?? '',
    people,
    note: s.story.slice(0, 240),
  };
}

/**
 * Ask the model to find 1-4 meaningful groupings across the user's memories.
 * `existingSignatures` are sorted-id-join strings of constellations that already
 * exist, so the model's output can be filtered against duplicates by the caller.
 */
export async function aiSuggestConstellations(
  stars: MemoryStar[],
): Promise<AIResult<AISuggestion[]>> {
  if (!aiEnabled()) return { ok: false, error: 'AI is not configured.' };
  if (stars.length < 3) {
    return { ok: false, error: 'Add a few more memories to get suggestions.' };
  }
  // Cap the payload so prompts stay small/cheap.
  const payload = stars.slice(0, 60).map(describeStar);
  try {
    const content = await chat(
      [
        {
          role: 'system',
          content:
            'You are the constellation curator for Memoria, an app that visualizes memories as stars. ' +
            'Given a list of memories, find 2 to 4 meaningful groupings (constellations) that share a ' +
            'theme, relationship, place, or emotional thread. Each group must contain 2 to 6 memories ' +
            'referenced by their exact id. Give each a short evocative name (2-4 words, no emoji) and a ' +
            'single warm sentence explaining what ties them together. Only group memories that genuinely ' +
            'belong together; prefer fewer, stronger groups over forced ones. ' +
            'Respond ONLY as JSON: {"constellations":[{"name":string,"reason":string,"starIds":string[]}]}.',
        },
        {
          role: 'user',
          content: `Here are the memories as JSON:\n${JSON.stringify(payload)}`,
        },
      ],
      { json: true },
    );
    const rawParsed: unknown = JSON.parse(content);
    const parsed: ConstellationsPayload = isConstellationsPayload(rawParsed)
      ? rawParsed
      : { constellations: [] };
    const valid = new Set(stars.map((s) => s.id));
    const out: AISuggestion[] = [];
    for (const c of parsed.constellations ?? []) {
      const ids = (c.starIds ?? []).filter((id) => valid.has(id));
      const unique = [...new Set(ids)];
      if (unique.length < 2) continue;
      out.push({
        id: `ai-${unique.slice().sort().join('-')}`,
        name: (c.name ?? 'Untitled constellation').trim(),
        reason: (c.reason ?? '').trim(),
        starIds: unique,
      });
    }
    if (out.length === 0) {
      return { ok: false, error: 'No clear groupings found yet. Keep adding memories.' };
    }
    return { ok: true, data: out };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong.' };
  }
}

/* ------------------------------ Writing help ------------------------------- */

export interface WriteHelpInput {
  title: string;
  /** Whatever the user has written so far (may be empty). */
  draft: string;
  date?: string;
  location?: string;
  people?: string[];
  /** 'draft' starts from scratch, 'expand' enriches what's there, 'polish' tidies it. */
  mode: 'draft' | 'expand' | 'polish';
}

export async function aiWriteMemory(input: WriteHelpInput): Promise<AIResult<string>> {
  if (!aiEnabled()) return { ok: false, error: 'AI is not configured.' };
  const { title, draft, date, location, people, mode } = input;
  if (mode !== 'draft' && draft.trim().length === 0) {
    return { ok: false, error: 'Write a little first, then let me help.' };
  }
  if (mode === 'draft' && title.trim().length === 0 && draft.trim().length === 0) {
    return { ok: false, error: 'Add a title or a few words to begin.' };
  }

  const facts: string[] = [];
  if (title.trim()) facts.push(`Title: ${title.trim()}`);
  if (date) facts.push(`Date: ${date.slice(0, 10)}`);
  if (location) facts.push(`Place: ${location}`);
  if (people && people.length > 0) facts.push(`People there: ${people.join(', ')}`);

  const instruction =
    mode === 'draft'
      ? 'Write a warm, first-person memory entry (about 3-5 sentences) based on the details. ' +
        'Invent only gentle sensory texture; do not fabricate specific facts, names, or events not implied.'
      : mode === 'expand'
        ? 'Expand and enrich the draft below into a fuller first-person memory (about 4-6 sentences), ' +
          'keeping the original voice, facts, and feeling. Add sensory and emotional depth, not new events.'
        : 'Gently polish the draft below: fix flow and clarity, keep it first-person and personal, ' +
          'keep all facts and the original voice. Do not add new events.';

  try {
    const content = await chat([
      {
        role: 'system',
        content:
          'You help people write personal memory journal entries for Memoria. Write in a natural, ' +
          'heartfelt first-person voice. No headings, no markdown, no quotation marks around the text, ' +
          'no preamble like "Here is" — return only the memory text itself.',
      },
      {
        role: 'user',
        content:
          `${instruction}\n\n` +
          (facts.length ? `Details:\n${facts.join('\n')}\n\n` : '') +
          (draft.trim() ? `Draft:\n${draft.trim()}` : ''),
      },
    ]);
    // Strip stray wrapping quotes the model sometimes adds.
    const cleaned = content.replace(/^["'\u201c\u201d]+|["'\u201c\u201d]+$/g, '').trim();
    return { ok: true, data: cleaned };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong.' };
  }
}
