import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  clamp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { Constellation, MemoryStar } from '@/lib/types';
import { colorFor, radiusForText, MIN_STAR_RADIUS } from '@/lib/memoria';

interface CosmosCanvasProps {
  stars: MemoryStar[];
  constellations: Constellation[];
  revealedStarIds: string[];
  selectedStarId?: string;
  forgingStarIds: string[];
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
    onTapStar,
    onTapEmpty,
  } = props;
  const { width, height } = useWindowDimensions();
  const span = Math.max(width, height) * 1.15;

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
    const segs: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];
    for (const c of constellations) {
      if (!c.starIds.some((id) => revealed.has(id))) continue;
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
    <View style={{ flex: 1, backgroundColor: '#0b0e1f', overflow: 'hidden' }}>
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
            backgroundColor: '#5E6BBF',
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
            opacity: 0.22,
          }}
        />
      ))}
      <Pressable
        onPress={onTapEmpty}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <GestureDetector gesture={gesture}>
        <Animated.View style={[{ flex: 1 }, worldStyle]}>
          {lines.map((seg) => {
            const dx = seg.x2 - seg.x1;
            const dy = seg.y2 - seg.y1;
            const len = Math.hypot(dx, dy);
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            return (
              <View
                key={seg.key}
                style={{
                  position: 'absolute',
                  left: seg.x1,
                  top: seg.y1,
                  width: len,
                  height: 1,
                  backgroundColor: '#8FA6E8',
                  opacity: 0.38,
                  transform: [{ rotateZ: `${angle}deg` }],
                  transformOrigin: '0 0',
                }}
              />
            );
          })}

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

  const haloStyle = useAnimatedStyle(() => {
    const a = Math.sin((clock.value * rate + phase) * Math.PI * 2);
    const b = Math.sin((clock.value * rate * 1.7 + phase * 1.7) * Math.PI * 2);
    const twinkle = Math.pow((a * 0.7 + b * 0.3 + 1) / 2, 1.4) * liveliness;
    const gr = radius + 7 + (isSelected || isForging ? 6 : 0) + twinkle * 1.5;
    return {
      width: gr * 2,
      height: gr * 2,
      borderRadius: gr,
      marginLeft: -gr,
      marginTop: -gr,
      opacity: (isSelected || isForging ? 0.4 : 0.2) + 0.12 * twinkle,
    };
  });

  const coreR = Math.max(radius * 0.5, MIN_STAR_RADIUS * 0.6);
  const bloomR = coreR + 2.5;

  const coreStyle = useAnimatedStyle(() => {
    const a = Math.sin((clock.value * rate + phase) * Math.PI * 2);
    const b = Math.sin((clock.value * rate * 1.7 + phase * 1.7) * Math.PI * 2);
    const twinkle = Math.pow((a * 0.7 + b * 0.3 + 1) / 2, 1.4) * liveliness;
    return { opacity: 0.82 + 0.18 * twinkle };
  });

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={{ position: 'absolute', left: pos.x, top: pos.y }}
    >
      {/* Faint colored halo */}
      <Animated.View style={[{ position: 'absolute', backgroundColor: color }, haloStyle]} />
      {(isSelected || isForging) && (
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
            opacity: 0.8,
          }}
        />
      )}
      {/* Soft white-blue bloom */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: bloomR * 2,
            height: bloomR * 2,
            borderRadius: bloomR,
            marginLeft: -bloomR,
            marginTop: -bloomR,
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
