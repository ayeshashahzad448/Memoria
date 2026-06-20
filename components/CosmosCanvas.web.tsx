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

  return (
    <View style={{ flex: 1, backgroundColor: '#0b0e1f', overflow: 'hidden' }}>
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
                  backgroundColor: '#9FB4FF',
                  opacity: 0.5,
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
  const clock = useSharedValue(phase);

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    clock.value = withRepeat(
      withTiming(phase + 1, { duration: 3200, easing: Easing.linear }),
      -1,
      false,
    );
  });

  const glowStyle = useAnimatedStyle(() => {
    const pulse = (Math.sin(clock.value * Math.PI * 2) + 1) / 2;
    const base = radius + 8;
    const extra = (isSelected || isForging ? 14 : 8) * pulse;
    const gr = base + extra;
    return {
      width: gr * 2,
      height: gr * 2,
      borderRadius: gr,
      marginLeft: -gr,
      marginTop: -gr,
      opacity: (isSelected || isForging ? 0.5 : 0.32) + 0.18 * pulse,
    };
  });

  const coreR = Math.max(radius, MIN_STAR_RADIUS);
  const pinR = Math.max(radius * 0.32, 1.5);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={{ position: 'absolute', left: pos.x, top: pos.y }}
    >
      <Animated.View style={[{ position: 'absolute', backgroundColor: color }, glowStyle]} />
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
      <View
        style={{
          position: 'absolute',
          width: coreR * 2,
          height: coreR * 2,
          borderRadius: coreR,
          marginLeft: -coreR,
          marginTop: -coreR,
          backgroundColor: color,
          opacity: 0.9,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: pinR * 2,
          height: pinR * 2,
          borderRadius: pinR,
          marginLeft: -pinR,
          marginTop: -pinR,
          backgroundColor: '#FFFFFF',
          opacity: 0.95,
        }}
      />
    </Pressable>
  );
}
