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
}

const TABS: TabDef[] = [
  { name: 'index', label: 'Cosmos', icon: Orbit },
  { name: 'constellations', label: 'Groups', icon: Sparkles },
  { name: 'throwbacks', label: 'Throwbacks', icon: History },
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
  return (
    <View
      className="border-glass-border absolute inset-x-0 bottom-0 overflow-hidden border-t"
      style={{
        shadowColor: ACCENT,
        shadowOpacity: 0.12,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: -4 },
      }}
    >
      <BlurView
        intensity={Platform.OS === 'android' ? 30 : 50}
        tint="dark"
        className="absolute inset-0"
      />
      <View className="bg-void/70 absolute inset-0" />
      <View className="pb-safe-offset-2 flex-row items-stretch px-2 pt-2.5">
        {state.routes.map((route, index) => {
          const tab = TABS.find((t) => t.name === route.name);
          if (!tab) return null;
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
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              className="flex-1 items-center justify-center gap-1 py-1"
              hitSlop={4}
            >
              <Icon size={22} color={focused ? ACCENT : MUTED} strokeWidth={focused ? 2.4 : 1.8} />
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
