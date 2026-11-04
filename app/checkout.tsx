import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Text } from 'heroui-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { addMonths, addYears, format } from 'date-fns';
import { Check, CreditCard, Lock, Wallet, X } from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import * as Haptics from '@/lib/haptics';
import { PLAN_PRICING, type BillingPeriod, type PlanId } from '@/lib/iap';
import { goBack } from '@/lib/navigation';
import { useMemoria } from '@/lib/store';
import { usePalette } from '@/lib/theme';

type PaidPlan = Exclude<PlanId, 'free'>;
type Step = 'review' | 'authorizing' | 'processing' | 'success';
type Method = 'wallet' | 'card';

const PLAN_NAMES: Record<PaidPlan, string> = { personal: 'Premium', family: 'Family Plan' };

const WALLET_NAME =
  Platform.OS === 'ios' ? 'Apple Pay' : Platform.OS === 'android' ? 'Google Pay' : 'Digital wallet';

const AUTHORIZING_TEXT: Record<Method, string> = {
  wallet:
    Platform.OS === 'ios'
      ? 'Confirm with Face ID'
      : Platform.OS === 'android'
        ? 'Confirm with your fingerprint or PIN'
        : 'Confirming your payment',
  card: 'Contacting your bank',
};

/** How long each pretend step takes, in ms. */
const AUTHORIZE_MS = 1500;
const PROCESS_MS = 1300;

/**
 * A pretend checkout for demos: review the order, pick a payment method, confirm, and see a
 * receipt. No payment is taken. Real purchases go through `purchasePlan` in lib/iap.ts.
 */
