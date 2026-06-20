import { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { clamp, useSharedValue } from 'react-native-reanimated';
import * as THREE from 'three';

import type { Constellation, MemoryStar } from '@/lib/types';
import {
  colorFor,
  radiusForText,
  star3DPosition,
  starWorldSize,
  WORLD_RADIUS,
} from '@/lib/memoria';

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

interface PlacedStar {
  star: MemoryStar;
  pos: [number, number, number];
  size: number;
  color: THREE.Color;
}

const MIN_RADIUS = 6;
const MAX_RADIUS = 34;
const POLAR_MIN = 0.25;
const POLAR_MAX = Math.PI - 0.25;

function seed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function makeGlowTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.16)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function makeCoreTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(232,242,255,0.95)');
  grad.addColorStop(0.75, 'rgba(207,227,255,0.35)');
  grad.addColorStop(1, 'rgba(207,227,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
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

  const placed = useMemo<PlacedStar[]>(
    () =>
      stars.map((star) => {
        const radius = radiusForText(star.story.length > 0 ? star.story : star.title);
        return {
          star,
          pos: star3DPosition(star.id, star.x, star.y),
          size: starWorldSize(radius),
          color: new THREE.Color(colorFor(star.colorKey).hex),
        };
      }),
    [stars],
  );

  const azimuth = useSharedValue(0.6);
  const polar = useSharedValue(Math.PI / 2 - 0.25);
  const radius = useSharedValue(20);
  const targetX = useSharedValue(0);
  const targetY = useSharedValue(0);
  const targetZ = useSharedValue(0);
  const savedAz = useSharedValue(0);
  const savedPolar = useSharedValue(0);
  const savedRadius = useSharedValue(0);
  const focusT = useSharedValue(1);
  const focusActive = useSharedValue(0);
  const fromX = useSharedValue(0);
  const fromY = useSharedValue(0);
  const fromZ = useSharedValue(0);
  const fromRadius = useSharedValue(20);
  const toX = useSharedValue(0);
  const toY = useSharedValue(0);
  const toZ = useSharedValue(0);
  const toRadius = useSharedValue(20);

  useEffect(() => {
    if (!focusStarId) return;
    const target = placed.find((p) => p.star.id === focusStarId);
    if (!target) return;
    fromX.value = targetX.value;
    fromY.value = targetY.value;
    fromZ.value = targetZ.value;
    fromRadius.value = radius.value;
    toX.value = target.pos[0];
    toY.value = target.pos[1];
    toZ.value = target.pos[2];
    toRadius.value = Math.max(MIN_RADIUS, target.size * 6 + 4);
    focusT.value = 0;
    focusActive.value = 1;
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [focusStarId, placed]);

  const pan = Gesture.Pan()
    .maxPointers(1)
    .onStart(() => {
      savedAz.value = azimuth.value;
      savedPolar.value = polar.value;
      focusActive.value = 0;
    })
    .onUpdate((e) => {
      const k = 0.005;
      azimuth.value = savedAz.value - e.translationX * k;
      polar.value = clamp(savedPolar.value - e.translationY * k, POLAR_MIN, POLAR_MAX);
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedRadius.value = radius.value;
      focusActive.value = 0;
    })
    .onUpdate((e) => {
      radius.value = clamp(savedRadius.value / e.scale, MIN_RADIUS, MAX_RADIUS);
    });

  const gesture = Gesture.Simultaneous(pan, pinch);

  return (
    <View className="bg-void flex-1">
      <GestureDetector gesture={gesture}>
        <View style={{ flex: 1 }} collapsable={false}>
          <Canvas
            gl={{ antialias: true }}
            camera={{ fov: 60, near: 0.1, far: 200, position: [0, 0, 20] }}
            onCreated={(state) => {
              state.gl.setClearColor('#0b0c10', 1);
            }}
          >
            <OrbitRig
              azimuth={azimuth}
              polar={polar}
              radius={radius}
              targetX={targetX}
              targetY={targetY}
              targetZ={targetZ}
              focusT={focusT}
              focusActive={focusActive}
              fromX={fromX}
              fromY={fromY}
              fromZ={fromZ}
              fromRadius={fromRadius}
              toX={toX}
              toY={toY}
              toZ={toZ}
              toRadius={toRadius}
            />
            <ambientLight intensity={0.6} />
            <DustField />
            <MilkyWay />
            <ConstellationLines
              placed={placed}
              constellations={constellations}
              revealedStarIds={revealedStarIds}
            />
            {placed.map((p) => (
              <StarSprite
                key={p.star.id}
                placed={p}
                selected={p.star.id === selectedStarId}
                forging={forgingStarIds.includes(p.star.id)}
                onPress={() => onTapStar(p.star)}
              />
            ))}
            <BackgroundCatcher onMiss={onTapEmpty} />
          </Canvas>
        </View>
      </GestureDetector>
    </View>
  );
}

function OrbitRig({
  azimuth,
  polar,
  radius,
  targetX,
  targetY,
  targetZ,
  focusT,
  focusActive,
  fromX,
  fromY,
  fromZ,
  fromRadius,
  toX,
  toY,
  toZ,
  toRadius,
}: {
  azimuth: { value: number };
  polar: { value: number };
  radius: { value: number };
  targetX: { value: number };
  targetY: { value: number };
  targetZ: { value: number };
  focusT: { value: number };
  focusActive: { value: number };
  fromX: { value: number };
  fromY: { value: number };
  fromZ: { value: number };
  fromRadius: { value: number };
  toX: { value: number };
  toY: { value: number };
  toZ: { value: number };
  toRadius: { value: number };
}) {
  const { camera } = useThree();
  useFrame((_, delta) => {
    if (focusActive.value === 1 && focusT.value < 1) {
      // eslint-disable-next-line react-compiler/react-compiler -- intentional SharedValue mutation in r3f frame loop
      focusT.value = Math.min(1, focusT.value + delta / 1.1);
      const t = focusT.value;
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      targetX.value = fromX.value + (toX.value - fromX.value) * e;
      targetY.value = fromY.value + (toY.value - fromY.value) * e;
      targetZ.value = fromZ.value + (toZ.value - fromZ.value) * e;
      radius.value = fromRadius.value + (toRadius.value - fromRadius.value) * e;
    }
    const sinP = Math.sin(polar.value);
    const x = targetX.value + radius.value * sinP * Math.sin(azimuth.value);
    const y = targetY.value + radius.value * Math.cos(polar.value);
    const z = targetZ.value + radius.value * sinP * Math.cos(azimuth.value);
    camera.position.set(x, y, z);
    camera.lookAt(targetX.value, targetY.value, targetZ.value);
  });
  return null;
}

let GLOW_TEX: THREE.Texture | null = null;
let CORE_TEX: THREE.Texture | null = null;
function glowTex(): THREE.Texture {
  if (!GLOW_TEX) GLOW_TEX = makeGlowTexture();
  return GLOW_TEX;
}
function coreTex(): THREE.Texture {
  if (!CORE_TEX) CORE_TEX = makeCoreTexture();
  return CORE_TEX;
}

function StarSprite({
  placed,
  selected,
  forging,
  onPress,
}: {
  placed: PlacedStar;
  selected: boolean;
  forging: boolean;
  onPress: () => void;
}) {
  const { star, pos, size, color } = placed;
  const ringRef = useRef<THREE.Sprite>(null);
  const phase = seed(star.id);
  const rate = 0.5 + seed(`${star.id}-rate`) * 0.7;
  const liveliness = 0.35 + seed(`${star.id}-live`) * 0.65;

  const glowMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: glowTex(),
        color: color.clone(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [color],
  );
  const coreMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: coreTex(),
        color: new THREE.Color('#ffffff'),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const ringMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: glowTex(),
        color: new THREE.Color(forging ? '#FFE066' : '#FFFFFF'),
        transparent: true,
        depthWrite: false,
        opacity: 0,
      }),
    [forging],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.12;
    const a = Math.sin((t * rate + phase) * Math.PI * 2);
    const b = Math.sin((t * rate * 1.7 + phase * 1.7) * Math.PI * 2);
    const mixed = (a * 0.7 + b * 0.3 + 1) / 2;
    const twinkle = Math.pow(mixed, 1.4) * liveliness;
    glowMat.opacity = (selected ? 0.55 : 0.4) + 0.18 * twinkle;
    coreMat.opacity = 0.85 + 0.15 * twinkle;
    ringMat.opacity = selected || forging ? 0.7 : 0;
    if (ringRef.current) {
      const s = (size + 0.5) * 2 * (1 + (selected || forging ? 0.06 * Math.sin(t * 6) : 0));
      ringRef.current.scale.set(s, s, s);
    }
  });

  const glowScale = (size + 0.35) * 2.1;
  const coreScale = size * 0.9;

  return (
    <group position={pos}>
      <mesh
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onPress();
        }}
      >
        <sphereGeometry args={[Math.max(size, 0.5), 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <sprite ref={ringRef} material={ringMat} scale={[(size + 0.5) * 2, (size + 0.5) * 2, 1]} />
      <sprite material={glowMat} scale={[glowScale, glowScale, 1]} />
      <sprite material={coreMat} scale={[coreScale, coreScale, 1]} />
    </group>
  );
}

