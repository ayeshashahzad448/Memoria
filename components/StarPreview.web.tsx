import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colorFor, radiusForText } from '@/lib/memoria';
import type { StarPreviewProps } from './StarPreview';

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
    pulse.value = withRepeat(withTiming(6, { duration: 6400, easing: Easing.linear }), -1, false);
  });

  const glowStyle = useAnimatedStyle(() => {
    const a = Math.sin(pulse.value * 1.6 * Math.PI * 2);
    const b = Math.sin(pulse.value * 3.4 * Math.PI * 2);
    const twinkle = Math.pow((a * 0.65 + b * 0.35 + 1) / 2, 2.2);
    const gr = r.value + 14 + twinkle * 3;
    return {
      width: gr * 2,
      height: gr * 2,
      borderRadius: gr,
      marginLeft: -gr,
      marginTop: -gr,
      opacity: 0.32 + twinkle * 0.3,
    };
  });

  const coreStyle = useAnimatedStyle(() => {
    const cr = Math.max(r.value, 4);
    return {
      width: cr * 2,
      height: cr * 2,
      borderRadius: cr,
      marginLeft: -cr,
      marginTop: -cr,
    };
  });

  const pinStyle = useAnimatedStyle(() => {
    const pr = Math.max(r.value * 0.32, 2);
    return {
      width: pr * 2,
      height: pr * 2,
      borderRadius: pr,
      marginLeft: -pr,
      marginTop: -pr,
    };
  });

  return (
    <View style={{ width: 160, height: 120, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[{ position: 'absolute', left: 80, top: 60, backgroundColor: color }, glowStyle]}
      />
      <Animated.View
        style={[{ position: 'absolute', left: 80, top: 60, backgroundColor: color }, coreStyle]}
      />
      <Animated.View
        style={[{ position: 'absolute', left: 80, top: 60, backgroundColor: '#FFFFFF' }, pinStyle]}
      />
    </View>
  );
}
