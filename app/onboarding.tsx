import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { Text } from 'heroui-native';
import Animated, { Easing, FadeIn, FadeOut } from 'react-native-reanimated';

import { StarfieldBackground } from '@/components/StarfieldBackground';
import { useMemoria } from '@/lib/store';

type Phase = 'black' | 'empty' | 'action';

/**
 * First-run narrative shown right after sign up. Starts on an almost-black,
 * empty void — "it seems a bit empty in here" fades in subtly, lingers, then
 * slowly fades into an invitation to create the first memory.
 */
export default function Onboarding() {
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
    router.replace('/star/create');
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
          <Text className="text-muted text-center text-lg leading-7 italic">
            it seems a bit empty in here…
          </Text>
        </Animated.View>
      )}

      {phase === 'action' && (
        <Pressable className="absolute inset-0" onPress={begin}>
          <Animated.View
            entering={FadeIn.duration(2600).easing(Easing.out(Easing.ease))}
            className="flex-1 items-center justify-center px-12"
          >
            <View className="bg-accent/10 border-accent/30 mb-8 h-20 w-20 items-center justify-center rounded-full border">
              <Sparkles size={30} color="#45F3FF" />
            </View>
            <Text className="text-starlight font-display mb-3 text-center text-2xl font-semibold">
              Create your first memory
            </Text>
            <Text className="text-muted text-center text-sm leading-6">
              {"Every memory becomes a star.\nLet's light the first one."}
            </Text>
            <Text className="text-muted/70 mt-10 text-center text-xs">Tap anywhere to begin</Text>
          </Animated.View>
        </Pressable>
      )}
    </View>
  );
}
