// oxlint-disable react/style-prop-object -- Skia uses style="stroke"|"fill" as a paint property, not a React Native style object
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { Canvas, Circle, Group, Line, Blur, Fill, vec } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import {
  Easing,
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withDecay,
  withRepeat,
  withSpring,
  withTiming,
  clamp,
  type SharedValue,
} from 'react-native-reanimated';

import type { Constellation, MemoryStar } from '@/lib/types';
import { colorFor, panBoundsForCount, radiusForText, MIN_STAR_RADIUS } from '@/lib/memoria';

interface CosmosCanvasProps {
  stars: MemoryStar[];
  constellations: Constellation[];
  /** Star ids whose constellation lines should be visible. */
  revealedStarIds: string[];
  selectedStarId?: string;
  /** Star ids the user has multi-selected for forging. */
  forgingStarIds: string[];
  /** A star to smoothly pan/zoom to and focus (e.g. coming from search). */
  focusStarId?: string | null;
  onTapStar: (star: MemoryStar) => void;
  onTapEmpty: () => void;
}

interface PlacedStar {
  star: MemoryStar;
  /** Screen-space radius for this star (pre-zoom). */
  radius: number;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;

/** Deterministic pseudo-random in [0,1) from a string seed. */
function seed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/** Snap a pan offset back inside the elastic boundary with a soft spring. */
function settleAxis(value: SharedValue<number>, bound: number) {
  'worklet';
  if (value.value > bound) value.value = withSpring(bound, { damping: 18, stiffness: 120 });
  else if (value.value < -bound) value.value = withSpring(-bound, { damping: 18, stiffness: 120 });
}

export function CosmosCanvas(props: CosmosCanvasProps) {
  const {
    stars,
    constellations,
    revealedStarIds,
    selectedStarId,
    forgingStarIds,
    focusStarId,
    onTapStar,
    onTapEmpty,
  } = props;
  const { width, height } = useWindowDimensions();

  // World extent: normalized -1..1 mapped to a span larger than the screen.
  const span = Math.max(width, height) * 1.15;

  // Elastic pan boundary that expands with memory density.
  const boundsX = panBoundsForCount(stars.length, width);
  const boundsY = panBoundsForCount(stars.length, height);
  // Width of one "sector" used to fire a light haptic when crossing into newly
  // revealed procedural space.
  const sectorSize = Math.max(width, height) * 0.6;

  const placed = useMemo<PlacedStar[]>(
    () =>
      stars.map((star) => ({
        star,
        radius: radiusForText(star.story.length > 0 ? star.story : star.title),
      })),
    [stars],
  );

  // Map normalized coords to screen center-anchored pixels.
  const toScreen = useCallback(
    (nx: number, ny: number) => ({
      x: width / 2 + nx * (span / 2),
      y: height / 2 + ny * (span / 2),
    }),
    [width, height, span],
  );

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const clock = useSharedValue(0);
  // Last sector index crossed, used to fire a light haptic on a new sector.
  const lastSector = useSharedValue(0);

  // Continuous twinkle clock on the UI thread (loops 0 -> 1 forever).
  const clockStarted = useRef(false);
  useEffect(() => {
    if (clockStarted.current) return;
    clockStarted.current = true;
    clock.value = withRepeat(withTiming(6, { duration: 15000, easing: Easing.linear }), -1, false);
  });

  const lightTick = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);
  const focusTick = useCallback(() => {
    void Haptics.selectionAsync();
  }, []);

