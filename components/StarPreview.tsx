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
    pulse.value = withRepeat(withTiming(6, { duration: 15000, easing: Easing.linear }), -1, false);
  });

  // Gentle, slow twinkle in brightness while size stays steady.
  const twinkle = useDerivedValue(() => {
    const a = Math.sin(pulse.value * 0.7 * Math.PI * 2);
    const b = Math.sin(pulse.value * 1.2 * Math.PI * 2);
    return Math.pow((a * 0.7 + b * 0.3 + 1) / 2, 1.4);
  });

  const haloR = useDerivedValue(() => r.value + 16 + twinkle.value * 3);
  const haloOpacity = useDerivedValue(() => 0.34 + twinkle.value * 0.18);
  const bloomR = useDerivedValue(() => Math.max(r.value * 0.62, 5) + 3);
  const coreR = useDerivedValue(() => Math.max(r.value * 0.62, 5));
  const coreOpacity = useDerivedValue(() => 0.85 + twinkle.value * 0.15);

  return (
    <Canvas style={{ width: 160, height: 120 }}>
      {/* Colored halo (emotion) */}
      <Circle cx={80} cy={60} r={haloR} color={color} opacity={haloOpacity}>
        <Blur blur={16} />
      </Circle>
      {/* White-blue bloom */}
      <Circle cx={80} cy={60} r={bloomR} color="#CFE3FF" opacity={coreOpacity}>
        <Blur blur={3} />
      </Circle>
      {/* Bright white core */}
      <Circle cx={80} cy={60} r={coreR} color="#FFFFFF" opacity={coreOpacity} />
    </Canvas>
  );
}
