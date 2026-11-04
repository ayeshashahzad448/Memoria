import { Uniwind } from 'uniwind';

import { useMemoria } from '@/lib/store';
import type { AppSettings } from '@/lib/types';

/** Tailwind's named text sizes, in px at "Medium". The Text size setting scales these. */
const FONT_SIZES_PX = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

const TEXT_SCALE: Record<AppSettings['textSize'], number> = {
  small: 0.92,
  medium: 1,
  large: 1.18,
};

type Appearance = Pick<AppSettings, 'textSize' | 'highContrast' | 'theme'>;

/** The colour tokens High contrast replaces, per theme. Normal values match global.css. */
const COLORS = {
  dark: {
    normal: {
      '--muted': '#8B93B8',
      '--border': 'rgba(255, 255, 255, 0.1)',
      '--separator': 'rgba(255, 255, 255, 0.08)',
      '--field-border': 'rgba(255, 255, 255, 0.12)',
      '--color-secondary': '#8B93B8',
      '--color-glass-border': 'rgba(255, 255, 255, 0.1)',
    },
    high: {
      '--muted': '#D3D8EE',
      '--border': 'rgba(255, 255, 255, 0.34)',
      '--separator': 'rgba(255, 255, 255, 0.3)',
      '--field-border': 'rgba(255, 255, 255, 0.42)',
      '--color-secondary': '#D3D8EE',
      '--color-glass-border': 'rgba(255, 255, 255, 0.34)',
    },
  },
  light: {
    normal: {
      '--muted': '#6E5A7E',
      '--border': 'rgba(42, 27, 61, 0.14)',
      '--separator': 'rgba(42, 27, 61, 0.1)',
      '--field-border': 'rgba(42, 27, 61, 0.22)',
      '--color-secondary': '#6E5A7E',
      '--color-glass-border': 'rgba(42, 27, 61, 0.14)',
    },
    high: {
      '--muted': '#3B2A52',
      '--border': 'rgba(42, 27, 61, 0.5)',
      '--separator': 'rgba(42, 27, 61, 0.45)',
      '--field-border': 'rgba(42, 27, 61, 0.6)',
      '--color-secondary': '#3B2A52',
      '--color-glass-border': 'rgba(42, 27, 61, 0.5)',
    },
  },
} as const;

/**
 * Push Theme, Text size and High contrast into the theming layer. Anything styled with a
 * named size (text-sm, text-xl...) or a theme colour (text-muted, border-glass-border...)
 * follows; values hard-coded in a component do not.
 */
export function applyAppearance(settings: Appearance): void {
  const scale = TEXT_SCALE[settings.textSize];
  const sizes: Record<string, string> = {};
  for (const [name, px] of Object.entries(FONT_SIZES_PX)) {
    sizes[`--text-${name}`] = `${(px * scale).toFixed(2)}px`;
  }
  for (const theme of ['light', 'dark'] as const) {
    const colors = COLORS[theme][settings.highContrast ? 'high' : 'normal'];
    Uniwind.updateCSSVariables(theme, { ...colors, ...sizes });
  }
  Uniwind.setTheme(settings.theme ?? 'dark');
}

/** Apply the saved settings now and again whenever they change. Returns a cleanup function. */
export function startAppearanceSync(): () => void {
  applyAppearance(useMemoria.getState().settings);
  return useMemoria.subscribe((state, prev) => {
    const next = state.settings;
    if (
      next.textSize !== prev.settings.textSize ||
      next.highContrast !== prev.settings.highContrast ||
      next.theme !== prev.settings.theme
    ) {
      applyAppearance(next);
    }
  });
}
