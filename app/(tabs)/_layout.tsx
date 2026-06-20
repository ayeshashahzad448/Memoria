import { Tabs } from 'expo-router';
import { Platform, Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Text } from 'heroui-native';
import { Orbit, Search, Sparkles, History, User } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { colorFor } from '@/lib/memoria';

const ACCENT = colorFor('cyan').hex;
const MUTED = '#8C93B8';

interface TabDef {
  name: string;
  label: string;
  icon: LucideIcon;
  /** The central, emphasized primary view. */
  center?: boolean;
}

// Left-to-right order requested by the user. Cosmos sits in the middle as the
// raised, glowing primary view.
const TABS: TabDef[] = [
  { name: 'throwbacks', label: 'Throwbacks', icon: History },
  { name: 'constellations', label: 'Groups', icon: Sparkles },
  { name: 'index', label: 'Cosmos', icon: Orbit, center: true },
  { name: 'search', label: 'Search', icon: Search },
  { name: 'profile', label: 'Profile', icon: User },
];

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#0b0e1f' } }}
    >
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />
      ))}
    </Tabs>
  );
}

function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  // Render in the requested visual order regardless of route registration order.
  const ordered = TABS.map((tab) => {
    const index = state.routes.findIndex((r) => r.name === tab.name);
    return { tab, route: state.routes[index], index };
  }).filter((o) => o.route);

  return (
    <View
      className="border-glass-border absolute inset-x-0 bottom-0 overflow-hidden border-t"
      style={{
        shadowColor: ACCENT,
        shadowOpacity: 0.1,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: -4 },
      }}
    >
      <BlurView
        intensity={Platform.OS === 'android' ? 28 : 44}
        tint="dark"
        className="absolute inset-0"
      />
      <View className="bg-void/60 absolute inset-0" />
      <View className="pb-safe-offset-1.5 flex-row items-end px-2 pt-2">
        {ordered.map(({ tab, route, index }) => {
          const focused = state.index === index;
          const Icon = tab.icon;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          if (tab.center) {
            return (
              <CenterTab
                key={route.key}
                label={tab.label}
                icon={Icon}
                focused={focused}
                onPress={onPress}
              />
            );
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              className="flex-1 items-center justify-end gap-1 pb-1"
              hitSlop={4}
            >
              <Icon size={21} color={focused ? ACCENT : MUTED} strokeWidth={focused ? 2.2 : 1.7} />
              <Text
                className="text-[10px] font-medium"
                style={{ color: focused ? ACCENT : MUTED }}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function CenterTab({
  label,
  icon: Icon,
  focused,
  onPress,
}: {
  label: string;
  icon: LucideIcon;
  focused: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      className="flex-1 items-center justify-end gap-1"
      style={{ marginTop: -22 }}
    >
      <View
        className="border-glass-border h-[58px] w-[58px] items-center justify-center rounded-full border"
        style={{
          backgroundColor: 'rgba(11,14,31,0.85)',
          shadowColor: ACCENT,
          shadowOpacity: focused ? 0.65 : 0.4,
          shadowRadius: focused ? 16 : 10,
          shadowOffset: { width: 0, height: 0 },
        }}
      >
        <View
          className="h-[50px] w-[50px] items-center justify-center rounded-full"
          style={{ backgroundColor: focused ? `${ACCENT}26` : 'rgba(255,255,255,0.04)' }}
        >
          <Icon size={26} color={focused ? ACCENT : '#C8D0F5'} strokeWidth={focused ? 2.4 : 1.9} />
        </View>
      </View>
      <Text
        className="text-[10px] font-semibold"
        style={{ color: focused ? ACCENT : '#C8D0F5' }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}
