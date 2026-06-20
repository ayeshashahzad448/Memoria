import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  clamp,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { Constellation, MemoryStar } from '@/lib/types';
import { colorFor, panBoundsForCount, radiusForText, MIN_STAR_RADIUS } from '@/lib/memoria';

interface CosmosCanvasProps {
  stars: MemoryStar[];
  constellations: Constellation[];
  revealedStarIds: string[];
  selectedStarId?: string;
  forgingStarIds: string[];
  focusStarId?: string | null;
  onTapStar: (star: MemoryStar) => void;
  onTapEmpty: () => void;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;

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

/**
 * Rubber-band a raw offset past a soft boundary so the world resists, not
 * teleports, when dragged beyond its bounds.
 */
function rubberBand(raw: number, bound: number): number {
  'worklet';
  if (raw > bound) return bound + (raw - bound) * 0.4;
  if (raw < -bound) return -bound + (raw + bound) * 0.4;
  return raw;
}

/**
 * Web fallback for the cosmos. Skia's CanvasKit does not bundle for web here,
 * so stars and constellation lines are rendered with Views while keeping
 * pan/pinch/tap interactions via gesture-handler + reanimated.
 */
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
  const span = Math.max(width, height) * 1.15;
  const boundsX = panBoundsForCount(stars.length, width);
  const boundsY = panBoundsForCount(stars.length, height);

  const placed = useMemo(
    () =>
      stars.map((star) => ({
        star,
        radius: radiusForText(star.story.length > 0 ? star.story : star.title),
      })),
    [stars],
  );

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
  const pinchFocalX = useSharedValue(0);
  const pinchFocalY = useSharedValue(0);

  // Smoothly pan/zoom deep into a requested star (e.g. tapped from search).
  useEffect(() => {
    if (!focusStarId) return;
    const target = placed.find((p) => p.star.id === focusStarId);
    if (!target) return;
    const s = toScreen(target.star.x, target.star.y);
    const targetScale = 2.8;
    const nextTx = width / 2 - s.x * targetScale;
    const nextTy = height / 2 - s.y * targetScale;
    const ease = Easing.inOut(Easing.cubic);
    scale.value = withTiming(targetScale, { duration: 1100, easing: ease });
    tx.value = withTiming(nextTx, { duration: 1100, easing: ease });
    ty.value = withTiming(nextTy, { duration: 1100, easing: ease });
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [focusStarId, placed, toScreen, width, height]);

  const pan = Gesture.Pan()
    .maxPointers(1)
    .onStart(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = rubberBand(savedTx.value + e.translationX, boundsX);
      ty.value = rubberBand(savedTy.value + e.translationY, boundsY);
    })
    .onEnd((e) => {
      tx.value = withDecay(
        {
          velocity: e.velocityX,
          deceleration: 0.997,
          clamp: [-boundsX, boundsX],
          rubberBandEffect: true,
        },
        () => settleAxis(tx, boundsX),
      );
      ty.value = withDecay(
        {
          velocity: e.velocityY,
          deceleration: 0.997,
          clamp: [-boundsY, boundsY],
          rubberBandEffect: true,
        },
        () => settleAxis(ty, boundsY),
      );
    });

  const pinch = Gesture.Pinch()
    .onStart((e) => {
      savedScale.value = scale.value;
      savedTx.value = tx.value;
      savedTy.value = ty.value;
      pinchFocalX.value = e.focalX;
      pinchFocalY.value = e.focalY;
    })
    .onUpdate((e) => {
      const nextScale = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
      const ratio = nextScale / savedScale.value;
      const focusShiftX = e.focalX - pinchFocalX.value;
      const focusShiftY = e.focalY - pinchFocalY.value;
      tx.value = pinchFocalX.value - (pinchFocalX.value - savedTx.value) * ratio + focusShiftX;
      ty.value = pinchFocalY.value - (pinchFocalY.value - savedTy.value) * ratio + focusShiftY;
      scale.value = nextScale;
    })
    .onEnd(() => {
      settleAxis(tx, boundsX);
      settleAxis(ty, boundsY);
    });

