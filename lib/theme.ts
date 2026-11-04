import { useUniwind } from 'uniwind';

/**
 * Colours for places that can't use a className: icon `color` props, inline styles,
 * gradients. They mirror the tokens in global.css, so a screen's classNames and its
 * inline colours always agree. Read them with `usePalette()`, which follows the current
 * theme (including a `ScopedTheme` that pins part of the app to dark).
 */
export interface Palette {
  isDark: boolean;
  /** Page background. */
  bg: string;
  /** Deepest background, used behind starfields. */
  bgDeep: string;
  /** Primary text. */
  text: string;
  /** Secondary text and icons. */
  muted: string;
  /** Unselected tabs and other de-emphasised controls. */
  inactive: string;
  /** Hint text inside inputs. */
  placeholder: string;
  /** Brand colour for icons, highlights and links. */
  accent: string;
  /** Text and icons drawn on top of the accent colour. */
  onAccent: string;
  danger: string;
  /** Amber for warnings and highlights that are safe to use as text or a thin line. */
  warning: string;
  /**
   * A star or emotion colour adjusted until it reads as text or an icon (4.5:1) on this
   * theme's background. Fills, dots and glows should keep the original colour.
   */
  readable: (hex: string) => string;
  /** The primary text colour at the given opacity, e.g. for hairlines and subtle fills. */
  fg: (alpha: number) => string;
  /** The accent colour at the given opacity. */
  accentA: (alpha: number) => string;
}

const rgba = (rgb: string, alpha: number) => `rgba(${rgb}, ${alpha})`;

const channel = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1, 7), 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function mixTowards(hex: string, target: string, t: number): string {
  const from = parseInt(hex.slice(1, 7), 16);
  const to = parseInt(target.slice(1, 7), 16);
  const lerp = (shift: number) =>
    Math.round(((from >> shift) & 255) * (1 - t) + ((to >> shift) & 255) * t);
  const packed = (1 << 24) | (lerp(16) << 16) | (lerp(8) << 8) | lerp(0);
  return `#${packed.toString(16).slice(1).toUpperCase()}`;
}

/** Move `hex` towards white (dark themes) or black (light themes) until it reaches `min` on `bg`. */
function readableOn(hex: string, bg: string, min: number): string {
  const target = luminance(bg) > 0.5 ? '#000000' : '#FFFFFF';
  for (let t = 0; t <= 1.0001; t += 0.04) {
    const candidate = mixTowards(hex, target, t);
    if (contrastRatio(candidate, bg) >= min) return candidate;
  }
  return target;
}

export const DARK: Palette = {
  isDark: true,
  bg: '#0C0E14',
  bgDeep: '#080A10',
  text: '#F4F1EA',
  muted: '#8B93B8',
  inactive: '#7B84A8',
  placeholder: '#7C8AA0',
  accent: '#A5B4FC',
  onAccent: '#0C0E14',
  danger: '#FF2A6D',
  warning: '#FFC75F',
  readable: (hex) => readableOn(hex, '#1A1D26', 4.5),
  fg: (alpha) => rgba('255, 255, 255', alpha),
  accentA: (alpha) => rgba('165, 180, 252', alpha),
};

export const LIGHT: Palette = {
  isDark: false,
  bg: '#FFF6EC',
  bgDeep: '#FFEADB',
  text: '#2A1B3D',
  muted: '#6E5A7E',
  inactive: '#7A6B8A',
  placeholder: '#7A6B8A',
  accent: '#7C3AED',
  onAccent: '#FFFFFF',
  danger: '#C2255C',
  warning: '#B45309',
  readable: (hex) => readableOn(hex, '#FFF6EC', 4.5),
  fg: (alpha) => rgba('42, 27, 61', alpha),
  accentA: (alpha) => rgba('124, 58, 237', alpha),
};

/** The palette for the current theme. Re-renders when the theme changes. */
export function usePalette(): Palette {
  const { theme } = useUniwind();
  return theme === 'light' ? LIGHT : DARK;
}
