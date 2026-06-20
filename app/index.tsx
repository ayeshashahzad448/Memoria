import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { Text } from 'heroui-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { StarfieldBackground } from '@/components/StarfieldBackground';
import { wordmarkFamily } from '@/lib/fonts';
import { useMemoria } from '@/lib/store';

/**
 * Cold-open splash: the Memoria wordmark glows in over a drifting starfield,
 * holds, then cross-fades out as we route to auth / onboarding / cosmos.
 */
export default function Index() {
  const isAuthed = useMemoria((s) => s.isAuthed);
  const hasOnboarded = useMemoria((s) => s.hasOnboarded);
  const [done, setDone] = useState(false);

  const intro = useSharedValue(0); // 0 -> 1 wordmark reveal
  const outro = useSharedValue(0); // 0 -> 1 fade the splash out

  useEffect(() => {
    intro.value = withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) });
    outro.value = withDelay(
      2100,
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.cubic) }),
    );
    const timer = setTimeout(() => setDone(true), 2850);
    return () => clearTimeout(timer);
  }, [intro, outro]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(outro.value, [0, 1], [1, 0]),
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [
      { scale: interpolate(intro.value, [0, 1], [0.86, 1]) },
      { translateY: interpolate(outro.value, [0, 1], [0, -18]) },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(intro.value, [0, 0.6, 1], [0, 0.5, 0.28]),
    transform: [{ scale: interpolate(intro.value, [0, 1], [0.6, 1.15]) }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(intro.value, [0.5, 1], [0, 1]),
    transform: [{ translateY: interpolate(intro.value, [0.5, 1], [8, 0]) }],
  }));

  if (done) {
    if (!isAuthed) return <Redirect href="/auth" />;
    if (!hasOnboarded) return <Redirect href="/onboarding" />;
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View className="bg-void-deep flex-1">
      <StarfieldBackground variant="drift" />
      <Animated.View className="flex-1 items-center justify-center px-8" style={containerStyle}>
        {/* Soft radial glow behind the wordmark */}
        <Animated.View
          pointerEvents="none"
          className="bg-accent/30 absolute h-56 w-56 rounded-full"
          style={[{ shadowColor: '#45F3FF', shadowOpacity: 0.9, shadowRadius: 60 }, glowStyle]}
        />
        <Animated.Text
          style={[
            {
              fontFamily: wordmarkFamily(),
              fontSize: 64,
              letterSpacing: 4,
              color: '#F8FAFC',
              textShadowColor: '#45F3FF',
              textShadowRadius: 24,
              textShadowOffset: { width: 0, height: 0 },
            },
            wordStyle,
          ]}
        >
          Memoria
        </Animated.Text>
        <Animated.View style={taglineStyle}>
          <Text className="text-muted mt-3 text-center tracking-widest">
            A cosmos of your memories
          </Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
