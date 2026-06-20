// oxlint-disable react/style-prop-object -- Skia uses string style props (stroke/fill)
import { Canvas, Circle, Blur, Group, Path, Skia } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { colorFor } from '@/lib/memoria';
import type { StarColorKey } from '@/lib/types';

export interface StarDissolveProps {
  /** 0 = intact star, ~0.32 = flare/shatter, 1 = fully dissolved/gone. */
  progress: SharedValue<number>;
  /** Continuous twinkle clock (ramps 0..6, non-wrapping). */
  twinkleClock: SharedValue<number>;
  colorKey: StarColorKey;
  size?: number;
}

const SHARD_COUNT = 26;

// Deterministic shard seeds: outward angle, distance, size, spin speed.
const SHARDS = Array.from({ length: SHARD_COUNT }, (_, i) => {
  const a = (i / SHARD_COUNT) * Math.PI * 2 + (i % 7) * 0.21;
  const dist = 120 + ((i * 71) % 110);
  const r = 1.2 + ((i * 17) % 6) / 2.4;
  const spin = ((i * 29) % 9) / 9 - 0.5;
  const lag = ((i * 13) % 5) / 18; // staggered launch
  return { a, dist, r, spin, lag };
});

/**
 * A memory star dissolving away. The star tightens and flares white, then
 * shatters: glowing shards burst outward and fade, while the bright core
 * streaks off-screen like a shooting star and vanishes. Rendered with Skia.
 */
export function StarDissolve({ progress, twinkleClock, colorKey, size = 280 }: StarDissolveProps) {
  const c = size / 2;
  const trueColor = colorFor(colorKey).hex;

  // Phase shaping:
  //   0..0.28   tighten + brighten (gathering before the break)
  //   ~0.32     flare + shatter
  //   0.32..1   shards fly out + fade, core streaks away
  const tighten = useDerivedValue(() => Math.min(progress.value / 0.32, 1));

  const flare = useDerivedValue(() => {
    const d = Math.abs(progress.value - 0.32);
    return Math.max(0, 1 - d / 0.1);
  });

  const burst = useDerivedValue(() => Math.max(0, (progress.value - 0.32) / 0.68));

  const twinkle = useDerivedValue(() => {
    const a = Math.sin(twinkleClock.value * 0.7 * Math.PI * 2);
    const b = Math.sin(twinkleClock.value * 1.2 * Math.PI * 2);
    return Math.pow((a * 0.7 + b * 0.3 + 1) / 2, 1.4);
  });

  // Emotion halo: shrinks as it tightens, briefly flares, then fades on burst.
  const haloR = useDerivedValue(() => {
    const base = 70 - tighten.value * 22 + flare.value * 30;
    return base + twinkle.value * 3;
  });
  const haloOpacity = useDerivedValue(() => {
    const pre = 0.28 + tighten.value * 0.18 + flare.value * 0.5;
    return pre * Math.max(0, 1 - burst.value * 1.5);
  });

  // Core streaks away (shooting-star) after the flare.
  const streakX = useDerivedValue(() => {
    const e = burst.value * burst.value; // ease-in
    return c + e * size * 0.62;
  });
  const streakY = useDerivedValue(() => {
    const e = burst.value * burst.value;
    return c - e * size * 0.42;
  });
  const coreR = useDerivedValue(() => {
    const grow = 5 + tighten.value * 5 + flare.value * 18;
    return grow * Math.max(0, 1 - burst.value * 1.3);
  });
  const coreOpacity = useDerivedValue(() => {
    const pre = 0.7 + tighten.value * 0.3 + flare.value * 0.3;
    return Math.min(1, pre) * Math.max(0, 1 - burst.value * 1.15);
  });

  // Shooting-star tail trailing behind the streaking core.
  const tailPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const x = streakX.value;
    const y = streakY.value;
    const len = 40 + burst.value * 90;
    // tail points back toward origin (opposite the travel direction)
    const dx = x - c;
    const dy = y - c;
    const mag = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    p.moveTo(x, y);
    p.lineTo(x - (dx / mag) * len, y - (dy / mag) * len);
    return p;
  });
  const tailOpacity = useDerivedValue(
    () => Math.min(1, burst.value * 3) * Math.max(0, 1 - burst.value * 1.2) * 0.8,
  );

  // Flash ring at the moment of shatter.
  const ringR = useDerivedValue(() => 14 + burst.value * 130);
  const ringOpacity = useDerivedValue(
    () => Math.max(0, 1 - burst.value * 1.6) * Math.min(1, flare.value + burst.value * 2) * 0.45,
  );

  return (
    <Canvas style={{ width: size, height: size }}>
      {/* Emotion halo (fades as the star breaks) */}
      <Group opacity={haloOpacity}>
        <Circle cx={c} cy={c} r={haloR} color={trueColor}>
          <Blur blur={26} />
        </Circle>
      </Group>

      {/* Shockwave ring at shatter */}
      <Group opacity={ringOpacity}>
        <Circle cx={c} cy={c} r={ringR} color="#FFFFFF" style="stroke" strokeWidth={2}>
          <Blur blur={3} />
        </Circle>
      </Group>

      {/* Bursting shards */}
      {SHARDS.map((s) => (
        <Shard key={`${s.a.toFixed(4)}-${s.dist}`} c={c} seed={s} burst={burst} color={trueColor} />
      ))}

      {/* Shooting-star tail */}
      <Group opacity={tailOpacity}>
        <Path path={tailPath} color="#CFE3FF" style="stroke" strokeWidth={2.4}>
          <Blur blur={3} />
        </Path>
      </Group>

      {/* Streaking core */}
      <Group opacity={coreOpacity}>
        <Circle cx={streakX} cy={streakY} r={coreR} color="#FFFFFF">
          <Blur blur={2} />
        </Circle>
      </Group>
    </Canvas>
  );
}

function Shard({
  c,
  seed,
  burst,
  color,
}: {
  c: number;
  seed: { a: number; dist: number; r: number; spin: number; lag: number };
  burst: SharedValue<number>;
  color: string;
}) {
  const pos = useDerivedValue(() => {
    const t = Math.max(0, (burst.value - seed.lag) / (1 - seed.lag));
    const ease = 1 - (1 - t) * (1 - t); // ease-out
    const radius = ease * seed.dist;
    const angle = seed.a + ease * seed.spin * Math.PI;
    return { x: c + Math.cos(angle) * radius, y: c + Math.sin(angle) * radius };
  });
  const cx = useDerivedValue(() => pos.value.x);
  const cy = useDerivedValue(() => pos.value.y);
  const opacity = useDerivedValue(() => {
    const t = Math.max(0, (burst.value - seed.lag) / (1 - seed.lag));
    // Pop in at launch, fade out as it travels.
    return Math.min(1, t * 4) * Math.max(0, 1 - t * 1.15) * 0.9;
  });

  return (
    <Group opacity={opacity}>
      <Circle cx={cx} cy={cy} r={seed.r} color={color}>
        <Blur blur={1.4} />
      </Circle>
    </Group>
  );
}
