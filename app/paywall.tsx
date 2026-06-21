import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Text } from 'heroui-native';
import Animated, {
  Easing,
  FadeIn,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Check, Lock, Sparkles, X } from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { StorageBar } from '@/components/StorageBar';
import { DemoTourOverlay } from '@/components/DemoTourOverlay';
import { useMemoria } from '@/lib/store';
import { colorFor } from '@/lib/memoria';
import { FREE_LIMIT_BYTES, WARN_RATIO, formatBytes, totalMediaBytes } from '@/lib/storage';
import { type BillingPeriod, PLAN_PRICING, type PlanId, purchasePlan } from '@/lib/iap';

const ACCENT = colorFor('cyan').hex;
const VIOLET = '#C29BFF';
const MUTED = '#94A3B8';

interface PlanDef {
  id: PlanId;
  header: string;
  features: string[];
  accent: string;
  cta: string;
  recommended?: boolean;
  monthly?: string;
  yearly?: string;
}

const PLANS: PlanDef[] = [
  {
    id: 'free',
    header: 'Free Cosmos',
    accent: MUTED,
    cta: 'Current Plan',
    features: [
      '5GB secure media storage',
      'Standard procedural starfield mapping',
      'Basic memory filtering',
    ],
  },
  {
    id: 'personal',
    header: 'Premium',
    accent: ACCENT,
    cta: 'Unlock My Cosmos',
    recommended: true,
    monthly: PLAN_PRICING.personal.monthly,
    yearly: PLAN_PRICING.personal.yearly,
    features: [
      'Infinite cloud storage for photos and voice notes',
      'High-fidelity uncompressed media uploads',
      'Unlock full thematic constellation mapping',
      'Access the Reflections throwback memory feed',
    ],
  },
  {
    id: 'family',
    header: 'Family Plan',
    accent: VIOLET,
    cta: 'Begin Family Legacy',
    monthly: PLAN_PRICING.family.monthly,
    yearly: PLAN_PRICING.family.yearly,
    features: [
      'Everything in Premium',
      'Invite up to 5 family members on one plan',
      'Create a unified shared cosmos archive',
      'Cross-generational legacy preservation tools',
    ],
  },
];

export default function Paywall() {
  const router = useRouter();
  const setTier = useMemoria((s) => s.setTier);
  const allStars = useMemoria((s) => s.stars);
  const used = useMemo(() => totalMediaBytes(allStars), [allStars]);

  const [period, setPeriod] = useState<BillingPeriod>('yearly');
  const [pending, setPending] = useState<PlanId | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const ratio = Math.min(used / FREE_LIMIT_BYTES, 1);
  const warning = ratio >= WARN_RATIO;

  const onChoose = async (plan: PlanDef) => {
    if (plan.id === 'free') return;
    setPending(plan.id);
    setNotice(null);
    const result = await purchasePlan(plan.id, period);
    setPending(null);
    if (result.success) {
      setTier('premium');
      router.back();
    } else if (result.notAvailable) {
      setNotice('Payments are not enabled yet. Turn them on to complete your upgrade.');
    } else {
      setNotice('Something went wrong. Please try again.');
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: 'rgba(4, 6, 18, 0.9)' }}>
      <ExpandingUniverse />

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-safe-offset-6 pb-safe-offset-10 gap-5"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(400)} className="gap-2 px-1">
          <View className="flex-row items-start justify-between">
            <View className="flex-row items-center gap-2">
              <Sparkles size={18} color={ACCENT} />
              <Text className="text-accent text-xs font-semibold tracking-widest uppercase">
                Memoria Premium
              </Text>
            </View>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              className="border-glass-border h-9 w-9 items-center justify-center rounded-full border"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
            >
              <X size={18} color={MUTED} />
            </Pressable>
          </View>
          <Text className="text-starlight font-display text-3xl leading-9 font-bold">
            Expand Your Universe
          </Text>
          <Text className="text-muted text-sm leading-6">
            Choose how you want to preserve your legacy.
          </Text>
        </Animated.View>

        {/* Storage status */}
        <GlassCard contentClassName="gap-3 p-5">
          <View className="flex-row items-center justify-between">
            <Text className="text-starlight text-sm font-semibold">Storage</Text>
            {warning && (
              <Text className="text-warning text-[11px] font-semibold tracking-wide uppercase">
                Nearly full
              </Text>
            )}
          </View>
          <StorageBar used={used} />
          <Text className="text-muted text-xs leading-5">
            {`You are currently using ${formatBytes(used)} of your ${formatBytes(
              FREE_LIMIT_BYTES,
            )} Free Cosmos.`}
          </Text>
        </GlassCard>

        {/* Billing toggle */}
        <BillingToggle period={period} onChange={setPeriod} />

        {notice && <Text className="text-warning px-1 text-xs leading-5">{notice}</Text>}

        {/* Tier cards */}
        <View className="gap-4">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              period={period}
              pending={pending === plan.id}
              onChoose={() => void onChoose(plan)}
            />
          ))}
        </View>

        {/* Trust footer */}
        <View className="mt-1 flex-row items-start gap-2 px-2">
          <Lock size={14} color={MUTED} className="mt-0.5" />
          <Text className="text-muted flex-1 text-[11px] leading-5">
            Secure checkout via Apple App Store / Google Play. Cancel anytime in your device
            settings. Your data is end-to-end encrypted and completely private to you.
          </Text>
        </View>
      </ScrollView>

      {/* Keep the demo-tour teleprompter visible above this modal so the
          pricing beats stay narrated without manually exiting the paywall. */}
      <DemoTourOverlay embedded />
    </View>
  );
}

