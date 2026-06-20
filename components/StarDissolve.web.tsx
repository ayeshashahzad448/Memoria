import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { View } from 'react-native';

import { colorFor } from '@/lib/memoria';
import type { StarDissolveProps } from './StarDissolve';

const SHARD_COUNT = 26;

const SHARDS = Array.from({ length: SHARD_COUNT }, (_, i) => {
  const a = (i / SHARD_COUNT) * Math.PI * 2 + (i % 7) * 0.21;
  const dist = 120 + ((i * 71) % 110);
  const r = 1.2 + ((i * 17) % 6) / 2.4;
  const spin = ((i * 29) % 9) / 9 - 0.5;
  const lag = ((i * 13) % 5) / 18;
  return { a, dist, r, spin, lag };
});

/** Web fallback star-dissolve using animated Views (no Skia). */
export function StarDissolve({ progress, twinkleClock, colorKey, size = 280 }: StarDissolveProps) {
  const trueColor = colorFor(colorKey).hex;
  const c = size / 2;

  const haloStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const tighten = Math.min(p / 0.32, 1);
    const d = Math.abs(p - 0.32);
    const flare = Math.max(0, 1 - d / 0.1);
    const burst = Math.max(0, (p - 0.32) / 0.68);
    const a = Math.sin(twinkleClock.value * 0.7 * Math.PI * 2);
    const b = Math.sin(twinkleClock.value * 1.2 * Math.PI * 2);
    const twinkle = Math.pow((a * 0.7 + b * 0.3 + 1) / 2, 1.4);
    const r = 70 - tighten * 22 + flare * 30 + twinkle * 3;
    const opacity = (0.28 + tighten * 0.18 + flare * 0.5) * Math.max(0, 1 - burst * 1.5);
    return {
      width: r * 2,
      height: r * 2,
      borderRadius: r,
      marginLeft: -r,
      marginTop: -r,
      backgroundColor: trueColor,
      opacity,
    };
  });

  const ringStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const d = Math.abs(p - 0.32);
    const flare = Math.max(0, 1 - d / 0.1);
    const burst = Math.max(0, (p - 0.32) / 0.68);
    const r = 14 + burst * 130;
    const opacity = Math.max(0, 1 - burst * 1.6) * Math.min(1, flare + burst * 2) * 0.45;
    return {
      width: r * 2,
      height: r * 2,
      borderRadius: r,
      marginLeft: -r,
      marginTop: -r,
      borderWidth: 2,
      borderColor: '#FFFFFF',
      opacity,
    };
  });

  const coreStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const tighten = Math.min(p / 0.32, 1);
    const d = Math.abs(p - 0.32);
    const flare = Math.max(0, 1 - d / 0.1);
    const burst = Math.max(0, (p - 0.32) / 0.68);
    const e = burst * burst;
    const x = e * size * 0.62;
    const y = -e * size * 0.42;
    const r = (5 + tighten * 5 + flare * 18) * Math.max(0, 1 - burst * 1.3);
    const opacity = Math.min(1, 0.7 + tighten * 0.3 + flare * 0.3) * Math.max(0, 1 - burst * 1.15);
    return {
      width: r * 2,
      height: r * 2,
      borderRadius: r,
      marginLeft: -r,
      marginTop: -r,
      transform: [{ translateX: x }, { translateY: y }],
      opacity,
    };
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', left: c, top: c }, ringStyle]} />
      <Animated.View style={[{ position: 'absolute', left: c, top: c }, haloStyle]} />
      {SHARDS.map((seed) => (
        <ShardMote
          key={`${seed.a.toFixed(4)}-${seed.dist}`}
          c={c}
          seed={seed}
          progress={progress}
          color={trueColor}
        />
      ))}
      <Animated.View
        style={[{ position: 'absolute', left: c, top: c, backgroundColor: '#FFFFFF' }, coreStyle]}
      />
    </View>
  );
}

function ShardMote({
  c,
  seed,
  progress,
  color,
}: {
  c: number;
  seed: { a: number; dist: number; r: number; spin: number; lag: number };
  progress: { value: number };
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const burst = Math.max(0, (progress.value - 0.32) / 0.68);
    const t = Math.max(0, (burst - seed.lag) / (1 - seed.lag));
    const ease = 1 - (1 - t) * (1 - t);
    const radius = ease * seed.dist;
    const angle = seed.a + ease * seed.spin * Math.PI;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const opacity = Math.min(1, t * 4) * Math.max(0, 1 - t * 1.15) * 0.9;
    return {
      width: seed.r * 2,
      height: seed.r * 2,
      borderRadius: seed.r,
      marginLeft: -seed.r,
      marginTop: -seed.r,
      transform: [{ translateX: x }, { translateY: y }],
      opacity,
    };
  });
  return (
    <Animated.View
      style={[{ position: 'absolute', left: c, top: c, backgroundColor: color }, style]}
    />
  );
}
