import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/** Web fallback spark pulse using animated Views (no Skia). */
export function SparkPulse() {
  const pulse = useSharedValue(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    pulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  });

  const glowStyle = useAnimatedStyle(() => {
    const r = 30 + pulse.value * 16;
    return {
      width: r * 2,
      height: r * 2,
      borderRadius: r,
      opacity: 0.35 + pulse.value * 0.35,
      marginLeft: -r,
      marginTop: -r,
    };
  });

  return (
    <View style={{ width: 140, height: 140, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[{ position: 'absolute', left: 70, top: 70, backgroundColor: '#45F3FF' }, glowStyle]}
      />
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' }} />
    </View>
  );
}
