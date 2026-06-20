// oxlint-disable react/style-prop-object -- Skia uses string style props (stroke/fill)
import { Canvas, Circle, Blur, Group } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { colorFor } from '@/lib/memoria';
import type { StarColorKey } from '@/lib/types';

export interface StarIgnitionProps {
  /** 0 = cold protostar, ~0.5 = ignition flash, 1 = stable star. */
  progress: SharedValue<number>;
  /** Continuous twinkle clock (ramps 0..6, non-wrapping). */
  twinkleClock: SharedValue<number>;
  colorKey: StarColorKey;
  size?: number;
}

const PROTOSTAR = '#FF5A3C'; // cool, diffuse red-orange protostar

/** Blend two hex colors on the UI thread (worklet-safe). */
function mixHex(a: string, b: string, t: number): string {
  'worklet';
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

/**
 * Stellar ignition: a protostar (large, cool, diffuse red glow) gravitationally
 * contracts, flashes bright white at fusion ignition, then stabilizes into the
 * memory's true emotion color with a steady twinkling core. Rendered with Skia.
 */
export function StarIgnition({ progress, twinkleClock, colorKey, size = 260 }: StarIgnitionProps) {
  const c = size / 2;
  const trueColor = colorFor(colorKey).hex;

  // Phase shaping: contraction 0..0.45, flash peak ~0.5, stabilize 0.55..1.
  const contract = useDerivedValue(() => {
    const p = Math.min(progress.value / 0.5, 1);
    return p; // 0 (huge) -> 1 (compact)
  });

  const flash = useDerivedValue(() => {
    // Sharp white flash centered at p=0.5.
    const d = Math.abs(progress.value - 0.5);
    return Math.max(0, 1 - d / 0.16);
  });

  const stable = useDerivedValue(() => Math.max(0, (progress.value - 0.5) / 0.5));

  const twinkle = useDerivedValue(() => {
    const a = Math.sin(twinkleClock.value * 0.7 * Math.PI * 2);
    const b = Math.sin(twinkleClock.value * 1.2 * Math.PI * 2);
    return Math.pow((a * 0.7 + b * 0.3 + 1) / 2, 1.4);
  });

  // Outer emotion halo: red & huge while a protostar, contracts and recolors.
  const haloColor = useDerivedValue(() => mixHex(PROTOSTAR, trueColor, stable.value));
  const haloR = useDerivedValue(() => {
    const big = 86 - contract.value * 40; // 86 -> 46
    return big + twinkle.value * stable.value * 4 + flash.value * 30;
  });
  const haloOpacity = useDerivedValue(() => 0.28 + contract.value * 0.12 + flash.value * 0.5);

  // Bloom / core grows in as it stabilizes; flash makes it blaze.
  const coreColor = useDerivedValue(() => mixHex('#FFD9B0', '#FFFFFF', stable.value));
  const bloomR = useDerivedValue(() => 10 + stable.value * 12 + flash.value * 40);
  const bloomOpacity = useDerivedValue(() => 0.35 + stable.value * 0.4 + flash.value * 0.6);
  const coreR = useDerivedValue(
    () => (6 + stable.value * 10 + flash.value * 18) * (0.96 + twinkle.value * 0.06 * stable.value),
  );
  const coreOpacity = useDerivedValue(() => 0.55 + stable.value * 0.45);

  return (
    <Canvas style={{ width: size, height: size }}>
      {/* Emotion halo */}
      <Group opacity={haloOpacity}>
        <Circle cx={c} cy={c} r={haloR} color={haloColor}>
          <Blur blur={26} />
        </Circle>
      </Group>
      {/* Warm bloom */}
      <Group opacity={bloomOpacity}>
        <Circle cx={c} cy={c} r={bloomR} color={coreColor}>
          <Blur blur={6} />
        </Circle>
      </Group>
      {/* Bright core */}
      <Group opacity={coreOpacity}>
        <Circle cx={c} cy={c} r={coreR} color="#FFFFFF" />
      </Group>
    </Canvas>
  );
}
