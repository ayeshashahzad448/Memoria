import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  createAnimatedComponent,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colorFor, radiusForText } from '@/lib/memoria';
import { mixHex, sparklePathData, twinkleAt } from '@/lib/sparkle';
import type { StarPreviewProps } from './StarPreview';

const AnimatedPath = createAnimatedComponent(Path);

function sparkleLen(radius: number, clock: number): number {
  'worklet';
  return Math.min(54, 14 + radius * 1.9) * (1 + twinkleAt(clock) * 0.05);
}

/** Web fallback live star preview using animated Views (no Skia). */
export function StarPreview({ story, title, colorKey }: StarPreviewProps) {
  const text = story.length > 0 ? story : title;
  const targetR = radiusForText(text);
  const r = useSharedValue(targetR);
  const pulse = useSharedValue(0);
  const color = colorFor(colorKey).hex;

  useEffect(() => {
    r.value = withSpring(targetR, { damping: 14, stiffness: 120 });
  }, [targetR, r]);

  const pulseStarted = useRef(false);
  useEffect(() => {
    if (pulseStarted.current) return;
    pulseStarted.current = true;
    pulse.value = withRepeat(withTiming(6, { duration: 15000, easing: Easing.linear }), -1, false);
  });

  const haloStyle = useAnimatedStyle(() => {
    const a = Math.sin(pulse.value * 0.7 * Math.PI * 2);
    const b = Math.sin(pulse.value * 1.2 * Math.PI * 2);
    const twinkle = Math.pow((a * 0.7 + b * 0.3 + 1) / 2, 1.4);
    const gr = r.value + 16 + twinkle * 3;
    return {
      width: gr * 2,
      height: gr * 2,
      borderRadius: gr,
      marginLeft: -gr,
      marginTop: -gr,
      opacity: 0.34 + twinkle * 0.18,
    };
  });

  const coreStyle = useAnimatedStyle(() => {
    const cr = Math.max(r.value * 0.28, 3.5);
    return {
      width: cr * 2,
      height: cr * 2,
      borderRadius: cr,
      marginLeft: -cr,
      marginTop: -cr,
    };
  });

  // Four-point sparkle that grows with the story, tinted by the chosen emotion.
  const tint = mixHex('#FFFFFF', color, 0.7);
  const glowProps = useAnimatedProps(() => ({
    d: sparklePathData(80, 60, sparkleLen(r.value, pulse.value)),
    fill: tint,
    opacity: 0.5,
  }));
  const mainProps = useAnimatedProps(() => ({
    d: sparklePathData(80, 60, sparkleLen(r.value, pulse.value)),
    fill: tint,
  }));
  const diagonalProps = useAnimatedProps(() => ({
    d: sparklePathData(80, 60, sparkleLen(r.value, pulse.value) * 0.5, Math.PI / 4),
    fill: '#FFFFFF',
    opacity: 0.7,
  }));

  return (
    <View style={{ width: 160, height: 120, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          { position: 'absolute', left: 80, top: 60, backgroundColor: color, filter: 'blur(14px)' },
          haloStyle,
        ]}
      />
      <Svg
        width={160}
        height={120}
        style={{ position: 'absolute', left: 0, top: 0, filter: 'blur(6px)' }}
      >
        <AnimatedPath animatedProps={glowProps} />
      </Svg>
      <Svg width={160} height={120} style={{ position: 'absolute', left: 0, top: 0 }}>
        <AnimatedPath animatedProps={diagonalProps} />
        <AnimatedPath animatedProps={mainProps} />
      </Svg>
      <Animated.View
        style={[{ position: 'absolute', left: 80, top: 60, backgroundColor: '#FFFFFF' }, coreStyle]}
      />
    </View>
  );
}
