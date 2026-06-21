import { Tabs, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Text } from 'heroui-native';
import { Orbit, Plus, Search, History, User, UsersRound } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { colorFor } from '@/lib/memoria';
import { PERSONAL_COSMOS, useMemoria } from '@/lib/store';
import { TabBarTour } from '@/components/TabBarTour';
import type { TabSpotlight } from '@/components/TabBarTour';

const ACCENT = colorFor('cyan').hex;
const MUTED = '#94A3B8';

interface TabDef {
  name: string;
  label: string;
  icon: LucideIcon;
  /** The central, emphasized primary view. */
  center?: boolean;
}

// Left-to-right order: Recall, Shared, Cosmos (center, primary), Search, Profile.
const TABS: TabDef[] = [
  { name: 'throwbacks', label: 'Recall', icon: History },
  { name: 'shared', label: 'Shared', icon: UsersRound },
  { name: 'index', label: 'Cosmos', icon: Orbit, center: true },
  { name: 'search', label: 'Search', icon: Search },
  { name: 'profile', label: 'Profile', icon: User },
];

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#0b0c10' } }}
    >
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />
      ))}
    </Tabs>
  );
}

function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const hasSeenTutorial = useMemoria((s) => s.hasSeenTutorial);
  const hasSeenTabTour = useMemoria((s) => s.hasSeenTabTour);
  const completeTabTour = useMemoria((s) => s.completeTabTour);
  const demoTourActive = useMemoria((s) => s.demoTourActive);
  const starCount = useMemoria((s) => s.stars.length);
  const memoryPanelOpen = useMemoria((s) => s.memoryPanelOpen);
  const [tourVisible, setTourVisible] = useState(false);
  // Measured screen-space centers of each tab icon (by slot index), so the
  // tour spotlight aligns exactly with the real tabs across devices.
  const [spotlights, setSpotlights] = useState<TabSpotlight[]>([]);
  const spotlightsRef = useRef<TabSpotlight[]>([]);

  const reportSpotlight = useCallback((slot: number, s: TabSpotlight) => {
    const prev = spotlightsRef.current[slot];
    if (prev && Math.abs(prev.centerX - s.centerX) < 1 && Math.abs(prev.centerY - s.centerY) < 1) {
      return;
    }
    const nextArr = spotlightsRef.current.slice();
    nextArr[slot] = s;
    spotlightsRef.current = nextArr;
    setSpotlights(nextArr);
  }, []);

  const activeRouteName = state.routes[state.index]?.name;
  const onCosmos = activeRouteName === 'index';

  // Once the user has created their first star, walk them through the tab bar
  // a single time. We wait until they have closed the freshly created memory's
  // floating detail panel (memoryPanelOpen === false) so the tour starts only
  // after they press exit, never interrupting the memory they just made.
  useEffect(() => {
    if (
      demoTourActive ||
      hasSeenTabTour ||
      !hasSeenTutorial ||
      !onCosmos ||
      starCount === 0 ||
      memoryPanelOpen
    ) {
      if (demoTourActive) setTourVisible(false);
      return undefined;
    }
    const t = setTimeout(() => setTourVisible(true), 600);
    return () => clearTimeout(t);
  }, [demoTourActive, hasSeenTabTour, hasSeenTutorial, onCosmos, starCount, memoryPanelOpen]);

  const dismissTour = () => {
    setTourVisible(false);
    completeTabTour();
  };

  // Render in the requested visual order regardless of route registration order.
  const ordered = TABS.map((tab) => {
    const index = state.routes.findIndex((r) => r.name === tab.name);
    return { tab, route: state.routes[index], index };
  }).filter((o) => o.route);

  return (
    <>
      {tourVisible && <TabBarTour onDone={dismissTour} spotlights={spotlights} />}
      <View
        className="border-glass-border absolute inset-x-0 bottom-0 border-t"
        style={{
          shadowColor: ACCENT,
          shadowOpacity: 0.1,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: -4 },
        }}
      >
        {/* Clipped frosted-glass background. Kept separate so the raised center
          button can overflow above the bar without being cut off. */}
        <View style={StyleSheet.absoluteFill} className="overflow-hidden">
          <BlurView
            intensity={Platform.OS === 'android' ? 28 : 44}
            tint="dark"
            className="absolute inset-0"
          />
          <View className="bg-void/70 absolute inset-0" />
        </View>
        <View className="pb-safe-offset-4 flex-row items-end px-2 pt-2.5">
          {ordered.map(({ tab, route, index }, slot) => {
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
                  onMeasure={(s) => reportSpotlight(slot, s)}
                  onCreate={() =>
                    router.push({
                      pathname: '/star/create',
                      params: { cosmosId: PERSONAL_COSMOS },
                    })
                  }
                />
              );
            }

            return (
              <TabButton
                key={route.key}
                label={tab.label}
                icon={Icon}
                focused={focused}
                onPress={onPress}
                onMeasure={(s) => reportSpotlight(slot, s)}
              />
            );
          })}
        </View>
      </View>
    </>
  );
}

