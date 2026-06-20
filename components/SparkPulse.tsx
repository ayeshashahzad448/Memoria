import { useEffect, useRef } from 'react';
import { Canvas, Circle } from '@shopify/react-native-skia';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/** A small pulsing invitation spark, rendered with Skia (native). */
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

  const glow = useDerivedValue(() => 30 + pulse.value * 16);
  const glowOpacity = useDerivedValue(() => 0.35 + pulse.value * 0.35);

  return (
    <Canvas style={{ width: 140, height: 140 }}>
      <Circle cx={70} cy={70} r={glow} color="#45F3FF" opacity={glowOpacity} />
      <Circle cx={70} cy={70} r={10} color="#FFFFFF" />
    </Canvas>
  );
}
