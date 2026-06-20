import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Text } from 'heroui-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Check, Sparkles, X } from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { useMemoria } from '@/lib/store';
import { colorFor } from '@/lib/memoria';
import { getPremiumProduct, purchasePremium, type IapProduct } from '@/lib/iap';

const ACCENT = colorFor('cyan').hex;
const VIOLET = colorFor('violet').hex;
const MUTED = '#94A3B8';

const BENEFITS = [
  'Unlimited cloud storage for photos and voice notes',
  'Keep every memory in full quality, forever',
  'Priority backup for your shared family cosmos',
];

export default function Paywall() {
  const router = useRouter();
  const setTier = useMemoria((s) => s.setTier);
  const [product, setProduct] = useState<IapProduct | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void getPremiumProduct().then(setProduct);
  }, []);

  const onUpgrade = async () => {
    setPending(true);
    setNotice(null);
    const result = await purchasePremium();
    setPending(false);
    if (result.success) {
      setTier('premium');
      router.back();
    } else if (result.notAvailable) {
      // Payments are not enabled yet — the flow is wired and ready to connect.
      setNotice('Payments are not enabled yet. Turn them on to complete your upgrade.');
    } else {
      setNotice('Something went wrong. Please try again.');
    }
  };

  const priceLabel = product ? `Upgrade for ${product.displayPrice}/${product.period}` : 'Upgrade';

  return (
    <View
      className="flex-1 items-center justify-center px-6"
      style={{ backgroundColor: 'rgba(4, 6, 18, 0.82)' }}
    >
      <ExpandingUniverse />

      <Animated.View entering={FadeIn.duration(400)} className="w-full max-w-md">
        <GlassCard contentClassName="gap-5 p-7">
          <View className="flex-row items-start justify-between">
            <View className="flex-row items-center gap-2">
              <Sparkles size={20} color={ACCENT} />
              <Text className="text-accent text-xs font-semibold tracking-widest uppercase">
                Infinite Cosmos
              </Text>
            </View>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <X size={20} color={MUTED} />
            </Pressable>
          </View>

          <View className="gap-2">
            <Text className="text-starlight font-display text-2xl leading-8 font-bold">
              Your cosmos is full
            </Text>
            <Text className="text-muted text-sm leading-6">
              Upgrade to Memoria Premium to unlock infinite storage and keep your legacy growing.
            </Text>
          </View>

          <View className="gap-2.5">
            {BENEFITS.map((b) => (
              <View key={b} className="flex-row items-start gap-2.5">
                <View
                  className="mt-0.5 h-4 w-4 items-center justify-center rounded-full"
                  style={{ backgroundColor: ACCENT }}
                >
                  <Check size={11} color="#0b0c10" strokeWidth={3} />
                </View>
                <Text className="text-starlight/90 flex-1 text-sm leading-5">{b}</Text>
              </View>
            ))}
          </View>

          {notice && <Text className="text-warning text-xs leading-5">{notice}</Text>}

          <View className="gap-2">
            <Button onPress={onUpgrade} isDisabled={pending}>
              {pending ? 'Processing…' : priceLabel}
            </Button>
            <Button variant="ghost" onPress={() => router.back()}>
              Maybe later
            </Button>
          </View>

          <Text className="text-muted text-center text-[11px] leading-4">
            Billed through your app store. Cancel anytime in your account settings.
          </Text>
        </GlassCard>
      </Animated.View>
    </View>
  );
}

/** Subtle expanding-universe backdrop: rings that bloom outward and fade. */
function ExpandingUniverse() {
  return (
    <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
      <Ring delay={0} color={ACCENT} />
      <Ring delay={1300} color={VIOLET} />
      <Ring delay={2600} color={ACCENT} />
    </View>
  );
}

function Ring({ delay, color }: { delay: number; color: string }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    const id = setTimeout(() => {
      progress.value = withRepeat(
        withTiming(1, { duration: 3900, easing: Easing.out(Easing.cubic) }),
        -1,
        false,
      );
    }, delay);
    return () => clearTimeout(id);
  }, [delay, progress]);

  const style = useAnimatedStyle(() => {
    const scale = 0.2 + progress.value * 1.4;
    return {
      transform: [{ scale }],
      opacity: (1 - progress.value) * 0.4,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 260,
          height: 260,
          borderRadius: 130,
          borderWidth: 1.5,
          borderColor: color,
        },
        style,
      ]}
    />
  );
}
