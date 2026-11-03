import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from 'heroui-native';

import { usePalette } from '@/lib/theme';

const OPTIONS = [
  { id: 'signup', label: 'Sign up', href: '/auth' },
  { id: 'login', label: 'Log in', href: '/login' },
] as const;

/** The Sign up / Log in switch shown above both account forms. The app always opens on Sign up. */
export function AuthSwitch({ active }: { active: (typeof OPTIONS)[number]['id'] }) {
  const router = useRouter();
  const colors = usePalette();

  return (
    <View
      accessibilityRole="tablist"
      className="mb-4 flex-row rounded-full p-1"
      style={{ backgroundColor: colors.fg(0.07) }}
    >
      {OPTIONS.map((option) => {
        const selected = option.id === active;
        return (
          <Pressable
            key={option.id}
            onPress={() => {
              if (!selected) router.replace(option.href);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            className="flex-1 items-center rounded-full py-2.5"
            style={{ backgroundColor: selected ? colors.accent : 'transparent' }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: selected ? colors.onAccent : colors.muted }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
