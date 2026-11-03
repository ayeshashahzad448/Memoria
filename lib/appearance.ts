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

/** Colour tokens that High contrast replaces. Values match the defaults in global.css. */
const NORMAL_COLORS = {
  '--muted': '#8B93B8',
  '--border': 'rgba(255, 255, 255, 0.1)',
  '--separator': 'rgba(255, 255, 255, 0.08)',
  '--field-border': 'rgba(255, 255, 255, 0.12)',
  '--color-secondary': '#8B93B8',
  '--color-glass-border': 'rgba(255, 255, 255, 0.1)',
};

const HIGH_CONTRAST_COLORS = {
  '--muted': '#D3D8EE',
  '--border': 'rgba(255, 255, 255, 0.34)',
  '--separator': 'rgba(255, 255, 255, 0.3)',
  '--field-border': 'rgba(255, 255, 255, 0.42)',
  '--color-secondary': '#D3D8EE',
  '--color-glass-border': 'rgba(255, 255, 255, 0.34)',
};

/**
 * Push the Text size and High contrast settings into the theme. Anything styled with a
 * named size (text-sm, text-xl...) or a theme colour (text-muted, border-glass-border...)
 * follows; values hard-coded in a component do not.
 */
export function applyAppearance(settings: Pick<AppSettings, 'textSize' | 'highContrast'>): void {
  const scale = TEXT_SCALE[settings.textSize];
  const variables: Record<string, string> = {
    ...(settings.highContrast ? HIGH_CONTRAST_COLORS : NORMAL_COLORS),
  };
  for (const [name, px] of Object.entries(FONT_SIZES_PX)) {
    variables[`--text-${name}`] = `${(px * scale).toFixed(2)}px`;
  }
  Uniwind.updateCSSVariables('dark', variables);
}

/** Apply the saved settings now and again whenever they change. Returns a cleanup function. */
export function startAppearanceSync(): () => void {
  applyAppearance(useMemoria.getState().settings);
  return useMemoria.subscribe((state, prev) => {
    const next = state.settings;
    if (
      next.textSize !== prev.settings.textSize ||
      next.highContrast !== prev.settings.highContrast
    ) {
      applyAppearance(next);
    }
  });
}
