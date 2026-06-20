import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Text } from 'heroui-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  useAnimatedReaction,
  useSharedValue,
  withDelay,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Flame, Sparkles, Sun, Weight } from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { StarIgnition } from '@/components/StarIgnition';
import { useMemoria } from '@/lib/store';
import { colorFor, starStatsForStar } from '@/lib/memoria';

const IGNITE_MS = 3200;

export default function IgniteStar() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const star = useMemoria((s) => s.stars.find((x) => x.id === id));

  const progress = useSharedValue(0);
  const twinkle = useSharedValue(0);
  const statT = useSharedValue(0);
  const [statProgress, setStatProgress] = useState(0);
  const [done, setDone] = useState(false);

  const stats = useMemo(() => (star ? starStatsForStar(star) : null), [star]);
  const accent = star ? colorFor(star.colorKey).hex : '#45F3FF';

  useEffect(() => {
    if (!star) return;
    progress.value = withTiming(1, { duration: IGNITE_MS, easing: Easing.inOut(Easing.cubic) });
    twinkle.value = withTiming(6, { duration: 15000, easing: Easing.linear });
    // Stats count up after the ignition flash, while the star stabilizes.
    statT.value = withDelay(
      IGNITE_MS * 0.5,
      withTiming(1, { duration: IGNITE_MS * 0.55, easing: Easing.out(Easing.cubic) }, (fin) => {
        if (fin) runOnJS(setDone)(true);
      }),
    );
  }, [star, progress, twinkle, statT]);

  useAnimatedReaction(
    () => statT.value,
    (v) => runOnJS(setStatProgress)(v),
  );

  // Guard: if the star vanished, just leave.
  useEffect(() => {
    if (!star) router.back();
  }, [star, router]);

  if (!star || !stats) return <View className="bg-void flex-1" />;

  const tempNow = Math.round(stats.temperatureK * statProgress);
  const massNow = (stats.massSolar * statProgress).toFixed(2);
  const lumNow = (stats.luminositySolar * statProgress).toFixed(1);
  const showClass = statProgress > 0.85;

  return (
    <View className="bg-void/95 flex-1 items-center justify-center px-6">
      <Animated.View entering={FadeIn.duration(400)} className="items-center">
        <Text className="text-muted font-display text-xs tracking-[3px] uppercase">
          {statProgress < 0.5 ? 'A protostar is collapsing' : 'A star is born'}
        </Text>

        <View className="my-2 items-center justify-center">
          <StarIgnition progress={progress} twinkleClock={twinkle} colorKey={star.colorKey} />
        </View>

        <Text className="text-starlight font-display text-2xl font-bold" numberOfLines={1}>
          {star.title}
        </Text>
        <Text className="text-muted mt-1 text-center text-xs" style={{ color: accent }}>
          {showClass ? stats.spectralName : 'Igniting…'}
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(IGNITE_MS * 0.45).duration(500)}
        className="mt-7 w-full"
      >
        <GlassCard contentClassName="gap-0 p-0">
          <StatRow
            icon={<Flame size={16} color="#FF8A5C" />}
            label="Temperature"
            value={`${tempNow.toLocaleString()} K`}
          />
          <Divider />
          <StatRow
            icon={<Weight size={16} color={accent} />}
            label="Mass"
            value={`${massNow} M\u2609`}
          />
          <Divider />
          <StatRow
            icon={<Sun size={16} color="#FFC75F" />}
            label="Luminosity"
            value={`${lumNow} L\u2609`}
          />
          <Divider />
          <StatRow
            icon={<Sparkles size={16} color={accent} />}
            label="Spectral class"
            value={showClass ? stats.spectralClass : '—'}
          />
        </GlassCard>
        <Text className="text-muted mt-3 px-1 text-center text-[11px] leading-4">
          The more you pour into a memory, the hotter, heavier and brighter its star burns.
        </Text>
      </Animated.View>

      <View className="mt-8 w-full">
        <Button isDisabled={!done} onPress={() => router.back()}>
          {done ? 'Enter the cosmos' : 'Stabilizing…'}
        </Button>
        <Pressable onPress={() => router.back()} hitSlop={10} className="mt-3 items-center">
          <Text className="text-muted text-xs">Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Divider() {
  return <View className="border-glass-border border-t" style={{ opacity: 0.4 }} />;
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between px-5 py-3.5">
      <View className="flex-row items-center gap-2.5">
        {icon}
        <Text className="text-muted text-sm">{label}</Text>
      </View>
      <Text className="text-starlight font-display text-base font-semibold">{value}</Text>
    </View>
  );
}
