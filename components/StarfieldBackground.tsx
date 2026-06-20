/* eslint-disable react/style-prop-object -- Skia uses string style props (e.g. style="stroke"). */
import { useEffect, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { Canvas, Circle, Fill, Group, Blur, Line } from '@shopify/react-native-skia';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
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

  const shooters = Array.from({ length: 3 }, (_, i) => ({
    id: i,
    startX: rand(i * 11 + 21) * width,
    startY: rand(i * 11 + 22) * height * 0.5,
    length: 120 + rand(i * 11 + 23) * 90,
    delay: rand(i * 11 + 24),
    duration: 5,
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
      {shooters.map((sh) => (
        <ShootingStar key={`sh-${sh.id}`} sh={sh} />
      ))}
    </Canvas>
  );
}

function ShootingStar({
  sh,
}: {
  sh: { startX: number; startY: number; length: number; delay: number };
}) {
  const t = useSharedValue(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // Each shooter streaks quickly, then waits a long gap before repeating.
    t.value = withDelay(
      sh.delay * 6000,
      withRepeat(withTiming(1, { duration: 7000, easing: Easing.linear }), -1, false),
    );
  });

  // Streak occupies only the first ~12% of the cycle; rest is dark gap.
  const progress = useDerivedValue(() => {
    const p = t.value % 1;
    return p < 0.12 ? p / 0.12 : -1;
  });
  const dx = sh.length;
  const dy = sh.length * 0.6;
  const headX = useDerivedValue(() => sh.startX + progress.value * dx);
  const headY = useDerivedValue(() => sh.startY + progress.value * dy);
  const tailX = useDerivedValue(() => headX.value - dx * 0.22);
  const tailY = useDerivedValue(() => headY.value - dy * 0.22);
  const opacity = useDerivedValue(() => {
    const p = progress.value;
    if (p < 0) return 0;
    return 0.5 * Math.sin(p * Math.PI);
  });

  return (
    <Group opacity={opacity}>
      <ShootingLine x1={tailX} y1={tailY} x2={headX} y2={headY} />
    </Group>
  );
}

function ShootingLine({
  x1,
  y1,
  x2,
  y2,
}: {
  x1: SharedValue<number>;
  y1: SharedValue<number>;
  x2: SharedValue<number>;
  y2: SharedValue<number>;
}) {
  const p1 = useDerivedValue(() => ({ x: x1.value, y: y1.value }));
  const p2 = useDerivedValue(() => ({ x: x2.value, y: y2.value }));
  return (
    <Line p1={p1} p2={p2} color="#FFFFFF" style="stroke" strokeWidth={1.6} strokeCap="round" />
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
