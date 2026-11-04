import Animated, {
  createAnimatedComponent,
  useAnimatedProps,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colorFor } from '@/lib/memoria';
import { mixHex, sparklePathData, twinkleAt } from '@/lib/sparkle';
import type { StarIgnitionProps } from './StarIgnition';

const PROTOSTAR = '#FF5A3C';
const DUST_COUNT = 22;

const AnimatedPath = createAnimatedComponent(Path);

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

  // Same four-point sparkle as the native Skia version, drawn with SVG paths.
  const sparkleState = (p: number, clock: number) => {
    'worklet';
    const contract = Math.min(p / 0.5, 1);
    const stable = Math.max(0, (p - 0.5) / 0.5);
    const flash = Math.max(0, 1 - Math.abs(p - 0.5) / 0.13);
    const len = (24 + stable * 30 + flash * 70) * (1 + twinkleAt(clock) * 0.06 * stable);
    const opacity = Math.min(1, contract * 0.18 + flash + stable * 0.92);
    return { len, opacity, color: mixHex('#FFFFFF', trueColor, Math.min(1, stable * 0.85)) };
  };

  const glowProps = useAnimatedProps(() => {
    const s = sparkleState(progress.value, twinkleClock.value);
    return { d: sparklePathData(c, c, s.len), fill: s.color, opacity: s.opacity * 0.55 };
  });
  const mainProps = useAnimatedProps(() => {
    const s = sparkleState(progress.value, twinkleClock.value);
    return { d: sparklePathData(c, c, s.len), fill: s.color, opacity: s.opacity };
  });
  const diagonalProps = useAnimatedProps(() => {
    const s = sparkleState(progress.value, twinkleClock.value);
    return {
      d: sparklePathData(c, c, s.len * 0.5, Math.PI / 4),
      fill: '#FFFFFF',
      opacity: s.opacity * 0.7,
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
      <Animated.View
        style={[{ position: 'absolute', left: c, top: c, filter: 'blur(22px)' }, haloStyle]}
      />
      <Animated.View
        style={[{ position: 'absolute', left: c, top: c, filter: 'blur(5px)' }, bloomStyle]}
      />
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', left: 0, top: 0, filter: 'blur(7px)' }}
      >
        <AnimatedPath animatedProps={glowProps} />
      </Svg>
      <Svg width={size} height={size} style={{ position: 'absolute', left: 0, top: 0 }}>
        <AnimatedPath animatedProps={diagonalProps} />
        <AnimatedPath animatedProps={mainProps} />
      </Svg>
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
