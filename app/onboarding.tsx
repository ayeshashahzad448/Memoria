import { useCallback, useEffect, useState } from 'react';
import { ScopedTheme } from 'uniwind';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { Button, Text } from 'heroui-native';
import Animated, { Easing, FadeIn, FadeOut } from 'react-native-reanimated';

import { StarfieldBackground } from '@/components/StarfieldBackground';
import { useMemoria } from '@/lib/store';

type Phase = 'black' | 'empty' | 'action';

/**
 * First-run narrative shown right after sign up. Starts on an almost-black,
 * empty void — "it seems a bit empty in here" fades in subtly, lingers, then
 * slowly fades into an invitation to create the first memory.
 */
function OnboardingScreen() {
  const router = useRouter();
  const completeOnboarding = useMemoria((s) => s.completeOnboarding);
  const [phase, setPhase] = useState<Phase>('black');

  useEffect(() => {
    // A beat of pure emptiness, then the line breathes in, holds, and dissolves
    // into the call to create the first memory.
    const toEmpty = setTimeout(() => setPhase('empty'), 1200);
    const toAction = setTimeout(() => setPhase('action'), 6200);
    return () => {
      clearTimeout(toEmpty);
      clearTimeout(toAction);
    };
  }, []);

  const begin = useCallback(() => {
    completeOnboarding();
    // The guided tours run on the cosmos; they lead into creating the first memory.
    router.replace('/(tabs)');
  }, [completeOnboarding, router]);

  return (
    <View className="bg-void-deep flex-1">
      {/* A very faint, sparse drift so the void feels deep but genuinely empty. */}
      <View className="absolute inset-0 opacity-40">
        <StarfieldBackground variant="dust" />
      </View>

      {phase === 'empty' && (
        <Animated.View
          entering={FadeIn.duration(2600).easing(Easing.out(Easing.ease))}
          exiting={FadeOut.duration(1400)}
          className="absolute inset-0 items-center justify-center px-12"
        >
          <Text className="text-starlight/80 font-heading text-center text-3xl leading-9">
            it seems a bit empty in here…
          </Text>
        </Animated.View>
      )}

      {phase === 'action' && (
        <Animated.View
          entering={FadeIn.duration(1800).easing(Easing.out(Easing.ease))}
          className="absolute inset-0 items-center justify-center px-10"
        >
          <View className="bg-accent/10 border-accent/30 mb-8 h-20 w-20 items-center justify-center rounded-full border">
            <Sparkles size={30} color="#A5B4FC" />
          </View>
          <Text className="text-starlight font-heading mb-3 text-center text-4xl leading-[42px]">
            Welcome to Memoria
          </Text>
          <Text className="text-muted text-center text-base leading-6">
            {"Every memory becomes a star.\nLet's look around, then light your first one."}
          </Text>
          <Button className="mt-10 self-stretch" size="lg" onPress={begin}>
            Show me around
          </Button>
        </Animated.View>
      )}
    </View>
  );
}

/** This screen is a night sky, so it stays dark even when the app is in light mode. */
export default function Onboarding() {
  return (
    <ScopedTheme theme="dark">
      <OnboardingScreen />
    </ScopedTheme>
  );
}
