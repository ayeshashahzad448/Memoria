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
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { StarfieldBackground } from '@/components/StarfieldBackground';
import { wordmarkFamily } from '@/lib/fonts';
import { useMemoria } from '@/lib/store';

const WORDMARK = 'Memoria';

/**
 * Cold-open splash: the Memoria wordmark types in letter by letter over a
 * drifting starfield, holds, then cross-fades out as we route onward.
 */
export default function Index() {
  const isAuthed = useMemoria((s) => s.isAuthed);
  const hasOnboarded = useMemoria((s) => s.hasOnboarded);
  const resetFlow = useMemoria((s) => s.resetFlow);
  const [done, setDone] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);

  const outro = useSharedValue(0); // 0 -> 1 fade the splash out

  // Always replay the full flow: reset auth/onboarding on each cold open so the
  // sequence is splash -> sign up/login -> onboarding -> cosmos.
  useEffect(() => {
    resetFlow();
  }, [resetFlow]);

  // Type the wordmark out one character at a time.
  useEffect(() => {
    const perLetter = 170;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= WORDMARK.length; i++) {
      timers.push(setTimeout(() => setVisibleCount(i), i * perLetter));
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const holdAfterTyping = WORDMARK.length * 170 + 650;
    outro.value = withDelay(
      holdAfterTyping,
      withTiming(1, { duration: 650, easing: Easing.inOut(Easing.cubic) }),
    );
    const timer = setTimeout(() => setDone(true), holdAfterTyping + 700);
    return () => clearTimeout(timer);
  }, [outro]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(outro.value, [0, 1], [1, 0]),
    transform: [{ translateY: interpolate(outro.value, [0, 1], [0, -16]) }],
  }));

  if (done) {
    if (!isAuthed) return <Redirect href="/auth" />;
    if (!hasOnboarded) return <Redirect href="/onboarding" />;
    return <Redirect href="/(tabs)" />;
  }

  const shown = WORDMARK.slice(0, visibleCount);
  const showCaret = visibleCount < WORDMARK.length;

  return (
    <View className="bg-void-deep flex-1">
      <StarfieldBackground variant="drift" />
      <Animated.View className="flex-1 items-center justify-center px-8" style={containerStyle}>
        <View className="flex-row items-center">
          <Text
            style={{
              fontFamily: wordmarkFamily(),
              fontSize: 60,
              letterSpacing: 4,
              color: '#F8FAFC',
            }}
          >
            {shown}
          </Text>
          {showCaret ? <Caret /> : null}
        </View>
      </Animated.View>
    </View>
  );
}

/** Blinking type cursor that sits at the end of the typed wordmark. */
function Caret() {
  const blink = useSharedValue(1);
  useEffect(() => {
    blink.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 420, easing: Easing.linear }),
        withTiming(1, { duration: 420, easing: Easing.linear }),
      ),
      -1,
      false,
    );
  }, [blink]);
  const style = useAnimatedStyle(() => ({ opacity: blink.value }));
  return <Animated.View style={style} className="bg-accent ml-2 h-12 w-1.5 rounded-full" />;
}
