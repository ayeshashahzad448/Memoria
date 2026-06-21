import { useEffect, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Text } from 'heroui-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { StarfieldBackground } from '@/components/StarfieldBackground';
import { StarIgnition } from '@/components/StarIgnition';
import { wordmarkFamily } from '@/lib/fonts';
import { useMemoria } from '@/lib/store';

const WORDMARK = 'MEMORIA';

// Timeline (ms) of the cold-open ignition splash.
const IGNITE_DURATION = 2600; // protostar -> contraction -> flash -> stable star
const WORDMARK_DELAY = 1700; // wordmark starts fading in as the star ignites
const HOLD_AFTER = 900; // breathe on the finished mark
const OUTRO_DURATION = 650;

/**
 * Cold-open splash: a cool protostar contracts and flares into a brilliant
 * ignition flash, then settles into a stellar-cyan star while the Memoria
 * wordmark rises beneath it. Reuses the app's StarIgnition aesthetic so the
 * splash literally previews the core moment of the app — a memory being born
 * as a star. Then cross-fades out and routes onward.
 */
export default function Index() {
  const isAuthed = useMemoria((s) => s.isAuthed);
  const hasOnboarded = useMemoria((s) => s.hasOnboarded);
  const resetFlow = useMemoria((s) => s.resetFlow);
  const { width } = useWindowDimensions();
  const [done, setDone] = useState(false);

  const ignite = useSharedValue(0); // 0 = protostar, 0.5 = flash, 1 = stable star
  const twinkle = useSharedValue(0); // continuous twinkle clock (0..6, non-wrapping)
  const wordmark = useSharedValue(0); // 0 -> 1 reveal of the wordmark
  const outro = useSharedValue(0); // 0 -> 1 fade the whole splash out

  // Always replay the full flow: reset auth/onboarding on each cold open so the
  // sequence is splash -> sign up/login -> onboarding -> cosmos.
  useEffect(() => {
    resetFlow();
  }, [resetFlow]);

  useEffect(() => {
    twinkle.value = withRepeat(
      withTiming(6, { duration: 15000, easing: Easing.linear }),
      -1,
      false,
    );

    ignite.value = withTiming(1, {
      duration: IGNITE_DURATION,
      easing: Easing.inOut(Easing.cubic),
    });

    const wordmarkTimer = setTimeout(() => {
      wordmark.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
    }, WORDMARK_DELAY);

    const outroTimer = setTimeout(() => {
      outro.value = withTiming(1, {
        duration: OUTRO_DURATION,
        easing: Easing.inOut(Easing.cubic),
      });
    }, IGNITE_DURATION + HOLD_AFTER);

    const doneTimer = setTimeout(
      () => setDone(true),
      IGNITE_DURATION + HOLD_AFTER + OUTRO_DURATION + 60,
    );

    return () => {
      clearTimeout(wordmarkTimer);
      clearTimeout(outroTimer);
      clearTimeout(doneTimer);
      cancelAnimation(twinkle);
      cancelAnimation(ignite);
    };
  }, [ignite, twinkle, wordmark, outro]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(outro.value, [0, 1], [1, 0]),
    transform: [{ translateY: interpolate(outro.value, [0, 1], [0, -16]) }],
  }));

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmark.value,
    transform: [{ translateY: interpolate(wordmark.value, [0, 1], [14, 0]) }],
  }));

  if (done) {
    if (!isAuthed) return <Redirect href="/auth" />;
    if (!hasOnboarded) return <Redirect href="/onboarding" />;
    return <Redirect href="/(tabs)" />;
  }

  const starSize = Math.min(width * 0.78, 320);

  return (
    <View className="bg-void-deep flex-1">
      <StarfieldBackground variant="drift" />
      <Animated.View className="flex-1 items-center justify-center px-8" style={containerStyle}>
        <StarIgnition progress={ignite} twinkleClock={twinkle} colorKey="cyan" size={starSize} />
        <Animated.View className="mt-2 items-center" style={wordmarkStyle}>
          <Text
            style={{
              fontFamily: wordmarkFamily(),
              fontSize: 44,
              lineHeight: 60,
              letterSpacing: 2,
              color: '#F8FAFC',
              includeFontPadding: false,
              paddingTop: 8,
            }}
          >
            {WORDMARK}
          </Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