function ConstellationLines({
  placed,
  constellations,
  revealedStarIds,
}: {
  placed: PlacedStar[];
  constellations: Constellation[];
  revealedStarIds: string[];
}) {
  const byId = useMemo(() => {
    const m = new Map<string, PlacedStar>();
    for (const p of placed) m.set(p.star.id, p);
    return m;
  }, [placed]);
  const revealed = useMemo(() => new Set(revealedStarIds), [revealedStarIds]);

  return (
    <group>
      {constellations.map((c) => {
        const visible = c.starIds.some((id) => revealed.has(id));
        const ordered = [...c.starIds]
          .map((id) => byId.get(id))
          .filter((p): p is PlacedStar => Boolean(p))
          .sort((a, b) => a.star.date.localeCompare(b.star.date));
        if (ordered.length < 2) return null;
        const pts = ordered.map((p) => new THREE.Vector3(...p.pos));
        return <ConstellationLine key={c.id} points={pts} visible={visible} />;
      })}
    </group>
  );
}

function ConstellationLine({ points, visible }: { points: THREE.Vector3[]; visible: boolean }) {
  const matRef = useRef<THREE.LineBasicMaterial>(null);
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  useFrame((_, delta) => {
    const mat = matRef.current;
    if (!mat) return;
    const target = visible ? 0.55 : 0;
    mat.opacity += (target - mat.opacity) * Math.min(1, delta * 5);
  });
  return (
    // @ts-expect-error r3f line intrinsic
    <line geometry={geometry}>
      <lineBasicMaterial
        ref={matRef}
        color="#9D5CFF"
        transparent
        opacity={visible ? 0.55 : 0}
        depthWrite={false}
      />
    </line>
  );
}

