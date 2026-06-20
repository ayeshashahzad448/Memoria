import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { View } from 'react-native';

import { colorFor } from '@/lib/memoria';
import type { StarIgnitionProps } from './StarIgnition';

const PROTOSTAR = '#FF5A3C';
const DUST_COUNT = 22;

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

const DUST = Array.from({ length: DUST_COUNT }, (_, i) => {
  const a = (i / DUST_COUNT) * Math.PI * 2 + (i % 5) * 0.37;
  const startR = 70 + ((i * 53) % 60);
  const speed = 1 + ((i * 17) % 7) / 7;
  const r = 1.1 + ((i * 13) % 5) / 3;
  return { a, startR, speed, r };
});

/** Web fallback cinematic stellar ignition using animated Views (no Skia). */
export function StarIgnition({ progress, twinkleClock, colorKey, size = 280 }: StarIgnitionProps) {
  const trueColor = colorFor(colorKey).hex;
  const c = size / 2;

  const haloStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const contract = Math.min(p / 0.5, 1);
    const stable = Math.max(0, (p - 0.5) / 0.5);
    const d = Math.abs(p - 0.5);
    const flash = Math.max(0, 1 - d / 0.13);
    const a = Math.sin(twinkleClock.value * 0.7 * Math.PI * 2);
    const b = Math.sin(twinkleClock.value * 1.2 * Math.PI * 2);
    const twinkle = Math.pow((a * 0.7 + b * 0.3 + 1) / 2, 1.4);
    const r = 92 - contract * 46 + twinkle * stable * 4 + flash * 34;
    return {
      width: r * 2,
      height: r * 2,
      borderRadius: r,
      marginLeft: -r,
      marginTop: -r,
      backgroundColor: mixHex(PROTOSTAR, trueColor, stable),
      opacity: 0.26 + contract * 0.12 + flash * 0.5,
    };
  });

  const ringStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const stable = Math.max(0, (p - 0.5) / 0.5);
    const d = Math.abs(p - 0.5);
    const flash = Math.max(0, 1 - d / 0.13);
    const r = 12 + stable * 110;
    const opacity = Math.max(0, 1 - stable * 1.4) * Math.min(1, flash + stable * 2) * 0.5;
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

  const bloomStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const stable = Math.max(0, (p - 0.5) / 0.5);
    const d = Math.abs(p - 0.5);
    const flash = Math.max(0, 1 - d / 0.13);
    const r = 9 + stable * 12 + flash * 46;
    return {
      width: r * 2,
      height: r * 2,
      borderRadius: r,
      marginLeft: -r,
      marginTop: -r,
      backgroundColor: mixHex('#FFD9B0', '#FFFFFF', stable),
      opacity: 0.32 + stable * 0.42 + flash * 0.6,
    };
  });

  const coreStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const stable = Math.max(0, (p - 0.5) / 0.5);
    const d = Math.abs(p - 0.5);
    const flash = Math.max(0, 1 - d / 0.13);
    const a = Math.sin(twinkleClock.value * 0.7 * Math.PI * 2);
    const b = Math.sin(twinkleClock.value * 1.2 * Math.PI * 2);
    const twinkle = Math.pow((a * 0.7 + b * 0.3 + 1) / 2, 1.4);
    const r = (5 + stable * 10 + flash * 20) * (0.96 + twinkle * 0.06 * stable);
    return {
      width: r * 2,
      height: r * 2,
      borderRadius: r,
      marginLeft: -r,
      marginTop: -r,
      opacity: 0.5 + stable * 0.5,
    };
  });

  const spikeH = useAnimatedStyle(() => {
    const p = progress.value;
    const d = Math.abs(p - 0.5);
    const flash = Math.max(0, 1 - d / 0.13);
    const stable = Math.max(0, (p - 0.5) / 0.5);
    const len = 26 + flash * 78;
    return {
      width: len * 2,
      height: 1.4,
      marginLeft: -len,
      marginTop: -0.7,
      opacity: flash * 0.6 + stable * 0.12,
    };
  });

  const spikeV = useAnimatedStyle(() => {
    const p = progress.value;
    const d = Math.abs(p - 0.5);
    const flash = Math.max(0, 1 - d / 0.13);
    const stable = Math.max(0, (p - 0.5) / 0.5);
    const len = 26 + flash * 78;
    return {
      width: 1.4,
      height: len * 2,
      marginLeft: -0.7,
      marginTop: -len,
      opacity: flash * 0.6 + stable * 0.12,
    };
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {DUST.map((seed) => (
        <DustMote
          key={`${seed.a.toFixed(4)}-${seed.startR}`}
          c={c}
          seed={seed}
          progress={progress}
          twinkleClock={twinkleClock}
        />
      ))}
      <Animated.View style={[{ position: 'absolute', left: c, top: c }, ringStyle]} />
      <Animated.View style={[{ position: 'absolute', left: c, top: c }, haloStyle]} />
      <Animated.View style={[{ position: 'absolute', left: c, top: c }, bloomStyle]} />
      <Animated.View
        style={[{ position: 'absolute', left: c, top: c, backgroundColor: '#FFFFFF' }, spikeH]}
      />
      <Animated.View
        style={[{ position: 'absolute', left: c, top: c, backgroundColor: '#FFFFFF' }, spikeV]}
      />
      <Animated.View
        style={[{ position: 'absolute', left: c, top: c, backgroundColor: '#FFFFFF' }, coreStyle]}
      />
    </View>
  );
}

function DustMote({
  c,
  seed,
  progress,
  twinkleClock,
}: {
  c: number;
  seed: { a: number; startR: number; speed: number; r: number };
  progress: { value: number };
  twinkleClock: { value: number };
}) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const t = Math.min(p / 0.5, 1);
    const stable = Math.max(0, (p - 0.5) / 0.5);
    const ease = t * t * (3 - 2 * t);
    const radius = seed.startR * (1 - ease) + 2 * ease;
    const angle = seed.a + ease * seed.speed * Math.PI * 2.2 + twinkleClock.value * 0.05;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const opacity = Math.max(0, 1 - stable * 1.6) * (0.15 + 0.55 * (1 - t));
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
      style={[{ position: 'absolute', left: c, top: c, backgroundColor: '#FFCDA8' }, style]}
    />
  );
}
