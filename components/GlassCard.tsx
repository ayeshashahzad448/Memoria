import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { Platform } from 'react-native';

import { cn } from '@/lib/utils';

interface GlassCardProps extends ViewProps {
  children: ReactNode;
  /** Extra classes for the inner content wrapper. */
  contentClassName?: string;
  intensity?: number;
}

/**
 * Frosted-glass panel with a faint glowing outline. Used for all UI overlays.
 * Falls back to a translucent surface where blur is unavailable.
 */
export function GlassCard({
  children,
  className,
  contentClassName,
  intensity = 40,
  ...rest
}: GlassCardProps) {
  return (
    <View
      className={cn('border-glass-border overflow-hidden rounded-2xl border', className)}
      style={{
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#45F3FF',
        shadowOpacity: 0.1,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 0 },
      }}
      {...rest}
    >
      <BlurView
        intensity={Platform.OS === 'android' ? Math.min(intensity, 26) : Math.min(intensity, 38)}
        tint="dark"
        className="absolute inset-0"
      />
      <View className="bg-glass absolute inset-0" />
      <View className={cn('p-5', contentClassName)}>{children}</View>
    </View>
  );
}
