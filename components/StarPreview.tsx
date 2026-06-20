import { useEffect, useRef } from 'react';
import { Canvas, Circle, Blur } from '@shopify/react-native-skia';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colorFor, radiusForText } from '@/lib/memoria';
import type { StarColorKey } from '@/lib/types';

export interface StarPreviewProps {
  story: string;
  title: string;
  colorKey: StarColorKey;
}

/** Live, dynamically-sized star preview rendered with Skia (native). */
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
    pulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  });

  const glowR = useDerivedValue(() => r.value + 14 + pulse.value * 10);
  const glowOpacity = useDerivedValue(() => 0.4 + pulse.value * 0.25);
  const coreR = useDerivedValue(() => Math.max(r.value, 4));
  const pinR = useDerivedValue(() => Math.max(r.value * 0.32, 2));

  return (
    <Canvas style={{ width: 160, height: 120 }}>
      <Circle cx={80} cy={60} r={glowR} color={color} opacity={glowOpacity}>
        <Blur blur={14} />
      </Circle>
      <Circle cx={80} cy={60} r={coreR} color={color} />
      <Circle cx={80} cy={60} r={pinR} color="#FFFFFF" />
    </Canvas>
  );
}