  const gesture = Gesture.Simultaneous(pan, pinch);

  const worldStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const revealed = useMemo(() => new Set(revealedStarIds), [revealedStarIds]);
  const byId = useMemo(() => {
    const m = new Map<string, (typeof placed)[number]>();
    for (const p of placed) m.set(p.star.id, p);
    return m;
  }, [placed]);

  const lines = useMemo(() => {
    const segs: {
      key: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      visible: boolean;
    }[] = [];
    for (const c of constellations) {
      const visible = c.starIds.some((id) => revealed.has(id));
      const ordered = [...c.starIds]
        .map((id) => byId.get(id))
        .filter((p): p is (typeof placed)[number] => Boolean(p))
        .sort((a, b) => a.star.date.localeCompare(b.star.date));
      for (let i = 0; i < ordered.length - 1; i += 1) {
        const p1 = toScreen(ordered[i].star.x, ordered[i].star.y);
        const p2 = toScreen(ordered[i + 1].star.x, ordered[i + 1].star.y);
        segs.push({
          key: `${ordered[i].star.id}-${ordered[i + 1].star.id}`,
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
          visible,
        });
      }
    }
    return segs;
  }, [constellations, revealed, byId, toScreen]);

  const band = useMemo(() => {
    const arr: { id: string; x: number; y: number; r: number; o: number }[] = [];
    const count = 7;
    for (let i = 0; i < count; i += 1) {
      const t = i / (count - 1);
      arr.push({
        id: `band-${i}`,
        x: width * (0.12 + t * 0.78),
        y: height * (0.78 - t * 0.6) + (seed(`by${i}`) - 0.5) * height * 0.12,
        r: Math.max(width, height) * (0.22 + seed(`br${i}`) * 0.12),
        o: 0.05 + seed(`bo${i}`) * 0.04,
      });
    }
    return arr;
  }, [width, height]);

