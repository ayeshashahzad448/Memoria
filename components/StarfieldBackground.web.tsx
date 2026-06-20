import { useEffect, useRef } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { StarfieldBackgroundProps } from './StarfieldBackground';

function rand(i: number): number {
  let h = 2166136261 ^ i;
  h = Math.imul(h, 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * Web fallback for StarfieldBackground. Skia's CanvasKit setup does not bundle
 * for web here, so the starfield is rendered with plain animated Views.
 */
export function StarfieldBackground({
  variant = 'drift',
  background = variant === 'dust' ? '#0b0c10' : '#07080b',
}: StarfieldBackgroundProps) {
  const { width, height } = useWindowDimensions();
  const count = variant === 'dust' ? 40 : 70;

  const stars = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: rand(i * 3 + 1) * width,
    y: rand(i * 3 + 2) * height,
    r: variant === 'dust' ? 0.5 + rand(i * 2 + 3) * 1.2 : 0.6 + rand(i * 3 + 3) * 2.2,
    phase: rand(i * 7 + 5),
  }));

  return (
    <View style={{ position: 'absolute', width, height, backgroundColor: background }}>
      {stars.map((s, i) => (
        <TwinkleDot key={s.id} s={s} index={i} variant={variant} />
      ))}
      {variant === 'drift'
        ? Array.from({ length: 3 }, (_, i) => (
            <ShootingStar
              key={`sh-${i}`}
              startX={rand(i * 11 + 21) * width}
              startY={rand(i * 11 + 22) * height * 0.5}
              length={120 + rand(i * 11 + 23) * 90}
              delay={rand(i * 11 + 24)}
            />
          ))
        : null}
    </View>
  );
}

function ShootingStar({
  startX,
  startY,
  length,
  delay,
}: {
  startX: number;
  startY: number;
  length: number;
  delay: number;
}) {
  const t = useSharedValue(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    t.value = withDelay(
      delay * 6000,
      withRepeat(withTiming(1, { duration: 7000, easing: Easing.linear }), -1, false),
    );
  });

  const dx = length;
  const dy = length * 0.6;
  const angle = Math.atan2(dy, dx);
  const tailLen = Math.hypot(dx, dy) * 0.22;

  const style = useAnimatedStyle(() => {
    const p = t.value % 1;
    const prog = p < 0.12 ? p / 0.12 : -1;
    if (prog < 0)
      return { opacity: 0, transform: [{ translateX: startX }, { translateY: startY }] };
    return {
      opacity: 0.6 * Math.sin(prog * Math.PI),
      transform: [{ translateX: startX + prog * dx }, { translateY: startY + prog * dy }],
    };
  });

  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, style]}>
      <View
        style={{
          width: tailLen,
          height: 1.6,
          borderRadius: 1,
          backgroundColor: '#FFFFFF',
          transform: [{ rotate: `${angle}rad` }],
        }}
      />
    </Animated.View>
  );
}

function TwinkleDot({
  s,
  index,
  variant,
}: {
  s: { x: number; y: number; r: number; phase: number };
  index: number;
  variant: 'drift' | 'dust';
}) {
  const clock = useSharedValue(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const duration = variant === 'dust' ? 4000 : 18000;
    clock.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, true);
  });

  const style = useAnimatedStyle(() => {
    const opacity =
      variant === 'dust'
        ? 0.08 + 0.3 * Math.abs(Math.sin((clock.value + s.phase) * Math.PI))
        : 0.2 + 0.5 * Math.abs(Math.sin((clock.value + index) * 2));
    const translateY = variant === 'dust' ? 0 : clock.value * (10 + (index % 5) * 4);
    return { opacity, transform: [{ translateY }] };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: s.x,
          top: s.y,
          width: s.r * 2,
          height: s.r * 2,
          borderRadius: s.r,
          backgroundColor: '#CFE0FF',
        },
        style,
      ]}
    />
  );
}
