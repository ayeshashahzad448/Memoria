import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Share } from 'react-native';
import { format } from 'date-fns';

import type { MemoryStar } from '@/lib/types';

export type ShareResult = 'shared' | 'copied' | 'dismissed' | 'failed';

const MAX_STORY_CHARS = 600;

/** Plain-text version of a memory, suitable for any messaging app. */
export function memoryShareText(star: MemoryStar): string {
  const lines = [star.title];
  const meta = [format(new Date(star.date), 'PPP'), star.location?.name]
    .filter(Boolean)
    .join(' · ');
  if (meta) lines.push(meta);
  const story = star.story.trim();
  if (story) {
    const excerpt =
      story.length > MAX_STORY_CHARS ? `${story.slice(0, MAX_STORY_CHARS).trimEnd()}…` : story;
    lines.push('', excerpt);
  }
  lines.push('', 'A memory from Memoria');
  return lines.join('\n');
}

/**
 * Open the system share sheet (WhatsApp, Instagram, Messages, Mail and so on). Browsers
 * without the Web Share API get the text copied to the clipboard instead.
 */
export async function shareMemory(star: MemoryStar): Promise<ShareResult> {
  const message = memoryShareText(star);
  const photo = star.photos[0];
  try {
    // iOS can attach one image or link next to the message; Android shares the text.
    const content = Platform.OS === 'ios' && photo ? { message, url: photo } : { message };
    const result = await Share.share(content, {
      dialogTitle: `Share "${star.title}"`,
      subject: star.title,
    });
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(message);
        return 'copied';
      } catch {
        return 'failed';
      }
    }
    return 'failed';
  }
}

/** Share handler plus a short status line ("Copied to clipboard") that clears itself. */
export function useShareMemory(star: MemoryStar | undefined) {
  const [note, setNote] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const share = useCallback(async () => {
    if (!star) return;
    const result = await shareMemory(star);
    const message =
      result === 'copied'
        ? 'Copied to clipboard'
        : result === 'failed'
          ? "Couldn't open sharing on this device"
          : null;
    setNote(message);
    if (timer.current) clearTimeout(timer.current);
    if (message) timer.current = setTimeout(() => setNote(null), 2500);
  }, [star]);

  return { share, note };
}