  // Smoothly pan/zoom deep into a requested star (e.g. tapped from search).
  // A longer, eased fly-in reads as a cinematic dive toward the star rather
  // than a quick jump.
  useEffect(() => {
    if (!focusStarId) return;
    const target = placed.find((p) => p.star.id === focusStarId);
    if (!target) return;
    const s = toScreen(target.star.x, target.star.y);
    const targetScale = 2.8;
    // Center the star: tx + s.x * scale = width/2.
    const nextTx = width / 2 - s.x * targetScale;
    const nextTy = height / 2 - s.y * targetScale;
    const ease = Easing.inOut(Easing.cubic);
    scale.value = withTiming(targetScale, { duration: 1100, easing: ease });
    tx.value = withTiming(nextTx, { duration: 1100, easing: ease });
    ty.value = withTiming(nextTy, { duration: 1100, easing: ease });
    focusTick();
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [focusStarId, placed, toScreen, width, height]);

  const transform = useDerivedValue(() => [
    { translateX: tx.value },
    { translateY: ty.value },
    { scale: scale.value },
  ]);

  const pan = Gesture.Pan()
    .onStart(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    })
    .onUpdate((e) => {
      // Loose, fluid drag with rubber-banding once past the soft boundary.
      const rawX = savedTx.value + e.translationX;
      const rawY = savedTy.value + e.translationY;
      tx.value = rawX > boundsX || rawX < -boundsX ? savedTx.value + e.translationX * 0.4 : rawX;
      ty.value = rawY > boundsY || rawY < -boundsY ? savedTy.value + e.translationY * 0.4 : rawY;
      // Haptic pulse when gliding into a freshly generated sector.
      const sector = Math.round(Math.hypot(tx.value, ty.value) / sectorSize);
      if (sector !== lastSector.value) {
        lastSector.value = sector;
        runOnJS(lightTick)();
      }
    })
    .onEnd((e) => {
      // Weightless momentum: glide to a stop, then settle inside the boundary.
      tx.value = withDecay({ velocity: e.velocityX, deceleration: 0.997 }, () =>
        settleAxis(tx, boundsX),
      );
      ty.value = withDecay({ velocity: e.velocityY, deceleration: 0.997 }, () =>
        settleAxis(ty, boundsY),
      );
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
    });

  const tap = Gesture.Tap().onEnd((e) => {
    // Convert screen tap into world space accounting for current transform.
    const wx = (e.x - tx.value) / scale.value;
    const wy = (e.y - ty.value) / scale.value;
    let hit: MemoryStar | null = null;
    let hitDist = Number.POSITIVE_INFINITY;
    for (const p of placed) {
      const s = toScreen(p.star.x, p.star.y);
      const d = Math.hypot(s.x - wx, s.y - wy);
      const touchR = Math.max(p.radius, 14) + 12;
      if (d < touchR && d < hitDist) {
        hit = p.star;
        hitDist = d;
      }
    }
    if (hit) {
      runOnJS(focusTick)();
      runOnJS(onTapStar)(hit);
    } else runOnJS(onTapEmpty)();
  });

  const gesture = Gesture.Simultaneous(Gesture.Race(tap, pan), pinch);

  return (
    <GestureDetector gesture={gesture}>
      <Canvas style={{ flex: 1 }}>
        <Fill color="#0b0c10" />
        <BackgroundStarfield width={width} height={height} clock={clock} />
        <Group transform={transform}>
          <ConstellationLines
            placed={placed}
            constellations={constellations}
            revealedStarIds={revealedStarIds}
            toScreen={toScreen}
          />
          {placed.map((p) => (
            <MemoryStarShape
              key={p.star.id}
              placed={p}
              clock={clock}
              toScreen={toScreen}
              isSelected={p.star.id === selectedStarId}
              isForging={forgingStarIds.includes(p.star.id)}
            />
          ))}
        </Group>
      </Canvas>
    </GestureDetector>
  );
}

