import { Platform } from 'react-native';

/**
 * Mokoto wordmark font handling.
 *
 * The Mokoto font is a custom/commercial font. Once you drop the file into
 * `assets/fonts/Mokoto.ttf`, follow the two TODO markers below to activate it.
 * Until then the wordmark uses the Space Grotesk display family as a fallback so
 * the bundle never fails on a missing asset (Metro resolves `require` statically,
 * so we cannot reference a file that does not exist yet).
 */

/** The font family name registered for the Memoria wordmark. */
export const MOKOTO_FAMILY = 'Mokoto';

/** Display fallback used until the Mokoto file is supplied. */
export const MOKOTO_FALLBACK = 'Space Grotesk';

/**
 * Returns the font map to merge into `useFonts`. Empty until the file is added.
 *
 * TODO(Mokoto): after adding `assets/fonts/Mokoto.ttf`, replace the body with:
 *   return { [MOKOTO_FAMILY]: require('@/assets/fonts/Mokoto.ttf') };
 */
export function getMokotoFontMap(): Record<string, number> {
  return {};
}

/** Whether the real Mokoto font is wired up (flip to true once the file is added + required above). */
export const MOKOTO_AVAILABLE = false;

/**
 * The fontFamily string to use for the wordmark. Resolves to Mokoto when loaded,
 * otherwise the display fallback.
 */
export function wordmarkFamily(): string {
  return MOKOTO_AVAILABLE ? MOKOTO_FAMILY : MOKOTO_FALLBACK;
}

/**
 * Injects an @font-face for web so the wordmark can use Mokoto in the browser.
 *
 * TODO(Mokoto): after adding the file, uncomment the require + style injection below.
 */
export function injectMokotoWebFont(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (!MOKOTO_AVAILABLE) return;
  // const asset = require('@/assets/fonts/Mokoto.ttf') as { uri?: string } | string;
  // const uri = typeof asset === 'string' ? asset : asset?.uri;
  // if (!uri || document.getElementById('mokoto-font-face')) return;
  // const style = document.createElement('style');
  // style.id = 'mokoto-font-face';
  // style.textContent = `@font-face{font-family:'${MOKOTO_FAMILY}';src:url('${uri}');font-display:swap;}`;
  // document.head.appendChild(style);
}
