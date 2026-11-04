import { useEffect, useRef } from 'react';
import { Canvas, Circle, Blur, Path } from '@shopify/react-native-skia';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colorFor, radiusForText } from '@/lib/memoria';
import { mixHex, sparklePathData } from '@/lib/sparkle';
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
  const haloOpacity = useDerivedValue(() => 0.3 + twinkle.value * 0.16);
  const coreR = useDerivedValue(() => Math.max(r.value * 0.28, 3.5));
  const coreOpacity = useDerivedValue(() => 0.85 + twinkle.value * 0.15);

  // Four-point sparkle that grows with the story, tinted by the chosen emotion.
  const sparkleLen = useDerivedValue(
    () => Math.min(54, 14 + r.value * 1.9) * (1 + twinkle.value * 0.05),
  );
  const sparkleMain = useDerivedValue(() => sparklePathData(80, 60, sparkleLen.value));
  const sparkleDiagonal = useDerivedValue(() =>
    sparklePathData(80, 60, sparkleLen.value * 0.5, Math.PI / 4),
  );
  const tint = mixHex('#FFFFFF', color, 0.7);

  return (
    <Canvas style={{ width: 160, height: 120 }}>
      {/* Colored halo (emotion) */}
      <Circle cx={80} cy={60} r={haloR} color={color} opacity={haloOpacity}>
        <Blur blur={16} />
      </Circle>
      {/* Soft glow under the sparkle */}
      <Path path={sparkleMain} color={tint} opacity={0.5}>
        <Blur blur={6} />
      </Path>
      <Path path={sparkleDiagonal} color="#FFFFFF" opacity={0.7} />
      <Path path={sparkleMain} color={tint} />
      {/* Bright white core */}
      <Circle cx={80} cy={60} r={coreR} color="#FFFFFF" opacity={coreOpacity} />
    </Canvas>
  );
}