function MemoryStarShape({
  placed,
  clock,
  toScreen,
  isSelected,
  isForging,
}: {
  placed: PlacedStar;
  clock: SharedValue<number>;
  toScreen: (x: number, y: number) => { x: number; y: number };
  isSelected: boolean;
  isForging: boolean;
}) {
  const { star, radius } = placed;
  const pos = toScreen(star.x, star.y);
  const color = colorFor(star.colorKey).hex;
  const phase = seed(star.id);
  // Each star twinkles at its own slow rate. Most stars barely shimmer.
  const rate = 0.5 + seed(`${star.id}-rate`) * 0.7;
  // A portion of stars are "steady" (almost no twinkle), like a real sky.
  const liveliness = 0.35 + seed(`${star.id}-live`) * 0.65;

  // Twinkle = gentle, slow brightness shimmer. A real star is a tight bright
  // point with a faint bloom; the emotion color tints the bloom subtly rather
  // than surrounding the star with an obvious colored disc.
  const twinkle = (t: number): number => {
    'worklet';
    const a = Math.sin((t * rate + phase) * Math.PI * 2);
    const b = Math.sin((t * rate * 1.7 + phase * 1.7) * Math.PI * 2);
    const mixed = (a * 0.7 + b * 0.3 + 1) / 2; // 0..1
    // Soft curve keeps most of the range near steady; no sharp flicker.
    return Math.pow(mixed, 1.4) * liveliness;
  };

  const active = isSelected || isForging;

  // White-blue core radius: small and tight, scaled gently by memory weight.
  const coreR = Math.max(radius * 0.42, MIN_STAR_RADIUS * 0.7);
  // Tight colored bloom — a soft glow hugging the core, not a wide disc.
  const bloomR = coreR + Math.max(2.5, radius * 0.5) + (active ? 4 : 0);
  // Faint diffraction glint length, scaled to brightness of the star.
  const spikeLen = coreR + radius * 0.9 + 4;

  const coreOpacity = useDerivedValue(() => 0.85 + 0.15 * twinkle(clock.value));

  const bloomOpacity = useDerivedValue(() => {
    const base = active ? 0.5 : 0.32;
    return base + 0.16 * twinkle(clock.value);
  });

  const bloomScale = useDerivedValue(() => bloomR + twinkle(clock.value) * 1.2);

  // Diffraction spikes fade with twinkle so brighter moments sparkle.
  const spikeOpacity = useDerivedValue(
    () => (0.18 + 0.32 * twinkle(clock.value)) * (active ? 1.4 : 1),
  );

  return (
    <Group>
      {/* Tight colored bloom (emotion tint), hugging the star */}
      <Circle cx={pos.x} cy={pos.y} r={bloomScale} color={color} opacity={bloomOpacity}>
        <Blur blur={Math.max(3, radius * 0.6)} />
      </Circle>
      {/* Subtle diffraction glint — thin cross that makes it read as a real star */}
      <Group opacity={spikeOpacity}>
        <Line
          p1={vec(pos.x - spikeLen, pos.y)}
          p2={vec(pos.x + spikeLen, pos.y)}
          color="#EAF2FF"
          style="stroke"
          strokeWidth={0.7}
        >
          <Blur blur={0.6} />
        </Line>
        <Line
          p1={vec(pos.x, pos.y - spikeLen)}
          p2={vec(pos.x, pos.y + spikeLen)}
          color="#EAF2FF"
          style="stroke"
          strokeWidth={0.7}
        >
          <Blur blur={0.6} />
        </Line>
      </Group>
      {/* Selection / forging ring */}
      {active && (
        <Circle
          cx={pos.x}
          cy={pos.y}
          r={radius + 10}
          color={isForging ? '#FFE066' : '#FFFFFF'}
          style="stroke"
          strokeWidth={1.5}
          opacity={0.85}
        />
      )}
      {/* Soft white-blue inner bloom */}
      <Circle cx={pos.x} cy={pos.y} r={coreR + 1.5} color="#CFE3FF" opacity={coreOpacity}>
        <Blur blur={1.4} />
      </Circle>
      {/* Bright white core */}
      <Circle cx={pos.x} cy={pos.y} r={coreR} color="#FFFFFF" opacity={coreOpacity} />
    </Group>
  );
}

