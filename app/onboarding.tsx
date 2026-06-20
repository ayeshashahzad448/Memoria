import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from 'heroui-native';
import Animated, { Easing, FadeIn, FadeOut } from 'react-native-reanimated';

import { SparkPulse } from '@/components/SparkPulse';
import { StarfieldBackground } from '@/components/StarfieldBackground';
import { useMemoria } from '@/lib/store';

type Phase = 'empty' | 'prompt' | 'action';

export default function Onboarding() {
  const router = useRouter();
  const completeOnboarding = useMemoria((s) => s.completeOnboarding);
  const [phase, setPhase] = useState<Phase>('empty');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('prompt'), 1400);
    const t2 = setTimeout(() => setPhase('action'), 5200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const beginFirstStar = () => {
    completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <View className="bg-void flex-1">
      <StarfieldBackground variant="dust" />

      {phase === 'prompt' && (
        <Animated.View
          entering={FadeIn.duration(1600)}
          exiting={FadeOut.duration(900)}
          className="absolute inset-0 items-center justify-center px-10"
        >
          <Text className="text-muted text-center text-lg italic">
            it seems to be empty in here…
          </Text>
        </Animated.View>
      )}

      {phase === 'action' && (
        <Pressable className="absolute inset-0" onPress={beginFirstStar}>
          <Animated.View
            entering={FadeIn.duration(2200).easing(Easing.out(Easing.ease))}
            className="flex-1 items-center justify-center px-10"
            pointerEvents="none"
          >
            <Text className="text-starlight font-display mb-10 text-center text-2xl font-semibold">
              create your first star
            </Text>
            <SparkPulse />
            <Text className="text-muted mt-10 text-center text-sm">Tap anywhere to begin</Text>
          </Animated.View>
        </Pressable>
      )}
    </View>
  );
}
