import { Pressable, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';

import { usePalette } from '@/lib/theme';

/** Zoom buttons for the cosmos, for people who can't pinch (mouse, trackpad, motor needs). */
export function ZoomControls({ onZoom }: { onZoom: (dir: 1 | -1) => void }) {
  const colors = usePalette();
  const buttons = [
    { dir: 1 as const, label: 'Zoom in', Icon: Plus },
    { dir: -1 as const, label: 'Zoom out', Icon: Minus },
  ];
  return (
    <View pointerEvents="box-none" className="absolute right-4 gap-3" style={{ bottom: 132 }}>
      {buttons.map(({ dir, label, Icon }) => (
        <Pressable
          key={label}
          onPress={() => onZoom(dir)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={label}
          className="bg-background border-accent/60 h-11 w-11 items-center justify-center rounded-full border"
        >
          <Icon size={22} color={colors.accent} strokeWidth={2.2} />
        </Pressable>
      ))}
    </View>
  );
}
