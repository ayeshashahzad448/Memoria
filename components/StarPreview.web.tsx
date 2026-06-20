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

  const bloomStyle = useAnimatedStyle(() => {
    const br = Math.max(r.value * 0.62, 5) + 3;
    return {
      width: br * 2,
      height: br * 2,
      borderRadius: br,
      marginLeft: -br,
      marginTop: -br,
    };
  });

  const coreStyle = useAnimatedStyle(() => {
    const cr = Math.max(r.value * 0.62, 5);
    return {
      width: cr * 2,
      height: cr * 2,
      borderRadius: cr,
      marginLeft: -cr,
      marginTop: -cr,
    };
  });

  return (
    <View style={{ width: 160, height: 120, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[{ position: 'absolute', left: 80, top: 60, backgroundColor: color }, haloStyle]}
      />
      <Animated.View
        style={[
          { position: 'absolute', left: 80, top: 60, backgroundColor: '#CFE3FF' },
          bloomStyle,
        ]}
      />
      <Animated.View
        style={[{ position: 'absolute', left: 80, top: 60, backgroundColor: '#FFFFFF' }, coreStyle]}
      />
    </View>
  );
}
