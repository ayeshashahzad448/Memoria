import { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { Button, Text } from 'heroui-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { History, Plus, Search, User, UsersRound } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { colorFor } from '@/lib/memoria';

const ACCENT = colorFor('cyan').hex;

interface TourStop {
  /** Slot index in the 5-tab bar (left to right). */
  slot: number;
  icon: LucideIcon;
  title: string;
  body: string;
  /** The center Cosmos tab sits raised above the bar. */
  raised?: boolean;
}

// Mirrors the tab order in app/(tabs)/_layout.tsx: Recall, Shared, Cosmos, Search, Profile.
const STOPS: TourStop[] = [
  {
    slot: 0,
    icon: History,
    title: 'Recall',
    body: 'Resurfaces memories from this day in past years and random highlights — a gentle look back.',
  },
  {
    slot: 1,
    icon: UsersRound,
    title: 'Shared',
    body: 'Create shared cosmoses with friends and family, then add memories to them together.',
  },
  {
    slot: 2,
    icon: Plus,
    title: 'Cosmos',
    body: 'Your personal universe of memories. Tap the glowing button here to add a new memory anytime.',
    raised: true,
  },
  {
    slot: 3,
    icon: Search,
    title: 'Search',
    body: 'Find any memory by words, place, date, people tagged, or constellation — then fly to it.',
  },
  {
    slot: 4,
    icon: User,
    title: 'Profile',
    body: 'Your identity, friends, storage, and settings all live here.',
  },
];

const TAB_COUNT = 5;

/**
 * One-time guided walkthrough of the bottom tab bar, shown after the user
 * creates their first star. Dims the screen, points a spotlight at each tab in
 * turn, and explains it in plain language.
 */
export function TabBarTour({ onDone }: { onDone: () => void }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const stop = STOPS[index];
  const isLast = index === STOPS.length - 1;
  const Icon = stop.icon;

  const slotWidth = width / TAB_COUNT;
  const spotlightCenterX = slotWidth * (stop.slot + 0.5);
  const spotSize = stop.raised ? 78 : 60;

  const next = () => {
    if (isLast) onDone();
    else setIndex((i) => i + 1);
  };

  return (
    <Animated.View
      entering={FadeIn.duration(280)}
      exiting={FadeOut.duration(200)}
      className="absolute inset-0"
      style={{ zIndex: 60, elevation: 60 }}
    >
      {/* Tap-anywhere scrim advances the tour. */}
      <Pressable className="absolute inset-0 bg-black/80" onPress={next} />

      {/* Spotlight ring hovering over the highlighted tab. */}
      <Animated.View
        layout={LinearTransition.duration(320)}
        pointerEvents="none"
        className="absolute items-center justify-center rounded-full border-2"
        style={{
          left: spotlightCenterX - spotSize / 2,
          bottom: stop.raised ? 26 : 12,
          width: spotSize,
          height: spotSize,
          borderColor: ACCENT,
          backgroundColor: `${ACCENT}1A`,
          shadowColor: ACCENT,
          shadowOpacity: 0.9,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 0 },
        }}
      >
        <Icon size={stop.raised ? 28 : 22} color={ACCENT} strokeWidth={2.2} />
      </Animated.View>

      {/* Explanation card centered above the bar. */}
      <View className="absolute inset-x-0 px-7" style={{ bottom: 150 }}>
        <Animated.View key={stop.title} entering={FadeIn.duration(260)}>
          <GlassCard contentClassName="gap-3 p-6">
            <View
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: `${ACCENT}1F` }}
            >
              <Icon size={22} color={ACCENT} />
            </View>
            <Text className="text-starlight font-display text-xl font-bold">{stop.title}</Text>
            <Text className="text-muted text-sm leading-6">{stop.body}</Text>

            <View className="mt-1 flex-row items-center justify-between">
              <View className="flex-row gap-1.5">
                {STOPS.map((s, i) => (
                  <View
                    key={s.title}
                    className="h-1.5 rounded-full"
                    style={{
                      width: i === index ? 18 : 6,
                      backgroundColor: i === index ? ACCENT : 'rgba(255,255,255,0.22)',
                    }}
                  />
                ))}
              </View>
              <View className="flex-row items-center gap-2">
                {!isLast && (
                  <Button size="sm" variant="ghost" onPress={onDone}>
                    Skip
                  </Button>
                )}
                <Button size="sm" onPress={next}>
                  <Button.Label>{isLast ? 'Got it' : 'Next'}</Button.Label>
                </Button>
              </View>
            </View>
          </GlassCard>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
