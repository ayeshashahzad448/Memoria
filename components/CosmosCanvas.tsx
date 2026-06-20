// oxlint-disable react/style-prop-object -- Skia uses style="stroke"|"fill" as a paint property, not a React Native style object
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { Canvas, Circle, Group, Line, Blur, Fill, vec } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  clamp,
  type SharedValue,
} from 'react-native-reanimated';

import type { Constellation, MemoryStar } from '@/lib/types';
import { colorFor, radiusForText, MIN_STAR_RADIUS } from '@/lib/memoria';

interface CosmosCanvasProps {
  stars: MemoryStar[];
  constellations: Constellation[];
  /** Star ids whose constellation lines should be visible. */
  revealedStarIds: string[];
  selectedStarId?: string;
  /** Star ids the user has multi-selected for forging. */
  forgingStarIds: string[];
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

export function CosmosCanvas(props: CosmosCanvasProps) {
  const {
    stars,
    constellations,
    revealedStarIds,
    selectedStarId,
    forgingStarIds,
    onTapStar,
    onTapEmpty,
  } = props;
  const { width, height } = useWindowDimensions();

  // World extent: normalized -1..1 mapped to a span larger than the screen.
  const span = Math.max(width, height) * 1.15;

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

  // Continuous twinkle clock on the UI thread (loops 0 -> 1 forever).
  const clockStarted = useRef(false);
  useEffect(() => {
    if (clockStarted.current) return;
    clockStarted.current = true;
    clock.value = withRepeat(withTiming(6, { duration: 15000, easing: Easing.linear }), -1, false);
  });

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
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
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
    if (hit) onTapStar(hit);
    else onTapEmpty();
  });

  const gesture = Gesture.Simultaneous(Gesture.Race(tap, pan), pinch);

  return (
    <GestureDetector gesture={gesture}>
      <Canvas style={{ flex: 1 }}>
        <Fill color="#0b0e1f" />
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

  // Twinkle = gentle, slow brightness shimmer. Hybrid star: a small bright
  // white-blue core sits inside a faint colored halo, so emotion stays legible
  // while the point of light reads as realistic.
  const twinkle = (t: number): number => {
    'worklet';
    const a = Math.sin((t * rate + phase) * Math.PI * 2);
    const b = Math.sin((t * rate * 1.7 + phase * 1.7) * Math.PI * 2);
    const mixed = (a * 0.7 + b * 0.3 + 1) / 2; // 0..1
    // Soft curve keeps most of the range near steady; no sharp flicker.
    return Math.pow(mixed, 1.4) * liveliness;
  };

  const haloRadius = useDerivedValue(() => {
    return radius + 7 + (isSelected || isForging ? 6 : 0) + twinkle(clock.value) * 1.5;
  });

  const coreOpacity = useDerivedValue(() => 0.82 + 0.18 * twinkle(clock.value));

  const haloOpacity = useDerivedValue(() => {
    const base = isSelected || isForging ? 0.4 : 0.2;
    return base + 0.12 * twinkle(clock.value);
  });

  // White-blue core radius: small and tight, scaled gently by memory weight.
  const coreR = Math.max(radius * 0.5, MIN_STAR_RADIUS * 0.6);

  return (
    <Group>
      {/* Faint colored halo (emotion) */}
      <Circle cx={pos.x} cy={pos.y} r={haloRadius} color={color} opacity={haloOpacity}>
        <Blur blur={Math.max(7, radius)} />
      </Circle>
      {/* Selection / forging ring */}
      {(isSelected || isForging) && (
        <Circle
          cx={pos.x}
          cy={pos.y}
          r={radius + 10}
          color={isForging ? '#FFE066' : '#FFFFFF'}
          style="stroke"
          strokeWidth={1.5}
          opacity={0.8}
        />
      )}
      {/* Soft white-blue inner bloom */}
      <Circle cx={pos.x} cy={pos.y} r={coreR + 2.5} color="#CFE3FF" opacity={coreOpacity}>
        <Blur blur={2} />
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
        if (!isVisible) return null;
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
        return (
          <Group key={c.id}>
            {segments.map((seg) => (
              <Line
                key={seg.key}
                p1={vec(seg.p1.x, seg.p1.y)}
                p2={vec(seg.p2.x, seg.p2.y)}
                color="#8FA6E8"
                style="stroke"
                strokeWidth={0.75}
                opacity={0.38}
              />
            ))}
          </Group>
        );
      })}
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
          <Circle key={b.id} cx={b.x} cy={b.y} r={b.r} color="#5E6BBF" opacity={b.o} />
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