function TabButton({
  label,
  icon: Icon,
  focused,
  onPress,
  onMeasure,
}: {
  label: string;
  icon: LucideIcon;
  focused: boolean;
  onPress: () => void;
  onMeasure: (s: TabSpotlight) => void;
}) {
  const iconRef = useRef<View>(null);
  const measure = useCallback(() => {
    iconRef.current?.measureInWindow((x, y, w, h) => {
      if (w > 0 || h > 0) onMeasure({ centerX: x + w / 2, centerY: y + h / 2 });
    });
  }, [onMeasure]);

  return (
    <Pressable onPress={onPress} className="flex-1 items-center justify-end gap-1 pb-1" hitSlop={4}>
      <View ref={iconRef} onLayout={measure}>
        <Icon size={21} color={focused ? ACCENT : MUTED} strokeWidth={focused ? 2.2 : 1.7} />
      </View>
      <Text
        className="text-[10px] font-medium"
        style={{ color: focused ? ACCENT : MUTED }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CenterTab({
  label,
  icon: Icon,
  focused,
  onPress,
  onCreate,
  onMeasure,
}: {
  label: string;
  icon: LucideIcon;
  focused: boolean;
  onPress: () => void;
  onCreate: () => void;
  onMeasure: (s: TabSpotlight) => void;
}) {
  // When Cosmos is the active tab, the center button becomes a create (+)
  // affordance so adding a memory is always one tap away from the cosmos.
  const DisplayIcon = focused ? Plus : Icon;
  const ringRef = useRef<View>(null);
  const measure = useCallback(() => {
    ringRef.current?.measureInWindow((x, y, w, h) => {
      if (w > 0 || h > 0) onMeasure({ centerX: x + w / 2, centerY: y + h / 2 });
    });
  }, [onMeasure]);

  return (
    <Pressable
      onPress={focused ? onCreate : onPress}
      hitSlop={6}
      className="flex-1 items-center justify-end gap-1"
      style={{ marginTop: -26 }}
    >
      <View
        ref={ringRef}
        onLayout={measure}
        className="h-[62px] w-[62px] items-center justify-center rounded-full border"
        style={{
          backgroundColor: '#0B0C10',
          borderColor: focused ? `${ACCENT}80` : 'rgba(255,255,255,0.12)',
          shadowColor: ACCENT,
          shadowOpacity: focused ? 0.7 : 0.45,
          shadowRadius: focused ? 18 : 11,
          shadowOffset: { width: 0, height: 0 },
        }}
      >
        <View
          className="h-[52px] w-[52px] items-center justify-center rounded-full"
          style={{ backgroundColor: focused ? `${ACCENT}26` : 'rgba(255,255,255,0.05)' }}
        >
          <DisplayIcon
            size={26}
            color={focused ? ACCENT : '#C8D0F5'}
            strokeWidth={focused ? 2.6 : 1.9}
          />
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
