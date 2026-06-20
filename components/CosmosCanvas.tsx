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
    clock.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.linear }), -1, false);
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

  // Twinkle: pulse glow radius and core opacity.
  const glowRadius = useDerivedValue(() => {
    const pulse = (Math.sin((clock.value + phase) * Math.PI * 2) + 1) / 2;
    const base = radius + 8;
    const extra = (isSelected || isForging ? 14 : 8) * pulse;
    return base + extra;
  });

  const coreOpacity = useDerivedValue(() => {
    const pulse = (Math.sin((clock.value + phase) * Math.PI * 2) + 1) / 2;
    return 0.7 + 0.3 * pulse;
  });

  const glowOpacity = useDerivedValue(() => {
    const pulse = (Math.sin((clock.value + phase) * Math.PI * 2) + 1) / 2;
    return (isSelected || isForging ? 0.5 : 0.32) + 0.18 * pulse;
  });

  return (
    <Group>
      {/* Outer glow */}
      <Circle cx={pos.x} cy={pos.y} r={glowRadius} color={color} opacity={glowOpacity}>
        <Blur blur={Math.max(8, radius)} />
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
      {/* Bright core */}
      <Circle
        cx={pos.x}
        cy={pos.y}
        r={Math.max(radius, MIN_STAR_RADIUS)}
        color={color}
        opacity={coreOpacity}
      />
      {/* White center pin */}
      <Circle
        cx={pos.x}
        cy={pos.y}
        r={Math.max(radius * 0.32, 1.5)}
        color="#FFFFFF"
        opacity={0.95}
      />
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
                color="#9FB4FF"
                style="stroke"
                strokeWidth={1}
                opacity={0.5}
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
    for (let i = 0; i < 90; i += 1) {
      arr.push({
        id: `dust-${i}`,
        x: seed(`x${i}`) * width,
        y: seed(`y${i}`) * height,
        r: 0.5 + seed(`r${i}`) * 1.4,
        phase: seed(`p${i}`),
      });
    }
    return arr;
  }, [width, height]);

  return (
    <Group>
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
    const pulse = (Math.sin((clock.value + d.phase) * Math.PI * 2) + 1) / 2;
    return 0.12 + 0.35 * pulse;
  });
  return <Circle cx={d.x} cy={d.y} r={d.r} color="#FFFFFF" opacity={opacity} />;
}
