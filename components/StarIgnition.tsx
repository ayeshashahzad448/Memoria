// oxlint-disable react/style-prop-object -- Skia uses string style props (stroke/fill)
import { Canvas, Circle, Blur, Group, Path, Skia } from '@shopify/react-native-skia';
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
const DUST_COUNT = 22;

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

// Deterministic accretion-disk dust seeds (angle, start radius, speed, size).
const DUST = Array.from({ length: DUST_COUNT }, (_, i) => {
  const a = (i / DUST_COUNT) * Math.PI * 2 + (i % 5) * 0.37;
  const startR = 70 + ((i * 53) % 60);
  const speed = 1 + ((i * 17) % 7) / 7; // extra orbital winding
  const r = 1.1 + ((i * 13) % 5) / 3;
  return { a, startR, speed, r };
});

/**
 * Cinematic stellar ignition. A diffuse cool protostar with a swirling accretion
 * disk of dust spirals inward, contracts, flashes white with a shockwave ring and
 * diffraction spikes at fusion ignition, then settles into the memory's true color.
 * Rendered with Skia.
 */
export function StarIgnition({ progress, twinkleClock, colorKey, size = 280 }: StarIgnitionProps) {
  const c = size / 2;
  const trueColor = colorFor(colorKey).hex;

  // Phase shaping (slower beats handled by the driving timing in the screen):
  //   0..0.5  contraction (dust spirals in, protostar shrinks)
  //   ~0.5    fusion flash + shockwave + spikes
  //   0.5..1  stabilize to true color
  const contract = useDerivedValue(() => Math.min(progress.value / 0.5, 1));

  const flash = useDerivedValue(() => {
    const d = Math.abs(progress.value - 0.5);
    return Math.max(0, 1 - d / 0.13);
  });

  const stable = useDerivedValue(() => Math.max(0, (progress.value - 0.5) / 0.5));

  const twinkle = useDerivedValue(() => {
    const a = Math.sin(twinkleClock.value * 0.7 * Math.PI * 2);
    const b = Math.sin(twinkleClock.value * 1.2 * Math.PI * 2);
    return Math.pow((a * 0.7 + b * 0.3 + 1) / 2, 1.4);
  });

  // Outer emotion halo.
  const haloColor = useDerivedValue(() => mixHex(PROTOSTAR, trueColor, stable.value));
  const haloR = useDerivedValue(() => {
    const big = 92 - contract.value * 46; // 92 -> 46
    return big + twinkle.value * stable.value * 4 + flash.value * 34;
  });
  const haloOpacity = useDerivedValue(() => 0.26 + contract.value * 0.12 + flash.value * 0.5);

  // Bloom / core.
  const coreColor = useDerivedValue(() => mixHex('#FFD9B0', '#FFFFFF', stable.value));
  const bloomR = useDerivedValue(() => 9 + stable.value * 12 + flash.value * 46);
  const bloomOpacity = useDerivedValue(() => 0.32 + stable.value * 0.42 + flash.value * 0.6);
  const coreR = useDerivedValue(
    () => (5 + stable.value * 10 + flash.value * 20) * (0.96 + twinkle.value * 0.06 * stable.value),
  );
  const coreOpacity = useDerivedValue(() => 0.5 + stable.value * 0.5);

  // Shockwave ring expanding from ignition.
  const ringR = useDerivedValue(() => 12 + stable.value * 110);
  const ringOpacity = useDerivedValue(() => {
    // Visible only briefly right after the flash, fading as it expands.
    const s = stable.value;
    return Math.max(0, 1 - s * 1.4) * Math.min(1, flash.value + s * 2) * 0.5;
  });

  // Diffraction spikes path (4-point cross), scaled by flash.
  const spikePath = useDerivedValue(() => {
    const len = 26 + flash.value * 78;
    const p = Skia.Path.Make();
    p.moveTo(c - len, c);
    p.lineTo(c + len, c);
    p.moveTo(c, c - len);
    p.lineTo(c, c + len);
    return p;
  });
  const spikeOpacity = useDerivedValue(() => flash.value * 0.6 + stable.value * 0.12);

  return (
    <Canvas style={{ width: size, height: size }}>
      {/* Accretion disk dust spiralling inward during contraction */}
      {DUST.map((d) => (
        <DustMote
          key={`${d.a.toFixed(4)}-${d.startR}`}
          c={c}
          seed={d}
          progress={progress}
          stable={stable}
          twinkleClock={twinkleClock}
        />
      ))}

      {/* Shockwave ring */}
      <Group opacity={ringOpacity}>
        <Circle cx={c} cy={c} r={ringR} color="#FFFFFF" style="stroke" strokeWidth={2}>
          <Blur blur={3} />
        </Circle>
      </Group>

      {/* Emotion halo */}
      <Group opacity={haloOpacity}>
        <Circle cx={c} cy={c} r={haloR} color={haloColor}>
          <Blur blur={28} />
        </Circle>
      </Group>

      {/* Warm bloom */}
      <Group opacity={bloomOpacity}>
        <Circle cx={c} cy={c} r={bloomR} color={coreColor}>
          <Blur blur={6} />
        </Circle>
      </Group>

      {/* Diffraction spikes */}
      <Group opacity={spikeOpacity}>
        <Path path={spikePath} color="#FFFFFF" style="stroke" strokeWidth={1.4}>
          <Blur blur={2} />
        </Path>
      </Group>

      {/* Bright core */}
      <Group opacity={coreOpacity}>
        <Circle cx={c} cy={c} r={coreR} color="#FFFFFF" />
      </Group>
    </Canvas>
  );
}

function DustMote({
  c,
  seed,
  progress,
  stable,
  twinkleClock,
}: {
  c: number;
  seed: { a: number; startR: number; speed: number; r: number };
  progress: SharedValue<number>;
  stable: SharedValue<number>;
  twinkleClock: SharedValue<number>;
}) {
  const pos = useDerivedValue(() => {
    // During contraction (progress 0..0.5) the mote spirals inward and winds.
    const t = Math.min(progress.value / 0.5, 1);
    const ease = t * t * (3 - 2 * t); // smoothstep
    const radius = seed.startR * (1 - ease) + 2 * ease;
    const angle = seed.a + ease * seed.speed * Math.PI * 2.2 + twinkleClock.value * 0.05;
    return {
      x: c + Math.cos(angle) * radius,
      y: c + Math.sin(angle) * radius,
    };
  });
  const cx = useDerivedValue(() => pos.value.x);
  const cy = useDerivedValue(() => pos.value.y);
  // Fade out as it reaches the center / after ignition.
  const opacity = useDerivedValue(() => {
    const t = Math.min(progress.value / 0.5, 1);
    return Math.max(0, 1 - stable.value * 1.6) * (0.15 + 0.55 * (1 - t));
  });

  return (
    <Group opacity={opacity}>
      <Circle cx={cx} cy={cy} r={seed.r} color="#FFCDA8">
        <Blur blur={1.5} />
      </Circle>
    </Group>
  );
}
