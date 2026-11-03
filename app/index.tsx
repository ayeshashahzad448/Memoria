import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useFrame } from '@/lib/useFrame';
import { Redirect } from 'expo-router';
import { Text } from 'heroui-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { StarfieldBackground } from '@/components/StarfieldBackground';
import { StarIgnition } from '@/components/StarIgnition';
import { wordmarkFamily } from '@/lib/fonts';
import { useMemoria } from '@/lib/store';

const WORDMARK = 'MEMORIA';

// Timeline (ms) of the cold-open splash: a comet streaks in, lands and ignites the star.
const COMET_DELAY = 350;
const COMET_DURATION = 1150;
const IMPACT = COMET_DELAY + COMET_DURATION; // the comet lands and the star flashes
const IGNITE_DURATION = 1900; // flash -> stable star
/** StarIgnition progress at impact: just before its flash peak (0.5), so it bursts at once. */
const IGNITE_START = 0.42;
const WORDMARK_DELAY = IMPACT + 800; // wordmark fades in as the star settles
const HOLD_AFTER = 900; // breathe on the finished mark
const OUTRO_DURATION = 650;
const COMET_LENGTH = 150;

/**
 * Cold-open splash: a comet streaks in from the corner, lands, and bursts into a
 * brilliant four-point star while the Memoria wordmark rises beneath it. Reuses the
 * app's StarIgnition aesthetic so the splash previews the core moment of the app, a
 * memory being born as a star. Then cross-fades out and routes onward.
 */
export default function Index() {
  const isAuthed = useMemoria((s) => s.isAuthed);
  const hasOnboarded = useMemoria((s) => s.hasOnboarded);
  const resetFlow = useMemoria((s) => s.resetFlow);
  const { width } = useFrame();
  const [done, setDone] = useState(false);

  const ignite = useSharedValue(IGNITE_START); // 0.5 = flash, 1 = stable star
  const comet = useSharedValue(0); // 0 -> 1 travel of the comet toward the star
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

    comet.value = withDelay(
      COMET_DELAY,
      withTiming(1, { duration: COMET_DURATION, easing: Easing.in(Easing.quad) }),
    );
    ignite.value = withDelay(
      IMPACT,
      withTiming(1, { duration: IGNITE_DURATION, easing: Easing.out(Easing.cubic) }),
    );

    const wordmarkTimer = setTimeout(() => {
      wordmark.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
    }, WORDMARK_DELAY);

    const outroTimer = setTimeout(
      () => {
        outro.value = withTiming(1, {
          duration: OUTRO_DURATION,
          easing: Easing.inOut(Easing.cubic),
        });
      },
      IMPACT + IGNITE_DURATION + HOLD_AFTER,
    );

    const doneTimer = setTimeout(
      () => setDone(true),
      IMPACT + IGNITE_DURATION + HOLD_AFTER + OUTRO_DURATION + 60,
    );

    return () => {
      clearTimeout(wordmarkTimer);
      clearTimeout(outroTimer);
      clearTimeout(doneTimer);
      cancelAnimation(twinkle);
      cancelAnimation(ignite);
      cancelAnimation(comet);
    };
  }, [ignite, comet, twinkle, wordmark, outro]);

  // The star only appears once the comet has landed on it.
  const starStyle = useAnimatedStyle(() => ({ opacity: comet.value >= 1 ? 1 : 0 }));

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
        <View style={{ width: starSize, height: starSize }}>
          <Animated.View style={starStyle}>
            <StarIgnition
              progress={ignite}
              twinkleClock={twinkle}
              colorKey="cyan"
              size={starSize}
            />
          </Animated.View>
          <Comet progress={comet} size={starSize} />
        </View>
        <Animated.View className="mt-2 items-center" style={wordmarkStyle}>
          <Text
            style={{
              fontFamily: wordmarkFamily(),
              fontSize: 44,
              lineHeight: 60,
              letterSpacing: 2,
              color: '#F4F1EA',
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

/** A bright comet that flies in from the upper right and lands on the star's centre. */
function Comet({ progress, size }: { progress: SharedValue<number>; size: number }) {
  const c = size / 2;
  const startX = size * 0.95;
  const startY = -size * 1.05;
  const angle = Math.atan2(-startY, -startX); // direction of travel

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.12, 0.96, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: startX * (1 - progress.value) },
      { translateY: startY * (1 - progress.value) },
      { rotate: `${angle}rad` },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: c, top: c, width: 0, height: 0 }, style]}
    >
      <LinearGradient
        colors={['rgba(165,180,252,0)', 'rgba(199,210,254,0.85)', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          position: 'absolute',
          left: -COMET_LENGTH,
          top: -1.5,
          width: COMET_LENGTH,
          height: 3,
          borderRadius: 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: -6,
          top: -6,
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: '#FFFFFF',
          shadowColor: '#A5B4FC',
          shadowOpacity: 1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 0 },
        }}
      />
    </Animated.View>
  );
}
