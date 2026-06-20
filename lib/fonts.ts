import { Platform } from 'react-native';
import { Orbitron_700Bold, Orbitron_800ExtraBold } from '@expo-google-fonts/orbitron';

/**
 * Memoria wordmark font.
 *
 * The original Mokoto is a commercial font. As a close, freely available
 * alternative we use Orbitron — a wide, squarish, geometric sci-fi display
 * face with the same techno/futuristic character as Mokoto. It loads on both
 * native (expo-font) and web (Google Fonts) without needing a local file.
 */

/** The font family name registered for the Memoria wordmark. */
export const MOKOTO_FAMILY = 'Orbitron';

/** Display fallback used if the wordmark family ever fails to load. */
export const MOKOTO_FALLBACK = 'Space Grotesk';

/** Whether the wordmark font is wired up. */
export const MOKOTO_AVAILABLE = true;

/**
 * Returns the font map to merge into `useFonts`. Registers Orbitron weights
 * plus a clean `'Orbitron'` alias so `fontFamily: 'Orbitron'` resolves on native.
 */
export function getMokotoFontMap(): Record<string, number> {
  return {
    Orbitron_700Bold,
    Orbitron_800ExtraBold,
    Orbitron: Orbitron_800ExtraBold,
  };
}

/**
 * The fontFamily string to use for the wordmark. Resolves to Orbitron when
 * loaded, otherwise the display fallback.
 */
export function wordmarkFamily(): string {
  return MOKOTO_AVAILABLE ? MOKOTO_FAMILY : MOKOTO_FALLBACK;
}

/**
 * Injects a Google Fonts link for web so the wordmark can use Orbitron in the browser.
 */
export function injectMokotoWebFont(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('memoria-wordmark-font')) return;
  const link = document.createElement('link');
  link.id = 'memoria-wordmark-font';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800;900&display=swap';
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}
