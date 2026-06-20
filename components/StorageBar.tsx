import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { FREE_LIMIT_BYTES, WARN_RATIO, formatBytes } from '@/lib/storage';

const ACCENT = '#45F3FF';
const WARNING = '#FFC75F';
const FULL = '#FF2A6D';

interface StorageBarProps {
  /** Bytes currently used. */
  used: number;
  /** When true, capacity is treated as unlimited (premium). */
  unlimited?: boolean;
}

/** Minimalist glowing capacity bar that fits the cosmos aesthetic. */
export function StorageBar({ used, unlimited = false }: StorageBarProps) {
  const ratio = unlimited ? 0 : Math.min(used / FREE_LIMIT_BYTES, 1);
  const atLimit = !unlimited && used >= FREE_LIMIT_BYTES;
  const warning = !unlimited && ratio >= WARN_RATIO;
  const color = atLimit ? FULL : warning ? WARNING : ACCENT;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(unlimited ? 1 : ratio, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [ratio, unlimited, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View className="bg-void-deep h-2.5 w-full overflow-hidden rounded-full">
      <Animated.View
        style={[
          {
            height: '100%',
            borderRadius: 999,
            backgroundColor: unlimited ? ACCENT : color,
            shadowColor: unlimited ? ACCENT : color,
            shadowOpacity: 0.9,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
          },
          fillStyle,
        ]}
      />
    </View>
  );
}

export function storageLabel(used: number, unlimited: boolean): string {
  if (unlimited) return `${formatBytes(used)} used · Unlimited`;
  return `${formatBytes(used)} of ${formatBytes(FREE_LIMIT_BYTES)} used`;
}