export default function Checkout() {
  const colors = usePalette();
  const router = useRouter();
  const params = useLocalSearchParams<{ plan?: string; period?: string }>();
  const setTier = useMemoria((s) => s.setTier);

  const plan = params.plan === 'personal' || params.plan === 'family' ? params.plan : null;
  const period: BillingPeriod = params.period === 'monthly' ? 'monthly' : 'yearly';

  const [step, setStep] = useState<Step>('review');
  const [method, setMethod] = useState<Method>('wallet');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  if (!plan) {
    return (
      <View className="bg-void flex-1 items-center justify-center px-8">
        <Text className="text-muted mb-4 text-center">That plan could not be found.</Text>
        <Button variant="ghost" onPress={() => goBack(router)}>
          Back
        </Button>
      </View>
    );
  }

  const price = PLAN_PRICING[plan][period];
  const renews = period === 'monthly' ? addMonths(new Date(), 1) : addYears(new Date(), 1);
  const busy = step === 'authorizing' || step === 'processing';

  const pay = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep('authorizing');
    timers.current.push(
      setTimeout(() => setStep('processing'), AUTHORIZE_MS),
      setTimeout(() => {
        setTier('premium');
        setStep('success');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, AUTHORIZE_MS + PROCESS_MS),
    );
  };

  const finish = () => router.replace('/(tabs)');

  const methods: { id: Method; title: string; subtitle: string; icon: typeof Wallet }[] = [
    { id: 'wallet', title: WALLET_NAME, subtitle: 'Pay with your saved details', icon: Wallet },
    { id: 'card', title: 'Visa ending 4242', subtitle: 'Test card', icon: CreditCard },
  ];

  return (
    <View className="bg-void flex-1">
      <ScrollView contentContainerClassName="px-5 pt-safe-offset-6 pb-48">
        <View className="mb-5 flex-row items-center justify-between">
          <Text className="text-starlight font-heading text-3xl">
            {step === 'success' ? 'Payment complete' : 'Checkout'}
          </Text>
          {step !== 'success' && (
            <Pressable
              onPress={() => goBack(router)}
              disabled={busy}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close checkout"
              accessibilityState={{ disabled: busy }}
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.fg(0.08), opacity: busy ? 0.4 : 1 }}
            >
              <X size={18} color={colors.muted} strokeWidth={2.2} />
            </Pressable>
          )}
        </View>

        {step === 'success' ? (
          <Animated.View entering={FadeIn.duration(300)} className="items-center pt-6">
            <Animated.View
              entering={ZoomIn.springify().damping(12)}
              className="h-24 w-24 items-center justify-center rounded-full"
              style={{
                backgroundColor: colors.accent,
                shadowColor: colors.accent,
                shadowOpacity: 0.5,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 0 },
              }}
            >
              <Check size={46} color={colors.onAccent} strokeWidth={3} />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(250).duration(400)} className="items-center">
              <Text className="text-starlight font-heading mt-6 text-center text-4xl leading-[42px]">
                {`You're on ${PLAN_NAMES[plan]}`}
              </Text>
              <Text className="text-muted mt-2 text-center text-base leading-6">
                Unlimited storage, full constellation mapping and your Reflections feed are now
                unlocked.
              </Text>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(450).duration(400)} className="mt-8 w-full">
              <GlassCard contentClassName="gap-3 p-5">
                <ReceiptRow label="Plan" value={PLAN_NAMES[plan]} />
                <ReceiptRow label="Billed" value={period === 'monthly' ? 'Monthly' : 'Yearly'} />
                <ReceiptRow label="Paid" value={price} strong />
                <ReceiptRow label="Next renewal" value={format(renews, 'PPP')} />
                <ReceiptRow
                  label="Paid with"
                  value={method === 'wallet' ? WALLET_NAME : 'Visa 4242'}
                />
              </GlassCard>
            </Animated.View>
          </Animated.View>
        ) : busy ? (
          <Animated.View entering={FadeIn.duration(250)} className="items-center pt-20">
            <ActivityIndicator size="large" color={colors.accent} />
            <Text className="text-starlight mt-6 text-lg font-semibold">
              {step === 'authorizing' ? AUTHORIZING_TEXT[method] : 'Processing your payment'}
            </Text>
            <Text className="text-muted mt-1 text-sm">Please keep this screen open</Text>
          </Animated.View>
        ) : (
          <>
            <GlassCard contentClassName="gap-3 p-5">
              <Text className="text-muted text-xs font-semibold tracking-widest uppercase">
                Order summary
              </Text>
              <View className="flex-row items-baseline justify-between">
                <Text className="text-starlight text-xl font-semibold">{PLAN_NAMES[plan]}</Text>
                <Text className="text-starlight text-xl font-bold">{price}</Text>
              </View>
              <Text className="text-muted text-sm">
                {`Billed ${period === 'monthly' ? 'monthly' : 'yearly'}. Renews ${format(renews, 'PPP')}.`}
              </Text>
              <View className="bg-glass-border my-1 h-px" />
              <ReceiptRow label="Total today" value={price} strong />
            </GlassCard>

            <Text className="text-muted mt-7 mb-3 text-xs font-semibold tracking-widest uppercase">
              Payment method
            </Text>
            <View className="gap-3">
              {methods.map((m) => {
                const selected = m.id === method;
                const Icon = m.icon;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setMethod(m.id)}
                    accessibilityRole="radio"
                    accessibilityLabel={`${m.title}, ${m.subtitle}`}
                    accessibilityState={{ selected }}
                    className="flex-row items-center gap-3 rounded-2xl border px-4 py-3.5"
                    style={{
                      borderColor: selected ? colors.accent : colors.fg(0.14),
                      backgroundColor: selected ? colors.accentA(0.08) : colors.fg(0.03),
                    }}
                  >
                    <View
                      className="h-10 w-10 items-center justify-center rounded-full"
                      style={{ backgroundColor: colors.accentA(0.12) }}
                    >
                      <Icon size={19} color={colors.accent} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-starlight font-medium">{m.title}</Text>
                      <Text className="text-muted text-xs">{m.subtitle}</Text>
                    </View>
                    <View
                      className="h-5 w-5 items-center justify-center rounded-full border-2"
                      style={{ borderColor: selected ? colors.accent : colors.fg(0.3) }}
                    >
                      {selected ? (
                        <View
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: colors.accent }}
                        />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-6 flex-row items-center gap-2">
              <Lock size={14} color={colors.muted} />
              <Text className="text-muted flex-1 text-xs leading-5">
                Demo checkout. No real payment is taken.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {step !== 'authorizing' && step !== 'processing' && (
        <View className="border-glass-border bg-void/95 pb-safe-offset-4 absolute inset-x-0 bottom-0 border-t px-5 pt-4">
          {step === 'success' ? (
            <Button onPress={finish}>Start exploring</Button>
          ) : (
            <Button onPress={pay}>{`Pay ${price}`}</Button>
          )}
        </View>
      )}
    </View>
  );
}

function ReceiptRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-muted text-sm">{label}</Text>
      <Text
        className={strong ? 'text-starlight text-base font-bold' : 'text-starlight text-sm'}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}
