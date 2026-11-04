import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { Platform, Share, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { format } from 'date-fns';

import { ShareCard } from '@/components/ShareCard';
import type { MemoryStar } from '@/lib/types';

export type ShareResult = 'shared' | 'copied' | 'saved' | 'dismissed' | 'failed';

const MAX_STORY_CHARS = 600;
/** Give the off-screen card time to lay out and load its fonts before it is captured. */
const CARD_SETTLE_MS = 350;

/** Plain-text version of a memory, used as the caption and as the fallback. */
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

/** Text-only sharing: the system share sheet, or the clipboard in a browser without one. */
async function shareText(star: MemoryStar): Promise<ShareResult> {
  const message = memoryShareText(star);
  try {
    const result = await Share.share(
      { message },
      { dialogTitle: `Share "${star.title}"`, subject: star.title },
    );
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

/** react-native-view-shot can't resolve views in a browser, so draw the card with html2canvas. */
async function captureOnWeb(card: View): Promise<string> {
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(card as unknown as HTMLElement, {
    backgroundColor: null,
    scale: 2,
  });
  return canvas.toDataURL('image/png');
}

/** Capture the rendered card and share it as an image. */
async function shareCardImage(star: MemoryStar, card: View): Promise<ShareResult> {
  const caption = memoryShareText(star);

  if (Platform.OS === 'web') {
    const dataUri = await captureOnWeb(card);
    const blob = await (await fetch(dataUri)).blob();
    const file = new File([blob], 'memoria-memory.png', { type: 'image/png' });
    if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: star.title, text: caption });
        return 'shared';
      } catch {
        return 'dismissed';
      }
    }
    // No file sharing in this browser: save the card as an image instead.
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = 'memoria-memory.png';
    link.click();
    return 'saved';
  }

  const uri = await captureRef(card, { format: 'png', quality: 1, result: 'tmpfile' });
  if (Platform.OS === 'ios') {
    // iOS can send the image together with the caption.
    const result = await Share.share({ message: caption, url: uri });
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: `Share "${star.title}"`,
    });
    return 'shared';
  }
  return shareText(star);
}

const NOTES: Partial<Record<ShareResult, string>> = {
  copied: 'Copied to clipboard',
  saved: 'Card saved as an image',
  failed: "Couldn't open sharing on this device",
};

/**
 * Share handler for a memory. Shares a picture card of the memory (falling back to plain text if
 * the card can't be captured) and shows a short status line that clears itself. Render
 * `cardElement` once inside the screen: it mounts the card off-screen only while sharing.
 */
export function useShareMemory(star: MemoryStar | undefined) {
  const [note, setNote] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const cardRef = useRef<View>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const share = useCallback(async () => {
    if (!star || capturing) return;
    let result: ShareResult;
    try {
      setCapturing(true);
      await new Promise((resolve) => setTimeout(resolve, CARD_SETTLE_MS));
      if (!cardRef.current) throw new Error('Card not ready');
      result = await shareCardImage(star, cardRef.current);
    } catch (error) {
      // Capturing can fail (no off-screen layout yet, missing native module); text still shares.
      console.warn('Share card unavailable, sharing text instead:', error);
      result = await shareText(star);
    } finally {
      setCapturing(false);
    }
    const message = NOTES[result] ?? null;
    setNote(message);
    if (timer.current) clearTimeout(timer.current);
    if (message) timer.current = setTimeout(() => setNote(null), 2500);
  }, [star, capturing]);

  const cardElement: ReactElement | null =
    capturing && star ? (
      <View pointerEvents="none" style={{ position: 'absolute', left: -4000, top: 0 }}>
        <ShareCard ref={cardRef} star={star} />
      </View>
    ) : null;

  return { share, note, cardElement };
}