  const dust = useMemo(() => {
    const arr: { id: string; x: number; y: number; r: number }[] = [];
    for (let i = 0; i < 80; i += 1) {
      arr.push({
        id: `dust-${i}`,
        x: seed(`dx${i}`) * width,
        y: seed(`dy${i}`) * height,
        r: 0.4 + seed(`dr${i}`) * 1.1,
      });
    }
    return arr;
  }, [width, height]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0b0c10', overflow: 'hidden' }}>
      {/* Faint Milky Way haze */}
      {band.map((b) => (
        <View
          key={b.id}
          style={{
            position: 'absolute',
            left: b.x - b.r,
            top: b.y - b.r,
            width: b.r * 2,
            height: b.r * 2,
            borderRadius: b.r,
            backgroundColor: '#3A2E6B',
            opacity: b.o,
          }}
        />
      ))}
      {/* Distant dust */}
      {dust.map((d) => (
        <View
          key={d.id}
          style={{
            position: 'absolute',
            left: d.x,
            top: d.y,
            width: d.r * 2,
            height: d.r * 2,
            borderRadius: d.r,
            backgroundColor: '#DCE6FF',
            opacity: 0.16,
          }}
        />
      ))}
      <Pressable
        onPress={onTapEmpty}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <GestureDetector gesture={gesture}>
        <Animated.View style={[{ flex: 1 }, worldStyle]}>
          {lines.map((seg) => (
            <LineSeg key={seg.key} seg={seg} />
          ))}

          {placed.map((p) => (
            <StarDot
              key={p.star.id}
              star={p.star}
              radius={p.radius}
              pos={toScreen(p.star.x, p.star.y)}
              isSelected={p.star.id === selectedStarId}
              isForging={forgingStarIds.includes(p.star.id)}
              onPress={() => onTapStar(p.star)}
            />
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function LineSeg({
  seg,
}: {
  seg: { x1: number; y1: number; x2: number; y2: number; visible: boolean };
}) {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const len = Math.hypot(dx, dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const progress = useSharedValue(seg.visible ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(seg.visible ? 1 : 0, {
      duration: seg.visible ? 600 : 350,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [seg.visible, progress]);

  const style = useAnimatedStyle(() => ({ opacity: 0.55 * progress.value }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: seg.x1,
          top: seg.y1,
          width: len,
          height: 1,
          backgroundColor: '#9D5CFF',
          transform: [{ rotateZ: `${angle}deg` }],
          transformOrigin: '0 0',
        },
        style,
      ]}
    />
  );
}

function StarDot({
  star,
  radius,
  pos,
  isSelected,
  isForging,
  onPress,
}: {
  star: MemoryStar;
  radius: number;
  pos: { x: number; y: number };
  isSelected: boolean;
  isForging: boolean;
  onPress: () => void;
}) {
  const color = colorFor(star.colorKey).hex;
  const phase = seed(star.id);
  const rate = 0.5 + seed(`${star.id}-rate`) * 0.7;
  const liveliness = 0.35 + seed(`${star.id}-live`) * 0.65;
  const clock = useSharedValue(phase);
  const active = isSelected || isForging;

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    clock.value = withRepeat(
      withTiming(phase + 6, { duration: 15000, easing: Easing.linear }),
      -1,
      false,
    );
  });

  // Tight core + hugging colored bloom, like a real star point.
  const coreR = Math.max(radius * 0.42, MIN_STAR_RADIUS * 0.7);
  const bloomR = coreR + Math.max(2.5, radius * 0.5) + (active ? 4 : 0);
  const spikeLen = coreR + radius * 0.9 + 4;

  const twinkleAt = (c: number) => {
    'worklet';
    const a = Math.sin((c * rate + phase) * Math.PI * 2);
    const b = Math.sin((c * rate * 1.7 + phase * 1.7) * Math.PI * 2);
    return Math.pow((a * 0.7 + b * 0.3 + 1) / 2, 1.4) * liveliness;
  };

  const bloomStyle = useAnimatedStyle(() => {
    const t = twinkleAt(clock.value);
    const gr = bloomR + t * 1.2;
    return {
      width: gr * 2,
      height: gr * 2,
      borderRadius: gr,
      marginLeft: -gr,
      marginTop: -gr,
      opacity: (active ? 0.5 : 0.32) + 0.16 * t,
    };
  });

  const coreStyle = useAnimatedStyle(() => ({ opacity: 0.85 + 0.15 * twinkleAt(clock.value) }));

  const spikeStyle = useAnimatedStyle(() => ({
    opacity: (0.18 + 0.32 * twinkleAt(clock.value)) * (active ? 1.4 : 1),
  }));

  const bloomR2 = coreR + 1.5;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={{ position: 'absolute', left: pos.x, top: pos.y }}
    >
      {/* Tight colored bloom (emotion tint) */}
      <Animated.View style={[{ position: 'absolute', backgroundColor: color }, bloomStyle]} />
      {/* Diffraction glint cross */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: spikeLen * 2,
            height: 1,
            marginLeft: -spikeLen,
            marginTop: -0.5,
            backgroundColor: '#EAF2FF',
          },
          spikeStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 1,
            height: spikeLen * 2,
            marginLeft: -0.5,
            marginTop: -spikeLen,
            backgroundColor: '#EAF2FF',
          },
          spikeStyle,
        ]}
      />
      {active && (
        <View
          style={{
            position: 'absolute',
            width: (radius + 10) * 2,
            height: (radius + 10) * 2,
            borderRadius: radius + 10,
            marginLeft: -(radius + 10),
            marginTop: -(radius + 10),
            borderWidth: 1.5,
            borderColor: isForging ? '#FFE066' : '#FFFFFF',
            opacity: 0.85,
          }}
        />
      )}
      {/* Soft white-blue inner bloom */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: bloomR2 * 2,
            height: bloomR2 * 2,
            borderRadius: bloomR2,
            marginLeft: -bloomR2,
            marginTop: -bloomR2,
            backgroundColor: '#CFE3FF',
          },
          coreStyle,
        ]}
      />
      {/* Bright white core */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: coreR * 2,
            height: coreR * 2,
            borderRadius: coreR,
            marginLeft: -coreR,
            marginTop: -coreR,
            backgroundColor: '#FFFFFF',
          },
          coreStyle,
        ]}
      />
    </Pressable>
  );
}
