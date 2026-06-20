import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from 'heroui-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { StarfieldBackground } from '@/components/StarfieldBackground';
import { StarDissolve } from '@/components/StarDissolve';
import { useMemoria } from '@/lib/store';

// Beats: gather (0..0.32), shatter flash (~0.32), shards fly out + core streaks away (0.32..1).
const DISSOLVE_MS = 2600;

function fireHaptic(kind: 'shatter' | 'gone') {
  if (Platform.OS === 'web') return;
  if (kind === 'shatter') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
}

export default function DissolveStar() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  // Snapshot the star once so it survives removal mid-animation.
  const star = useMemoria((s) => s.stars.find((x) => x.id === id));
  const removeStar = useMemoria((s) => s.removeStar);

  const snapshot = useRef(star ?? null);
  if (star && !snapshot.current) snapshot.current = star;
  const captured = snapshot.current;

  const progress = useSharedValue(0);
  const twinkle = useSharedValue(0);
  const [phase, setPhase] = useState<'gathering' | 'gone'>('gathering');
  const removed = useRef(false);

  useEffect(() => {
    if (!captured) {
      router.back();
      return;
    }
    progress.value = withTiming(1, { duration: DISSOLVE_MS, easing: Easing.inOut(Easing.cubic) });
    twinkle.value = withTiming(6, { duration: 15000, easing: Easing.linear });
  }, [captured, progress, twinkle, router]);

  // Remove from store at shatter, then leave once the animation finishes.
  function commitRemoval() {
    if (removed.current || !captured) return;
    removed.current = true;
    removeStar(captured.id);
  }

  function finish() {
    setPhase('gone');
    // Brief beat on the empty void before returning to the cosmos.
    setTimeout(() => {
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
    }, 700);
  }

  useAnimatedReaction(
    () => progress.value,
    (p, prev) => {
      if (p >= 0.32 && (prev === null || prev < 0.32)) {
        runOnJS(fireHaptic)('shatter');
        runOnJS(commitRemoval)();
      }
      if (p >= 0.999 && (prev === null || prev < 0.999)) {
        runOnJS(fireHaptic)('gone');
        runOnJS(finish)();
      }
    },
  );

  if (!captured) return <View className="bg-void/95 flex-1" />;

  return (
    <View className="bg-void/95 flex-1 items-center justify-center px-6">
      <View className="absolute inset-0 opacity-60">
        <StarfieldBackground variant="drift" background="transparent" />
      </View>

      <Animated.View entering={FadeIn.duration(300)} className="items-center">
        <Text className="text-muted font-display text-xs tracking-[3px] uppercase">
          {phase === 'gone' ? 'The memory has faded' : 'Releasing this memory'}
        </Text>

        <View className="my-3 items-center justify-center">
          {phase === 'gone' ? (
            <View style={{ width: 280, height: 280 }} />
          ) : (
            <StarDissolve progress={progress} twinkleClock={twinkle} colorKey={captured.colorKey} />
          )}
        </View>

        <Text className="text-starlight font-display text-2xl font-bold" numberOfLines={1}>
          {captured.title}
        </Text>
        <Text className="text-muted mt-1 text-center text-xs">
          {phase === 'gone' ? 'Returned to the void' : 'Scattering to stardust…'}
        </Text>
      </Animated.View>
    </View>
  );
}
