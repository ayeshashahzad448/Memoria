import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from 'heroui-native';
import { Canvas, Circle, Fill } from '@shopify/react-native-skia';
import { useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useMemoria } from '@/lib/store';

function rand(i: number): number {
  let h = 2166136261 ^ i;
  h = Math.imul(h, 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

/** Sparse, faint dust for the empty void. */
function EmptyVoid() {
  const { width, height } = useWindowDimensions();
  const clock = useSharedValue(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    clock.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.linear }), -1, true);
  });

  const dust = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: rand(i * 2 + 1) * width,
    y: rand(i * 2 + 2) * height,
    r: 0.5 + rand(i * 2 + 3) * 1.2,
    phase: rand(i * 7 + 5),
  }));

  return (
    <Canvas style={{ position: 'absolute', width, height }}>
      <Fill color="#0b0e1f" />
      {dust.map((d) => (
        <Twinkle key={d.id} d={d} clock={clock} />
      ))}
    </Canvas>
  );
}

function Twinkle({
  d,
  clock,
}: {
  d: { id: number; x: number; y: number; r: number; phase: number };
  clock: SharedValue<number>;
}) {
  const opacity = useDerivedValue(
    () => 0.08 + 0.3 * Math.abs(Math.sin((clock.value + d.phase) * Math.PI)),
  );
  return <Circle cx={d.x} cy={d.y} r={d.r} color="#CFE0FF" opacity={opacity} />;
}

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
    router.replace('/cosmos');
    router.push('/star/create');
  };

  return (
    <View className="bg-void flex-1">
      <EmptyVoid />

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
        <Animated.View
          entering={FadeIn.duration(2200).easing(Easing.out(Easing.ease))}
          className="absolute inset-0 items-center justify-center px-10"
        >
          <Text className="text-starlight mb-10 text-center text-2xl font-semibold">
            create your first star
          </Text>
          <Pressable onPress={beginFirstStar} hitSlop={20}>
            <FirstStarPulse />
          </Pressable>
          <Text className="text-muted mt-10 text-center text-sm">Tap the spark to begin</Text>
        </Animated.View>
      )}
    </View>
  );
}

/** A small invitation spark the user taps to start creation. */
function FirstStarPulse() {
  const pulse = useSharedValue(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    pulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  });

  const glow = useDerivedValue(() => 30 + pulse.value * 16);
  const glowOpacity = useDerivedValue(() => 0.35 + pulse.value * 0.35);

  return (
    <Canvas style={{ width: 140, height: 140 }}>
      <Circle cx={70} cy={70} r={glow} color="#5FE3F0" opacity={glowOpacity} />
      <Circle cx={70} cy={70} r={10} color="#FFFFFF" />
    </Canvas>
  );
}
