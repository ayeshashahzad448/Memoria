import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Text } from 'heroui-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Hand, Plus, Type } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { colorFor } from '@/lib/memoria';

const ACCENT = colorFor('cyan').hex;

interface Step {
  icon: LucideIcon;
  title: string;
  body: string;
  /** Where the spotlight hint sits: bottom (the + button) or center. */
  anchor: 'bottom' | 'center';
}

const STEPS: Step[] = [
  {
    icon: Plus,
    title: 'Anchor a memory',
    body: 'Tap the Cosmos button below to add an Echo — a memory that becomes a star in your cosmos.',
    anchor: 'bottom',
  },
  {
    icon: Type,
    title: 'Your words shape the star',
    body: 'Type your story. The more you write, the larger and brighter your star becomes.',
    anchor: 'center',
  },
  {
    icon: Hand,
    title: 'Explore the void',
    body: 'Pinch to zoom and drag to explore. Your universe expands as your memories grow.',
    anchor: 'center',
  },
];

/**
 * First-run guided coachmark shown over the Cosmos screen. Darkens the
 * background and walks the user through the three core interactions, closing
 * the gulf of evaluation before they create their first star.
 */
export function CosmosTutorial({ onDone, onCreate }: { onDone: () => void; onCreate: () => void }) {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;
  const Icon = step.icon;

  const next = () => {
    if (isLast) {
      onDone();
      // Defer navigation a frame so the overlay can dismiss and the store
      // update settles before the create screen is pushed.
      requestAnimationFrame(onCreate);
    } else setIndex((i) => i + 1);
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      className="absolute inset-0"
    >
      {/* Scrim */}
      <Pressable className="absolute inset-0 bg-black/75" onPress={next} />

      {/* Spotlight hint exactly over the + button */}
      {step.anchor === 'bottom' && (
        <View
          className="pb-safe-offset-24 absolute inset-x-0 bottom-0 items-center"
          pointerEvents="none"
        >
          <View
            className="h-16 w-16 rounded-full border-2"
            style={{
              borderColor: ACCENT,
              shadowColor: ACCENT,
              shadowOpacity: 0.9,
              shadowRadius: 20,
            }}
          />
        </View>
      )}

      {/* Card */}
      <View className="absolute inset-x-0 top-1/2 -mt-24 px-7">
        <GlassCard contentClassName="gap-3.5 p-6">
          <View
            className="h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: `${ACCENT}1F` }}
          >
            <Icon size={24} color={ACCENT} />
          </View>
          <Text className="text-starlight font-display text-xl font-bold">{step.title}</Text>
          <Text className="text-muted text-sm leading-6">{step.body}</Text>

          <View className="mt-1 flex-row items-center justify-between">
            <View className="flex-row gap-1.5">
              {STEPS.map((s, i) => (
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
                <Button.Label>{isLast ? 'Create your first star' : 'Next'}</Button.Label>
              </Button>
            </View>
          </View>
        </GlassCard>
      </View>
    </Animated.View>
  );
}
