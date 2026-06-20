import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { View } from 'react-native';

import { colorFor } from '@/lib/memoria';
import type { StarIgnitionProps } from './StarIgnition';

const PROTOSTAR = '#FF5A3C';

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

/** Web fallback stellar ignition using animated Views (no Skia). */
export function StarIgnition({ progress, twinkleClock, colorKey, size = 260 }: StarIgnitionProps) {
  const trueColor = colorFor(colorKey).hex;
  const c = size / 2;

  const haloStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const contract = Math.min(p / 0.5, 1);
    const stable = Math.max(0, (p - 0.5) / 0.5);
    const d = Math.abs(p - 0.5);
    const flash = Math.max(0, 1 - d / 0.16);
    const a = Math.sin(twinkleClock.value * 0.7 * Math.PI * 2);
    const b = Math.sin(twinkleClock.value * 1.2 * Math.PI * 2);
    const twinkle = Math.pow((a * 0.7 + b * 0.3 + 1) / 2, 1.4);
    const r = 86 - contract * 40 + twinkle * stable * 4 + flash * 30;
    return {
      width: r * 2,
      height: r * 2,
      borderRadius: r,
      marginLeft: -r,
      marginTop: -r,
      backgroundColor: mixHex(PROTOSTAR, trueColor, stable),
      opacity: 0.28 + contract * 0.12 + flash * 0.5,
    };
  });

  const bloomStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const stable = Math.max(0, (p - 0.5) / 0.5);
    const d = Math.abs(p - 0.5);
    const flash = Math.max(0, 1 - d / 0.16);
    const r = 10 + stable * 12 + flash * 40;
    return {
      width: r * 2,
      height: r * 2,
      borderRadius: r,
      marginLeft: -r,
      marginTop: -r,
      backgroundColor: mixHex('#FFD9B0', '#FFFFFF', stable),
      opacity: 0.35 + stable * 0.4 + flash * 0.6,
    };
  });

  const coreStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const stable = Math.max(0, (p - 0.5) / 0.5);
    const d = Math.abs(p - 0.5);
    const flash = Math.max(0, 1 - d / 0.16);
    const a = Math.sin(twinkleClock.value * 0.7 * Math.PI * 2);
    const b = Math.sin(twinkleClock.value * 1.2 * Math.PI * 2);
    const twinkle = Math.pow((a * 0.7 + b * 0.3 + 1) / 2, 1.4);
    const r = (6 + stable * 10 + flash * 18) * (0.96 + twinkle * 0.06 * stable);
    return {
      width: r * 2,
      height: r * 2,
      borderRadius: r,
      marginLeft: -r,
      marginTop: -r,
      opacity: 0.55 + stable * 0.45,
    };
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', left: c, top: c }, haloStyle]} />
      <Animated.View style={[{ position: 'absolute', left: c, top: c }, bloomStyle]} />
      <Animated.View
        style={[{ position: 'absolute', left: c, top: c, backgroundColor: '#FFFFFF' }, coreStyle]}
      />
    </View>
  );
}