function DustField() {
  const { positions, colors } = useMemo(() => {
    const count = 600;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < count; i += 1) {
      const r = 28 + seed(`dr${i}`) * 22;
      const theta = seed(`dt${i}`) * Math.PI * 2;
      const phi = Math.acos(2 * seed(`dp${i}`) - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const tint = 0.7 + seed(`dc${i}`) * 0.3;
      c.setRGB(tint, tint * 0.95, 1);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return { positions: pos, colors: col };
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.35}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </points>
  );
}

function MilkyWay() {
  const tex = useMemo(() => glowTex(), []);
  const blobs = useMemo(() => {
    const arr: { pos: [number, number, number]; scale: number; opacity: number }[] = [];
    const count = 6;
    for (let i = 0; i < count; i += 1) {
      const t = i / (count - 1);
      arr.push({
        pos: [
          (t - 0.5) * WORLD_RADIUS * 3,
          (seed(`my${i}`) - 0.5) * WORLD_RADIUS,
          -WORLD_RADIUS * 2 + (seed(`mz${i}`) - 0.5) * WORLD_RADIUS,
        ],
        scale: WORLD_RADIUS * (1.6 + seed(`ms${i}`) * 1.2),
        opacity: 0.05 + seed(`mo${i}`) * 0.04,
      });
    }
    return arr;
  }, []);
  const mats = useMemo(
    () =>
      blobs.map(
        (b) =>
          new THREE.SpriteMaterial({
            map: tex,
            color: new THREE.Color('#3A2E6B'),
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            opacity: b.opacity,
          }),
      ),
    [blobs, tex],
  );
  return (
    <group>
      {blobs.map((b) => (
        <sprite
          key={b.pos[0]}
          material={mats[blobs.indexOf(b)]}
          position={b.pos}
          scale={[b.scale, b.scale, 1]}
        />
      ))}
    </group>
  );
}

function BackgroundCatcher({ onMiss }: { onMiss: () => void }) {
  return (
    <mesh
      onClick={() => {
        onMiss();
      }}
    >
      <sphereGeometry args={[120, 16, 16]} />
      <meshBasicMaterial transparent opacity={0} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}