function ConstellationLines({
  placed,
  constellations,
  revealedStarIds,
  toScreen,
}: {
  placed: PlacedStar[];
  constellations: Constellation[];
  revealedStarIds: string[];
  toScreen: (x: number, y: number) => { x: number; y: number };
}) {
  const byId = useMemo(() => {
    const m = new Map<string, PlacedStar>();
    for (const p of placed) m.set(p.star.id, p);
    return m;
  }, [placed]);

  const revealed = useMemo(() => new Set(revealedStarIds), [revealedStarIds]);

  return (
    <Group>
      {constellations.map((c) => {
        const isVisible = c.starIds.some((id) => revealed.has(id));
        // Connect chronologically: order by the star's date.
        const ordered = [...c.starIds]
          .map((id) => byId.get(id))
          .filter((p): p is PlacedStar => Boolean(p))
          .sort((a, b) => a.star.date.localeCompare(b.star.date));
        const segments: {
          key: string;
          p1: { x: number; y: number };
          p2: { x: number; y: number };
        }[] = [];
        for (let i = 0; i < ordered.length - 1; i += 1) {
          segments.push({
            key: `${ordered[i].star.id}-${ordered[i + 1].star.id}`,
            p1: toScreen(ordered[i].star.x, ordered[i].star.y),
            p2: toScreen(ordered[i + 1].star.x, ordered[i + 1].star.y),
          });
        }
        return <ConstellationGroup key={c.id} segments={segments} visible={isVisible} />;
      })}
    </Group>
  );
}

/** A single constellation's line segments, with opacity that fades in/out. */
function ConstellationGroup({
  segments,
  visible,
}: {
  segments: { key: string; p1: { x: number; y: number }; p2: { x: number; y: number } }[];
  visible: boolean;
}) {
  const progress = useSharedValue(visible ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: visible ? 600 : 350,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [visible, progress]);

  const lineOpacity = useDerivedValue(() => 0.55 * progress.value);

  return (
    <Group opacity={lineOpacity}>
      {segments.map((seg) => (
        <Line
          key={seg.key}
          p1={vec(seg.p1.x, seg.p1.y)}
          p2={vec(seg.p2.x, seg.p2.y)}
          color="#9D5CFF"
          style="stroke"
          strokeWidth={0.8}
        />
      ))}
    </Group>
  );
}

function BackgroundStarfield({
  width,
  height,
  clock,
}: {
  width: number;
  height: number;
  clock: SharedValue<number>;
}) {
  // Static distant dust that twinkles faintly; not interactive.
  const dust = useMemo(() => {
    const arr: { id: string; x: number; y: number; r: number; phase: number }[] = [];
    for (let i = 0; i < 110; i += 1) {
      arr.push({
        id: `dust-${i}`,
        x: seed(`x${i}`) * width,
        y: seed(`y${i}`) * height,
        r: 0.4 + seed(`r${i}`) * 1.2,
        phase: seed(`p${i}`),
      });
    }
    return arr;
  }, [width, height]);

  // Faint Milky Way band: a soft diagonal haze made of overlapping blurred blobs.
  const band = useMemo(() => {
    const arr: { id: string; x: number; y: number; r: number; o: number }[] = [];
    const count = 7;
    for (let i = 0; i < count; i += 1) {
      const t = i / (count - 1);
      arr.push({
        id: `band-${i}`,
        // Diagonal sweep across the screen.
        x: width * (0.12 + t * 0.78),
        y: height * (0.78 - t * 0.6) + (seed(`by${i}`) - 0.5) * height * 0.12,
        r: Math.max(width, height) * (0.22 + seed(`br${i}`) * 0.12),
        o: 0.05 + seed(`bo${i}`) * 0.04,
      });
    }
    return arr;
  }, [width, height]);

  return (
    <Group>
      {/* Milky Way haze */}
      <Group>
        <Blur blur={70} />
        {band.map((b) => (
          <Circle key={b.id} cx={b.x} cy={b.y} r={b.r} color="#3A2E6B" opacity={b.o} />
        ))}
      </Group>
      {dust.map((d) => (
        <DustStar key={d.id} d={d} clock={clock} />
      ))}
    </Group>
  );
}

function DustStar({
  d,
  clock,
}: {
  d: { id: string; x: number; y: number; r: number; phase: number };
  clock: SharedValue<number>;
}) {
  const opacity = useDerivedValue(() => {
    const a = Math.sin((clock.value * 0.8 + d.phase) * Math.PI * 2);
    const b = Math.sin((clock.value * 1.3 + d.phase * 2.2) * Math.PI * 2);
    const mixed = (a * 0.7 + b * 0.3 + 1) / 2;
    return 0.1 + 0.32 * Math.pow(mixed, 1.6);
  });
  return <Circle cx={d.x} cy={d.y} r={d.r} color="#DCE6FF" opacity={opacity} />;
}
