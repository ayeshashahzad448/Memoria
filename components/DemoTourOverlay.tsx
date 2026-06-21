import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from 'heroui-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import {
  ChevronRight,
  Eye,
  EyeOff,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { useMemoria } from '@/lib/store';
import { TOUR_STEPS, type TourContext } from '@/lib/demoTour';
import { colorFor } from '@/lib/memoria';

const ACCENT = colorFor('cyan').hex;
const MUTED = '#94A3B8';

/** Thrown to unwind a step's pending waits when the tour is cancelled/jumped. */
const CANCELLED = Symbol('tour-cancelled');

/**
 * Drives the guided product walkthrough used for recording a demo video.
 *
 * It runs the TOUR_STEPS script on its own: each step performs an action that
 * navigates the app and mutates store state, then holds for the step's
 * duration before auto-advancing. A small floating controller shows the
 * current narration line (the script you read for the voiceover) plus
 * play/pause, step back/forward, hide, and exit — none of which need to appear
 * in the final recording (you can crop it, or hide it entirely).
 *
 * Mounted at the root so it survives navigation between screens. A second,
 * `embedded` copy can be rendered inside native modal screens (e.g. the
 * paywall) so the teleprompter stays visible above the modal — the embedded
 * copy is display + controls only and does not run the tour actions, so the
 * single root runner stays the sole driver.
 */
export function DemoTourOverlay({ embedded = false }: { embedded?: boolean }) {
  const active = useMemoria((s) => s.demoTourActive);
  if (!active) return null;
  return embedded ? <TourController /> : <TourRunner />;
}

/**
 * The root, driving instance. Owns the action/timer loop and publishes its
 * current step + paused state to the store, then renders the shared controller.
 */
