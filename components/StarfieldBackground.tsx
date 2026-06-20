import { useEffect, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { Canvas, Circle, Fill, Group, Blur } from '@shopify/react-native-skia';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

function rand(i: number): number {
  let h = 2166136261 ^ i;
  h = Math.imul(h, 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

export interface StarfieldBackgroundProps {
  /** "drift" = slowly drifting blurred field (gateway); "dust" = sparse faint twinkle (void). */
  variant?: 'drift' | 'dust';
  /** Background fill color. */
  background?: string;
}

/**
 * Animated starfield rendered with Skia (native).
 * A non-Skia DOM fallback lives in StarfieldBackground.web.tsx.
 */
export function StarfieldBackground({
  variant = 'drift',
  background = variant === 'dust' ? '#0b0c10' : '#07080b',
}: StarfieldBackgroundProps) {
  const { width, height } = useWindowDimensions();
  const clock = useSharedValue(0);

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const duration = variant === 'dust' ? 4000 : 18000;
    clock.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, true);
  });

  if (variant === 'dust') {
    const dust = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: rand(i * 2 + 1) * width,
      y: rand(i * 2 + 2) * height,
      r: 0.5 + rand(i * 2 + 3) * 1.2,
      phase: rand(i * 7 + 5),
    }));
    return (
      <Canvas style={{ position: 'absolute', width, height }}>
        <Fill color={background} />
        {dust.map((d) => (
          <Twinkle key={d.id} d={d} clock={clock} />
        ))}
      </Canvas>
    );
  }

  const stars = Array.from({ length: 70 }, (_, i) => ({
    id: i,
    x: rand(i * 3 + 1) * width,
    y: rand(i * 3 + 2) * height,
    r: 0.6 + rand(i * 3 + 3) * 2.2,
  }));

  return (
    <Canvas style={{ position: 'absolute', width, height }}>
      <Fill color={background} />
      <Group>
        <Blur blur={2} />
        {stars.map((s) => (
          <DriftStar key={s.id} s={s} drift={clock} index={s.id} />
        ))}
      </Group>
    </Canvas>
  );
}

function Twinkle({
  d,
  clock,
}: {
  d: { id: number; x: number; y: number; r: number; phase: number };
  clock: SharedValue<number>;
}) {
  const opacity = useDerivedValue(
    () => 0.08 + 0.3 * Math.abs(Math.sin((clock.value + d.phase) * Math.PI)),
  );
  return <Circle cx={d.x} cy={d.y} r={d.r} color="#CFE0FF" opacity={opacity} />;
}

function DriftStar({
  s,
  drift,
  index,
}: {
  s: { id: number; x: number; y: number; r: number };
  drift: SharedValue<number>;
  index: number;
}) {
  const cy = useDerivedValue(() => s.y + drift.value * (10 + (index % 5) * 4));
  const opacity = useDerivedValue(() => 0.2 + 0.5 * Math.abs(Math.sin((drift.value + index) * 2)));
  return <Circle cx={s.x} cy={cy} r={s.r} color="#CFE0FF" opacity={opacity} />;
}
