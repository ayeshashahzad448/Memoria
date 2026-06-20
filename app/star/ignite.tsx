import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Text } from 'heroui-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Flame, Sparkles, Sun, Weight } from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { StarfieldBackground } from '@/components/StarfieldBackground';
import { StarIgnition } from '@/components/StarIgnition';
import { useMemoria } from '@/lib/store';
import { colorFor, starStatsForStar } from '@/lib/memoria';

// Slower cinematic beats: drift-in, collapse, ignition flash, settle.
const IGNITE_MS = 5400;

// Module-scope so it is not recreated on every render (unicorn/consistent-function-scoping).
function fireHaptic(kind: 'collapse' | 'flash' | 'settle') {
  if (Platform.OS === 'web') return;
  if (kind === 'collapse') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  else if (kind === 'flash')
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else void Haptics.selectionAsync();
}

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
  const firedCollapse = useRef(false);
  const firedFlash = useRef(false);
  const firedSettle = useRef(false);

  const stats = useMemo(() => (star ? starStatsForStar(star) : null), [star]);
  const accent = star ? colorFor(star.colorKey).hex : '#45F3FF';

  useEffect(() => {
    if (!star) return;
    progress.value = withTiming(1, { duration: IGNITE_MS, easing: Easing.inOut(Easing.cubic) });
    twinkle.value = withTiming(6, { duration: 15000, easing: Easing.linear });
    // Stats reveal after the ignition flash, while the star stabilizes.
    statT.value = withDelay(
      IGNITE_MS * 0.56,
      withTiming(1, { duration: IGNITE_MS * 0.42, easing: Easing.out(Easing.cubic) }, (fin) => {
        if (fin) runOnJS(setDone)(true);
      }),
    );
  }, [star, progress, twinkle, statT]);

  useAnimatedReaction(
    () => statT.value,
    (v) => runOnJS(setStatProgress)(v),
  );

  useAnimatedReaction(
    () => progress.value,
    (p) => {
      if (p > 0.22 && p < 0.5) runOnJS(beat)('collapse');
      if (p >= 0.5) runOnJS(beat)('flash');
      if (p >= 0.92) runOnJS(beat)('settle');
    },
  );

  function beat(kind: 'collapse' | 'flash' | 'settle') {
    if (kind === 'collapse') {
      if (firedCollapse.current) return;
      firedCollapse.current = true;
    } else if (kind === 'flash') {
      if (firedFlash.current) return;
      firedFlash.current = true;
    } else {
      if (firedSettle.current) return;
      firedSettle.current = true;
    }
    fireHaptic(kind);
  }

  // Push-in + settle camera: scale up during collapse, snap on flash, ease back.
  const sceneStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const d = Math.abs(p - 0.5);
    const flash = Math.max(0, 1 - d / 0.13);
    const collapse = Math.min(p / 0.5, 1);
    const settle = Math.max(0, (p - 0.5) / 0.5);
    // 1.0 -> ~1.18 by ignition, brief flash punch, ease back to ~1.04.
    const base = 1 + collapse * 0.18 - settle * 0.14 + flash * 0.06;
    return { transform: [{ scale: base }] };
  });

  // Guard: if the star vanished, just leave.
  useEffect(() => {
    if (!star) router.back();
  }, [star, router]);

  if (!star || !stats) return <View className="bg-void flex-1" />;

  const tempNow = Math.round(stats.temperatureK * Math.min(1, statProgress * 1.1));
  const massNow = (stats.massSolar * Math.min(1, statProgress * 1.1)).toFixed(2);
  const lumNow = (stats.luminositySolar * Math.min(1, statProgress * 1.1)).toFixed(1);
  const showClass = statProgress > 0.85;

  return (
    <View className="bg-void/95 flex-1 items-center justify-center px-6">
      <View className="absolute inset-0 opacity-70">
        <StarfieldBackground variant="drift" background="transparent" />
      </View>

      <Animated.View entering={FadeIn.duration(400)} className="items-center">
        <Text className="text-muted font-display text-xs tracking-[3px] uppercase">
          {statProgress < 0.5 ? 'A protostar is collapsing' : 'A star is born'}
        </Text>

        <Animated.View style={sceneStyle} className="my-2 items-center justify-center">
          <StarIgnition progress={progress} twinkleClock={twinkle} colorKey={star.colorKey} />
        </Animated.View>

        <Text className="text-starlight font-display text-2xl font-bold" numberOfLines={1}>
          {star.title}
        </Text>
        <Text className="text-muted mt-1 text-center text-xs" style={{ color: accent }}>
          {showClass ? stats.spectralName : 'Igniting…'}
        </Text>
      </Animated.View>

      <View className="mt-7 w-full">
        <GlassCard contentClassName="gap-0 p-0">
          <StatRow
            show={statProgress > 0.08}
            icon={<Flame size={16} color="#FF8A5C" />}
            label="Temperature"
            value={`${tempNow.toLocaleString()} K`}
          />
          <Divider />
          <StatRow
            show={statProgress > 0.3}
            icon={<Weight size={16} color={accent} />}
            label="Mass"
            value={`${massNow} M\u2609`}
          />
          <Divider />
          <StatRow
            show={statProgress > 0.55}
            icon={<Sun size={16} color="#FFC75F" />}
            label="Luminosity"
            value={`${lumNow} L\u2609`}
          />
          <Divider />
          <StatRow
            show={showClass}
            icon={<Sparkles size={16} color={accent} />}
            label="Spectral class"
            value={showClass ? stats.spectralClass : '—'}
          />
        </GlassCard>
        <Text className="text-muted mt-3 px-1 text-center text-[11px] leading-4">
          The more you pour into a memory, the hotter, heavier and brighter its star burns.
        </Text>
      </View>

      <View className="mt-8 w-full">
        <Button
          isDisabled={!done}
          onPress={() =>
            router.replace({ pathname: '/star/[id]', params: { id: star.id, justCreated: '1' } })
          }
        >
          {done ? 'Enter the cosmos' : 'Stabilizing…'}
        </Button>
        <Pressable
          onPress={() => router.replace({ pathname: '/star/[id]', params: { id: star.id } })}
          hitSlop={10}
          className="mt-3 items-center"
        >
          <Text className="text-muted text-xs">Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Divider() {
  return <View className="border-glass-border border-t" style={{ opacity: 0.4 }} />;
}

function StatRow({
  icon,
  label,
  value,
  show,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  show: boolean;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(show ? 1 : 0, { duration: 360 }),
    transform: [{ translateY: withTiming(show ? 0 : 8, { duration: 360 }) }],
  }));
  return (
    <Animated.View style={style} className="flex-row items-center justify-between px-5 py-3.5">
      <View className="flex-row items-center gap-2.5">
        {icon}
        <Text className="text-muted text-sm">{label}</Text>
      </View>
      <Text className="text-starlight font-display text-base font-semibold">{value}</Text>
    </Animated.View>
  );
}