function TourRunner() {
  const router = useRouter();
  const index = useMemoria((s) => s.demoTourIndex);
  const paused = useMemoria((s) => s.demoTourPaused);
  const setIndex = useMemoria((s) => s.setDemoTourIndex);
  const setDemoTourActive = useMemoria((s) => s.setDemoTourActive);

  const step = TOUR_STEPS[index];

  const progress = useSharedValue(0);

  // Cancellation: every pending wait checks this token; bumping it unwinds the
  // current step so we can jump/pause without overlapping timers.
  const tokenRef = useRef(0);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  // Run the active step: perform its action, then hold for its duration while
  // respecting pause. Bumping tokenRef (via store index/active changes) cancels.
  useEffect(() => {
    const myToken = (tokenRef.current += 1);
    let cancelled = false;

    const isStale = () => cancelled || tokenRef.current !== myToken;

    // Run a clock for `ms` of *unpaused* time, optionally reporting progress in
    // [0,1]. Resolves when elapsed; rejects (CANCELLED) if the step is stale.
    const runClock = (ms: number, onProgress?: (t: number) => void) =>
      new Promise<void>((resolve, reject) => {
        let remaining = ms;
        let last = Date.now();
        const tick = () => {
          if (isStale()) {
            reject(CANCELLED);
            return;
          }
          const now = Date.now();
          if (!pausedRef.current) remaining -= now - last;
          last = now;
          onProgress?.(Math.max(0, Math.min(1, 1 - remaining / ms)));
          if (remaining <= 0) {
            resolve();
            return;
          }
          setTimeout(tick, 60);
        };
        setTimeout(tick, 60);
      });

    const wait = (ms: number) => runClock(ms);

    const ctx: TourContext = {
      router,
      get store() {
        return useMemoria.getState();
      },
      wait,
    };

    const run = async () => {
      try {
        progress.value = 0;
        if (step.action) await step.action(ctx);
        // Fill the bar across the remaining hold time.
        const from = progress.value;
        await runClock(step.duration, (t) => {
          progress.value = from + (1 - from) * t;
        });
        if (isStale()) return;
        // Auto-advance, or end on the last step.
        if (index < TOUR_STEPS.length - 1) {
          setIndex(index + 1);
        } else {
          tokenRef.current += 1;
          setDemoTourActive(false);
        }
      } catch (e) {
        if (e !== CANCELLED) throw e;
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [index, step, router, setIndex, setDemoTourActive, progress]);

  return <TourController progress={progress} />;
}

/**
 * The shared visual controller. Reads the current step + paused state from the
 * store and writes control intents back to it (so both the root runner and any
 * embedded copy stay in sync). When `progress` is omitted (embedded copies) the
 * bar is driven from the store-published step instead.
 */
function TourController({ progress }: { progress?: ReturnType<typeof useSharedValue<number>> }) {
  const index = useMemoria((s) => s.demoTourIndex);
  const paused = useMemoria((s) => s.demoTourPaused);
  const setIndex = useMemoria((s) => s.setDemoTourIndex);
  const setPaused = useMemoria((s) => s.setDemoTourPaused);
  const setDemoTourActive = useMemoria((s) => s.setDemoTourActive);

  const [hidden, setHidden] = useState(false);

  const step = TOUR_STEPS[index];
  const total = TOUR_STEPS.length;

  const goTo = useCallback(
    (next: number) => {
      setIndex(Math.max(0, Math.min(TOUR_STEPS.length - 1, next)));
    },
    [setIndex],
  );

  const exit = useCallback(() => {
    setDemoTourActive(false);
  }, [setDemoTourActive]);

  // Embedded copies have no live progress signal, so fall back to a static bar
  // that reflects how far through the script we are.
  const fallback = useSharedValue(0);
  fallback.value = total > 1 ? index / (total - 1) : 0;
  const barStyle = useAnimatedStyle(() => ({
    width: `${(progress ?? fallback).value * 100}%`,
  }));

  const narration = useMemo(() => step.narration, [step]);

  // When hidden, show only a tiny pill to bring the controller back.
  if (hidden) {
    return (
      <View
        className="pt-safe-offset-2 absolute inset-x-0 top-0 items-center"
        pointerEvents="box-none"
        style={overlayLayer}
      >
        <Pressable onPress={() => setHidden(false)} hitSlop={10}>
          <View
            className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{
              backgroundColor: 'rgba(11,12,16,0.7)',
              borderColor: `${ACCENT}55`,
              borderWidth: 1,
            }}
          >
            <Eye size={13} color={ACCENT} />
            <Text className="text-[11px] font-medium" style={{ color: ACCENT }}>
              Demo tour
            </Text>
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      className="pb-safe-offset-2 absolute inset-x-0 bottom-0 px-3"
      pointerEvents="box-none"
      style={overlayLayer}
    >
      <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
        <GlassCard intensity={48} contentClassName="gap-3 p-4">
          {/* Header: step counter + hide / exit */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: paused ? MUTED : ACCENT }}
              />
              <Text className="text-muted text-[11px] font-semibold tracking-widest uppercase">
                Demo tour · {index + 1}/{total}
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <Pressable onPress={() => setHidden(true)} hitSlop={8}>
                <EyeOff size={16} color={MUTED} />
              </Pressable>
              <Pressable onPress={exit} hitSlop={8}>
                <X size={18} color={MUTED} />
              </Pressable>
            </View>
          </View>

          {/* Narration teleprompter — read this aloud */}
          <Text className="text-starlight text-[15px] leading-6">{narration}</Text>

          {/* Progress bar */}
          <View
            className="h-1 overflow-hidden rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
          >
            <Animated.View
              className="h-full rounded-full"
              style={[{ backgroundColor: ACCENT }, barStyle]}
            />
          </View>

          {/* Transport controls */}
          <View className="flex-row items-center justify-center gap-6 pt-0.5">
            <Pressable onPress={() => goTo(index - 1)} hitSlop={10} disabled={index === 0}>
              <SkipBack size={20} color={index === 0 ? 'rgba(148,163,184,0.4)' : MUTED} />
            </Pressable>
            <Pressable onPress={() => setPaused(!paused)} hitSlop={12}>
              <View
                className="h-11 w-11 items-center justify-center rounded-full"
                style={{
                  backgroundColor: `${ACCENT}22`,
                  borderColor: `${ACCENT}66`,
                  borderWidth: 1,
                }}
              >
                {paused ? (
                  <Play size={20} color={ACCENT} fill={ACCENT} />
                ) : (
                  <Pause size={20} color={ACCENT} fill={ACCENT} />
                )}
              </View>
            </Pressable>
            <Pressable onPress={() => goTo(index + 1)} hitSlop={10} disabled={index === total - 1}>
              {index === total - 1 ? (
                <ChevronRight size={20} color="rgba(148,163,184,0.4)" />
              ) : (
                <SkipForward size={20} color={MUTED} />
              )}
            </Pressable>
          </View>
        </GlassCard>
      </Animated.View>
    </View>
  );
}

// Keep the controller above every screen, including native modals.
const overlayLayer = {
  zIndex: 9999,
  ...(Platform.OS === 'android' ? { elevation: 24 } : null),
} as const;