function BillingToggle({
  period,
  onChange,
}: {
  period: BillingPeriod;
  onChange: (p: BillingPeriod) => void;
}) {
  const options: { id: BillingPeriod; label: string }[] = [
    { id: 'monthly', label: 'Monthly' },
    { id: 'yearly', label: 'Yearly' },
  ];
  return (
    <View
      className="border-glass-border flex-row self-center rounded-full border p-1"
      style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
    >
      {options.map((opt) => {
        const active = period === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            className="flex-row items-center gap-2 rounded-full px-5 py-2"
          >
            {active && (
              <Animated.View
                layout={LinearTransition.duration(220)}
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: ACCENT }}
              />
            )}
            <Text className="text-sm font-semibold" style={{ color: active ? '#0b0c10' : MUTED }}>
              {opt.label}
            </Text>
            {opt.id === 'yearly' && (
              <View
                className="rounded-full px-1.5 py-0.5"
                style={{
                  backgroundColor: active ? 'rgba(11,12,16,0.18)' : 'rgba(69,243,255,0.16)',
                }}
              >
                <Text
                  className="text-[10px] font-bold"
                  style={{ color: active ? '#0b0c10' : ACCENT }}
                >
                  SAVE 15%
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function PlanCard({
  plan,
  period,
  pending,
  onChoose,
}: {
  plan: PlanDef;
  period: BillingPeriod;
  pending: boolean;
  onChoose: () => void;
}) {
  const isFree = plan.id === 'free';
  const price = isFree ? '£0' : period === 'monthly' ? plan.monthly : plan.yearly;
  const cadence = isFree ? 'forever' : period === 'monthly' ? 'month' : 'year';

  return (
    <Animated.View layout={LinearTransition.duration(220)}>
      <GlassCard
        contentClassName="gap-4 p-5"
        style={
          plan.recommended
            ? {
                borderColor: plan.accent,
                shadowColor: plan.accent,
                shadowOpacity: 0.35,
                shadowRadius: 22,
              }
            : undefined
        }
      >
        {plan.recommended && (
          <View
            className="self-start rounded-full px-2.5 py-1"
            style={{ backgroundColor: 'rgba(69,243,255,0.16)' }}
          >
            <Text className="text-accent text-[10px] font-bold tracking-widest uppercase">
              Recommended
            </Text>
          </View>
        )}

        <View className="gap-1">
          <Text className="text-starlight font-display text-xl font-bold">{plan.header}</Text>
          <View className="flex-row items-baseline gap-1">
            <Text className="text-starlight text-3xl font-bold" style={{ color: plan.accent }}>
              {price}
            </Text>
            <Text className="text-muted text-sm">{`/ ${cadence}`}</Text>
            {!isFree && period === 'yearly' && (
              <Text className="text-accent ml-1 text-xs font-semibold">Save 15%</Text>
            )}
          </View>
        </View>

        <View className="gap-2.5">
          {plan.features.map((f) => (
            <View key={f} className="flex-row items-start gap-2.5">
              <View
                className="mt-0.5 h-4 w-4 items-center justify-center rounded-full"
                style={{ backgroundColor: plan.accent }}
              >
                <Check size={11} color="#0b0c10" strokeWidth={3} />
              </View>
              <Text className="text-starlight/90 flex-1 text-sm leading-5">{f}</Text>
            </View>
          ))}
        </View>

        {isFree ? (
          <Button variant="ghost" isDisabled>
            {plan.cta}
          </Button>
        ) : (
          <Pressable
            onPress={onChoose}
            disabled={pending}
            className="items-center justify-center rounded-2xl py-3.5"
            style={{
              backgroundColor: plan.accent,
              shadowColor: plan.accent,
              shadowOpacity: 0.6,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 0 },
              opacity: pending ? 0.7 : 1,
            }}
          >
            <Text className="text-base font-bold" style={{ color: '#0b0c10' }}>
              {pending ? 'Processing…' : plan.cta}
            </Text>
          </Pressable>
        )}
      </GlassCard>
    </Animated.View>
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
      opacity: (1 - progress.value) * 0.3,
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
