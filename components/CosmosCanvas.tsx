import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber/native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { TextureLoader } from 'expo-three';
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
import {
  type ActiveMedia,
  buildCandidates,
  nextGapMs,
  pickCandidate,
  REVEAL_DURATION_S,
} from '@/lib/mediaCycle';

/**
 * Schedules the rare "memory comes alive" reveals: picks one media-bearing star
 * at a time, waits a randomized quiet gap (>=30s), then returns it so the scene
 * can fade a photo or waveform in and out. Returns the active media descriptor.
 */
function useMediaCycle(stars: MemoryStar[]): ActiveMedia | null {
  const [active, setActive] = useState<ActiveMedia | null>(null);
  const lastStarId = useRef<string | null>(null);

  useEffect(() => {
    const pool = buildCandidates(stars);
    if (pool.length === 0) {
      setActive(null);
      return () => {};
    }
    let revealTimer: ReturnType<typeof setTimeout> | undefined;
    let gapTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const runCycle = () => {
      if (cancelled) return;
      const pick = pickCandidate(pool, lastStarId.current);
      if (!pick) return;
      lastStarId.current = pick.starId;
      setActive(pick);
      revealTimer = setTimeout(() => {
        if (cancelled) return;
        setActive(null);
        gapTimer = setTimeout(runCycle, nextGapMs());
      }, REVEAL_DURATION_S * 1000);
    };

    // First reveal after an initial quiet gap so the scene settles first.
    gapTimer = setTimeout(runCycle, nextGapMs());
    return () => {
      cancelled = true;
      if (revealTimer) clearTimeout(revealTimer);
      if (gapTimer) clearTimeout(gapTimer);
    };
  }, [stars]);

  return active;
}

interface CosmosCanvasProps {
  stars: MemoryStar[];
  constellations: Constellation[];
  /** Star ids whose constellation lines should be visible. */
  revealedStarIds: string[];
  selectedStarId?: string;
  /** Star ids the user has multi-selected for forging. */
  forgingStarIds: string[];
  /** A star to smoothly orbit/zoom toward and focus (e.g. coming from search). */
  focusStarId?: string | null;
  /** Star ids to smoothly frame as a group (zoom out to reveal a constellation). */
  fitStarIds?: string[] | null;
  /** Constellation id to play a glowing star-to-star line-draw animation for. */
  drawConstellationId?: string | null;
  /** Fired when the line-draw animation finishes. */
  onDrawComplete?: () => void;
  /** When true, lock the camera to a flat front-on view (pan + zoom only). */
  view2D?: boolean;
  /**
   * When true, a detail panel covers the right portion of the screen, so the
   * camera nudges the framed star toward the left so it stays fully visible.
   */
  panelOpen?: boolean;
  /**
   * How far to push the framed star left (as a fraction of the visible
   * half-width) when a detail panel is open, so it always lands centered in the
   * strip left of the panel regardless of panel width. Defaults to 0.34.
   */
  panelShift?: number;
  onTapStar: (star: MemoryStar) => void;
  onTapEmpty: () => void;
}

interface PlacedStar {
  star: MemoryStar;
  /** World position in the 3D scene. */
  pos: [number, number, number];
  /** World-space glow size. */
  size: number;
  color: THREE.Color;
}

/** Fire a haptic selection tick (module-scope: no closure over component state). */
function focusTick() {
  void Haptics.selectionAsync();
}

// Camera orbit limits.
const MIN_RADIUS = 6;
const MAX_RADIUS = 34;
const POLAR_MIN = 0.25;
const POLAR_MAX = Math.PI - 0.25;

/** Deterministic pseudo-random in [0,1) from a string seed. */
function seed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

// ---- Shared sprite textures (created once) --------------------------------
//
// These are built procedurally into a pixel buffer (THREE.DataTexture) so they
// work identically on native (no DOM) and web — never reference `document` or
// an HTML <canvas> here, which crashes in React Native.

/** A radial gradient stop: distance from center (0..1) -> alpha (0..1). */
type GradientStop = { at: number; alpha: number };

/**
 * Build a square RGBA DataTexture whose alpha falls off radially according to
 * the supplied stops (linearly interpolated). RGB stays white; tinting is done
 * via the SpriteMaterial color.
 */
function makeRadialTexture(size: number, stops: GradientStop[], rgb: [number, number, number]) {
  const data = new Uint8Array(size * size * 4);
  const center = (size - 1) / 2;
  const maxDist = size / 2;
  const [r, g, b] = rgb;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.min(1, Math.sqrt(dx * dx + dy * dy) / maxDist);
      // Interpolate alpha across the stops.
      let alpha = 0;
      for (let i = 0; i < stops.length - 1; i += 1) {
        const s0 = stops[i];
        const s1 = stops[i + 1];
        if (dist >= s0.at && dist <= s1.at) {
          const f = s1.at === s0.at ? 0 : (dist - s0.at) / (s1.at - s0.at);
          alpha = s0.alpha + (s1.alpha - s0.alpha) * f;
          break;
        }
      }
      if (dist <= stops[0].at) alpha = stops[0].alpha;
      if (dist >= stops[stops.length - 1].at) alpha = stops[stops.length - 1].alpha;
      const idx = (y * size + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = Math.round(alpha * 255);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Soft radial glow texture used for the colored halo around each star. */
function makeGlowTexture(): THREE.Texture {
  return makeRadialTexture(
    128,
    [
      { at: 0, alpha: 1 },
      { at: 0.25, alpha: 0.55 },
      { at: 0.55, alpha: 0.16 },
      { at: 1, alpha: 0 },
    ],
    [255, 255, 255],
  );
}

/** Tight bright core texture (white point). */
function makeCoreTexture(): THREE.Texture {
  return makeRadialTexture(
    64,
    [
      { at: 0, alpha: 1 },
      { at: 0.4, alpha: 0.95 },
      { at: 0.75, alpha: 0.35 },
      { at: 1, alpha: 0 },
    ],
    [240, 247, 255],
  );
}

export function CosmosCanvas(props: CosmosCanvasProps) {
  const {
    stars,
    constellations,
    revealedStarIds,
    selectedStarId,
    forgingStarIds,
    focusStarId,
    fitStarIds,
    drawConstellationId,
    onDrawComplete,
    view2D = false,
    panelOpen = false,
    panelShift = 0.34,
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

  // Rare, subtle "memory comes alive" reveal — at most one star at a time.
  const activeMedia = useMediaCycle(stars);

  // ---- Orbit camera state (shared values, written by gestures) -----------
  // We keep two layers: the *desired* angles the gesture writes, and the
  // *actual* angles the camera renders. Each frame the actual values ease
  // toward the desired ones (critically-damped smoothing) which gives the
  // navigation weight and fluidity instead of a 1:1 rigid drag.
  const azimuth = useSharedValue(0.6); // desired horizontal angle
  const polar = useSharedValue(Math.PI / 2 - 0.25); // desired vertical angle from +y
  const radius = useSharedValue(20); // desired distance
  const targetX = useSharedValue(0);
  const targetY = useSharedValue(0);
  const targetZ = useSharedValue(0);
  // Rendered (smoothed) camera state — what the frame loop actually uses.
  const azActual = useSharedValue(0.6);
  const polarActual = useSharedValue(Math.PI / 2 - 0.25);
  const radiusActual = useSharedValue(20);
  const txActual = useSharedValue(0);
  const tyActual = useSharedValue(0);
  const tzActual = useSharedValue(0);
  // Momentum velocities (units per second) applied after the finger lifts.
  const velAz = useSharedValue(0);
  const velPolar = useSharedValue(0);
  const velTX = useSharedValue(0);
  const velTY = useSharedValue(0);
  const dragging = useSharedValue(0);
  // Saved-at-gesture-start values.
  const savedAz = useSharedValue(0);
  const savedPolar = useSharedValue(0);
  const savedRadius = useSharedValue(0);
  const savedTX = useSharedValue(0);
  const savedTY = useSharedValue(0);
  // Focus animation (0..1) and its endpoints.
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
  // Mirror the 2D flag into a shared value the worklets/frame loop can read.
  const flat = useSharedValue(view2D ? 1 : 0);
  // Desired + smoothed horizontal screen-shift (0 centered, negative pushes the
  // framed point left so it stays visible beside an open right-side panel).
  const shiftX = useSharedValue(0);
  const shiftXActual = useSharedValue(0);
  useEffect(() => {
    shiftX.value = panelOpen ? -Math.abs(panelShift) : 0;
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [panelOpen, panelShift]);
  useEffect(() => {
    flat.value = view2D ? 1 : 0;
    if (view2D) {
      // Reset to a clean front-on framing when entering 2D.
      azimuth.value = 0;
      polar.value = Math.PI / 2;
      azActual.value = 0;
      polarActual.value = Math.PI / 2;
      velAz.value = 0;
      velPolar.value = 0;
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [view2D]);

  // When asked to focus a star, ease the orbit target onto it and zoom in.
  useEffect(() => {
    if (!focusStarId) return;
    const target = placed.find((p) => p.star.id === focusStarId);
    if (!target) return;
    // Animate the orbit target + radius via a normalized progress the frame
    // loop interpolates. Capture start/end on shared values.
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
    focusTick();
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [focusStarId, placed]);

  // When asked to frame a group of stars, ease the orbit target onto their
  // centroid and zoom *out* so every member is comfortably in view.
  useEffect(() => {
    if (!fitStarIds || fitStarIds.length === 0) return;
    const members = placed.filter((p) => fitStarIds.includes(p.star.id));
    if (members.length === 0) return;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (const m of members) {
      cx += m.pos[0];
      cy += m.pos[1];
      cz += m.pos[2];
    }
    cx /= members.length;
    cy /= members.length;
    cz /= members.length;
    // Largest distance from centroid to any member -> enclosing radius.
    let spread = 0;
    for (const m of members) {
      const d = Math.hypot(m.pos[0] - cx, m.pos[1] - cy, m.pos[2] - cz);
      if (d > spread) spread = d;
    }
    fromX.value = targetX.value;
    fromY.value = targetY.value;
    fromZ.value = targetZ.value;
    fromRadius.value = radius.value;
    toX.value = cx;
    toY.value = cy;
    toZ.value = cz;
    // Pull the camera back so the whole group + margin fits in frame.
    toRadius.value = clamp(spread * 2.6 + 8, MIN_RADIUS, MAX_RADIUS);
    focusT.value = 0;
    focusActive.value = 1;
    focusTick();
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [fitStarIds, placed]);

  // Drives the glowing star-to-star line-draw animation (0..1).
  const drawProgress = useSharedValue(1);
  useEffect(() => {
    if (drawConstellationId) drawProgress.value = 0;
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [drawConstellationId]);

  // Drag rotates the orbit (3D) or translates the view (2D). One finger only so
  // it doesn't fight pinch. On release we hand the residual velocity to the
  // frame loop so the camera coasts to a stop instead of snapping dead.
  const pan = Gesture.Pan()
    .maxPointers(1)
    .onStart(() => {
      savedAz.value = azimuth.value;
      savedPolar.value = polar.value;
      savedTX.value = targetX.value;
      savedTY.value = targetY.value;
      focusActive.value = 0; // user takes over
      dragging.value = 1;
      velAz.value = 0;
      velPolar.value = 0;
      velTX.value = 0;
      velTY.value = 0;
      if (flat.value === 0) {
        // Free orbit: stop pivoting around the last focused star — recenter the
        // look target on the cosmos so dragging explores the whole scene.
        targetX.value = 0;
        targetY.value = 0;
        targetZ.value = 0;
      }
    })
    .onUpdate((e) => {
      if (flat.value === 1) {
        // 2D: pan translates the view across the flattened star map.
        const k = radius.value * 0.0016;
        targetX.value = savedTX.value - e.translationX * k;
        targetY.value = savedTY.value + e.translationY * k;
        return;
      }
      const k = 0.005;
      azimuth.value = savedAz.value - e.translationX * k;
      polar.value = clamp(savedPolar.value - e.translationY * k, POLAR_MIN, POLAR_MAX);
    })
    .onEnd((e) => {
      dragging.value = 0;
      if (flat.value === 1) {
        // Translate momentum (world units / second).
        const k = radius.value * 0.0016;
        velTX.value = -e.velocityX * k;
        velTY.value = e.velocityY * k;
      } else {
        // Rotation momentum (radians / second).
        const k = 0.005;
        velAz.value = -e.velocityX * k;
        velPolar.value = -e.velocityY * k;
      }
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

  // Tap handling is done inside the scene via raycasting (onClick on hit
  // meshes). Empty taps bubble to the canvas background mesh.
  const handleTapStar = (star: MemoryStar) => {
    focusTick();
    onTapStar(star);
  };

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
              flat={flat}
              shiftX={shiftX}
              shiftXActual={shiftXActual}
              targetX={targetX}
              targetY={targetY}
              targetZ={targetZ}
              azActual={azActual}
              polarActual={polarActual}
              radiusActual={radiusActual}
              txActual={txActual}
              tyActual={tyActual}
              tzActual={tzActual}
              velAz={velAz}
              velPolar={velPolar}
              velTX={velTX}
              velTY={velTY}
              dragging={dragging}
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
            <ShootingStars />
            <ConstellationLines
              placed={placed}
              constellations={constellations}
              revealedStarIds={revealedStarIds}
              drawConstellationId={drawConstellationId}
              drawProgress={drawProgress}
              onDrawComplete={onDrawComplete}
            />
            {placed.map((p) => (
              <StarSprite
                key={p.star.id}
                placed={p}
                selected={p.star.id === selectedStarId}
                forging={forgingStarIds.includes(p.star.id)}
                media={activeMedia && activeMedia.starId === p.star.id ? activeMedia : null}
                onPress={() => handleTapStar(p.star)}
              />
            ))}
            <BackgroundCatcher onMiss={onTapEmpty} />
          </Canvas>
        </View>
      </GestureDetector>
    </View>
  );
}

/** Drives the camera each frame from the orbit shared values. */
function OrbitRig({
  azimuth,
  polar,
  radius,
  flat,
  shiftX,
  shiftXActual,
  targetX,
  targetY,
  targetZ,
  azActual,
  polarActual,
  radiusActual,
  txActual,
  tyActual,
  tzActual,
  velAz,
  velPolar,
  velTX,
  velTY,
  dragging,
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
  flat: { value: number };
  shiftX: { value: number };
  shiftXActual: { value: number };
  targetX: { value: number };
  targetY: { value: number };
  targetZ: { value: number };
  azActual: { value: number };
  polarActual: { value: number };
  radiusActual: { value: number };
  txActual: { value: number };
  tyActual: { value: number };
  tzActual: { value: number };
  velAz: { value: number };
  velPolar: { value: number };
  velTX: { value: number };
  velTY: { value: number };
  dragging: { value: number };
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
  useFrame((_, rawDelta) => {
    // Clamp delta so a stutter/background pause can't fling the camera.
    const delta = Math.min(rawDelta, 1 / 30);

    // Advance focus animation if active.
    if (focusActive.value === 1 && focusT.value < 1) {
      // eslint-disable-next-line react-compiler/react-compiler -- intentional SharedValue mutation in r3f frame loop
      focusT.value = Math.min(1, focusT.value + delta / 1.1);
      const t = focusT.value;
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // inOutCubic
      targetX.value = fromX.value + (toX.value - fromX.value) * e;
      targetY.value = fromY.value + (toY.value - fromY.value) * e;
      targetZ.value = fromZ.value + (toZ.value - fromZ.value) * e;
      radius.value = fromRadius.value + (toRadius.value - fromRadius.value) * e;
    }

    // ---- Momentum: when not dragging or focusing, coast the desired values
    // using the residual velocity, then bleed it off (exponential friction).
    if (dragging.value === 0 && focusActive.value === 0) {
      // Per-second friction factor -> per-frame via pow(f, dt). Higher = more
      // glide. Rotation glides a touch longer than translation for weight.
      const rotFriction = Math.pow(0.0008, delta);
      const panFriction = Math.pow(0.0012, delta);
      if (flat.value === 1) {
        targetX.value += velTX.value * delta;
        targetY.value += velTY.value * delta;
        velTX.value *= panFriction;
        velTY.value *= panFriction;
        if (Math.abs(velTX.value) < 0.002) velTX.value = 0;
        if (Math.abs(velTY.value) < 0.002) velTY.value = 0;
      } else {
        azimuth.value += velAz.value * delta;
        polar.value = clamp(polar.value + velPolar.value * delta, POLAR_MIN, POLAR_MAX);
        // Kill polar velocity at the clamp so it doesn't "stick" pushing.
        if (polar.value <= POLAR_MIN || polar.value >= POLAR_MAX) velPolar.value = 0;
        velAz.value *= rotFriction;
        velPolar.value *= rotFriction;
        if (Math.abs(velAz.value) < 0.0006) velAz.value = 0;
        if (Math.abs(velPolar.value) < 0.0006) velPolar.value = 0;
      }
    }

    // ---- Smoothing: ease the rendered (actual) values toward the desired
    // ones with a frame-rate-independent exponential. This adds the sense of
    // weight/inertia while dragging and a soft settle on release.
    const smooth = (cur: number, dest: number, life: number) =>
      cur + (dest - cur) * (1 - Math.exp(-delta / life));
    // Shorter time constant while the finger is down (responsive), longer when
    // coasting (heavier, more cinematic glide).
    const life = dragging.value === 1 ? 0.06 : 0.16;

    azActual.value = smooth(azActual.value, azimuth.value, life);
    polarActual.value = smooth(polarActual.value, polar.value, life);
    radiusActual.value = smooth(radiusActual.value, radius.value, life);
    txActual.value = smooth(txActual.value, targetX.value, life);
    tyActual.value = smooth(tyActual.value, targetY.value, life);
    tzActual.value = smooth(tzActual.value, targetZ.value, life);
    // Panel shift eases a touch slower so the star glides aside gracefully.
    shiftXActual.value = smooth(shiftXActual.value, shiftX.value, 0.22);

    const az = azActual.value;
    const pol = polarActual.value;
    const rad = radiusActual.value;
    const tx = txActual.value;
    const ty = tyActual.value;
    const tz = tzActual.value;

    const sinP = Math.sin(pol);
    // Exact horizontal half-width of the view frustum at the target distance.
    // PerspectiveCamera.fov is the *vertical* fov in degrees; multiply by aspect
    // for the horizontal extent. This makes shiftXActual a true fraction of the
    // visible half-width, so the framed star lands centered in the strip left of
    // the panel regardless of screen size / panel width.
    // eslint-disable-next-line no-unsafe-type-assertion -- orbit camera is always perspective
    const cam = camera as THREE.PerspectiveCamera;
    const halfW = rad * Math.tan(((cam.fov || 60) * Math.PI) / 360) * (cam.aspect || 1);
    if (flat.value === 1) {
      // 2D: lock to a straight front-on view (camera on +z looking at target).
      // Right vector is simply +x; shift both eye + target so the point slides.
      const offX = halfW * shiftXActual.value;
      camera.position.set(tx + offX, ty, tz + rad);
      camera.up.set(0, 1, 0);
      camera.lookAt(tx + offX, ty, tz);
      return;
    }
    const x = tx + rad * sinP * Math.sin(az);
    const y = ty + rad * Math.cos(pol);
    const z = tz + rad * sinP * Math.cos(az);
    // Screen-right vector of the orbit camera = normalize(viewDir x worldUp).
    // viewDir points from camera toward target; cross with +y gives the right
    // axis. Offsetting eye + target along it slides the framed point sideways.
    const vdx = tx - x;
    const vdz = tz - z;
    let rx = vdz; // (viewDir cross (0,1,0)).x = vd.z
    let rz = -vdx; // .z = -vd.x   (y component is 0)
    const rlen = Math.hypot(rx, rz) || 1;
    rx /= rlen;
    rz /= rlen;
    const off = halfW * shiftXActual.value;
    camera.position.set(x + rx * off, y, z + rz * off);
    camera.lookAt(tx + rx * off, ty, tz + rz * off);
  });
  return null;
}

// Shared textures created lazily once.
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
  media,
  onPress,
}: {
  placed: PlacedStar;
  selected: boolean;
  forging: boolean;
  media: ActiveMedia | null;
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
    if (glowMat) glowMat.opacity = (selected ? 0.55 : 0.4) + 0.18 * twinkle;
    if (coreMat) coreMat.opacity = 0.85 + 0.15 * twinkle;
    if (ringMat) ringMat.opacity = selected || forging ? 0.7 : 0;
    // Subtle ring pulse when active.
    if (ringRef.current) {
      const s = (size + 0.5) * 2 * (1 + (selected || forging ? 0.06 * Math.sin(t * 6) : 0));
      ringRef.current.scale.set(s, s, s);
    }
  });

  const glowScale = (size + 0.35) * 2.1;
  const coreScale = size * 0.9;

  return (
    <group position={pos}>
      {/* Invisible hit target for reliable tap raycasting. */}
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
      {media ? <MediaReveal media={media} size={Math.max(size, 0.6)} color={color} /> : null}
    </group>
  );
}

/** Smooth fade envelope (0..1) across a reveal of `duration` seconds. */
function revealEnvelope(elapsed: number, duration: number): number {
  const fade = Math.min(1.4, duration * 0.22);
  if (elapsed <= 0) return 0;
  if (elapsed >= duration) return 0;
  if (elapsed < fade) return elapsed / fade;
  if (elapsed > duration - fade) return Math.max(0, (duration - elapsed) / fade);
  return 1;
}

function MediaReveal({
  media,
  size,
  color,
}: {
  media: ActiveMedia;
  size: number;
  color: THREE.Color;
}) {
  if (media.kind === 'photo' && media.photoUri) {
    return <PhotoReveal uri={media.photoUri} size={size} />;
  }
  return <WaveformReveal size={size} color={color} />;
}

function PhotoReveal({ uri, size }: { uri: string; size: number }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const startRef = useRef<number | null>(null);
  const tex = useMemo(() => {
    try {
      // expo-three's TextureLoader resolves native + remote URIs without DOM.
      return new TextureLoader().load(uri);
    } catch {
      return null;
    }
  }, [uri]);

  useFrame((state) => {
    const mat = matRef.current;
    if (!mat) return;
    if (startRef.current === null) startRef.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - startRef.current;
    mat.opacity = revealEnvelope(elapsed, REVEAL_DURATION_S) * 0.85;
  });

  if (!tex) return null;
  const s = size * 2.6;
  return (
    <sprite scale={[s, s, 1]}>
      <spriteMaterial
        ref={matRef}
        map={tex}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}

function WaveformReveal({ size, color }: { size: number; color: THREE.Color }) {
  const groupRef = useRef<THREE.Group>(null);
  const startRef = useRef<number | null>(null);
  const bars = 7;
  const barRefs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: color.clone().lerp(new THREE.Color('#ffffff'), 0.4),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [color],
  );
  const span = size * 2.4;
  const barW = span / (bars * 1.8);

  useFrame((state) => {
    if (startRef.current === null) startRef.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - startRef.current;
    const env = revealEnvelope(elapsed, REVEAL_DURATION_S);
    mat.opacity = env * 0.9;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < bars; i += 1) {
      const m = barRefs.current[i];
      if (!m) continue;
      // Slow, gentle waveform — each bar oscillates at its own phase.
      const wave = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 0.9);
      const h = (0.25 + wave * 0.75) * size * 1.6;
      m.scale.y = Math.max(0.05, h);
    }
    if (groupRef.current) groupRef.current.visible = env > 0.01;
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: bars }).map((_, i) => {
        const x = (i - (bars - 1) / 2) * barW * 1.8;
        return (
          <mesh
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            position={[x, 0, 0]}
            material={mat}
            ref={(el) => {
              barRefs.current[i] = el;
            }}
          >
            <planeGeometry args={[barW, 1]} />
          </mesh>
        );
      })}
    </group>
  );
}

function ConstellationLines({
  placed,
  constellations,
  revealedStarIds,
  drawConstellationId,
  drawProgress,
  onDrawComplete,
}: {
  placed: PlacedStar[];
  constellations: Constellation[];
  revealedStarIds: string[];
  drawConstellationId?: string | null;
  drawProgress: { value: number };
  onDrawComplete?: () => void;
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
        const drawing = c.id === drawConstellationId;
        const visible = drawing || c.starIds.some((id) => revealed.has(id));
        // Draw lines in the order the memories were selected (starIds order),
        // not by date, so the path follows the user's pick sequence.
        const ordered = [...c.starIds]
          .map((id) => byId.get(id))
          .filter((p): p is PlacedStar => Boolean(p));
        if (ordered.length < 2) return null;
        const pts = ordered.map((p) => new THREE.Vector3(...p.pos));
        // Close the loop: with 3+ stars, connect the last star back to the
        // first so the constellation forms a closed shape (no trailing gap).
        if (ordered.length > 2) pts.push(new THREE.Vector3(...ordered[0].pos));
        return (
          <ConstellationLine
            key={c.id}
            points={pts}
            visible={visible}
            drawing={drawing}
            drawProgress={drawProgress}
            onDrawComplete={onDrawComplete}
          />
        );
      })}
    </group>
  );
}

function ConstellationLine({
  points,
  visible,
  drawing,
  drawProgress,
  onDrawComplete,
}: {
  points: THREE.Vector3[];
  visible: boolean;
  drawing: boolean;
  drawProgress: { value: number };
  onDrawComplete?: () => void;
}) {
  const matRef = useRef<THREE.LineBasicMaterial>(null);
  const headRef = useRef<THREE.Sprite>(null);
  const done = useRef(false);
  // Total polyline length and per-segment lengths for even-speed drawing.
  const segs = useMemo(() => {
    const lengths: number[] = [];
    let total = 0;
    for (let i = 0; i < points.length - 1; i += 1) {
      const l = points[i].distanceTo(points[i + 1]);
      lengths.push(l);
      total += l;
    }
    return { lengths, total };
  }, [points]);
  // Preallocate a fixed-size buffer geometry sized to the FULL polyline so the
  // line can grow through every segment without recreating the attribute each
  // frame (which intermittently stalled the line at the first segment). The
  // animation reveals more vertices via setDrawRange and nudges the last
  // visible vertex to the interpolated head position.
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const count = Math.max(points.length, 2);
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < points.length; i += 1) {
      arr[i * 3] = points[i].x;
      arr[i * 3 + 1] = points[i].y;
      arr[i * 3 + 2] = points[i].z;
    }
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    g.setDrawRange(0, points.length);
    return g;
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);
  const headMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: glowTex(),
        color: new THREE.Color('#D7B8FF'),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0,
      }),
    [],
  );

  // Restore the full resting polyline whenever a draw begins/ends.
  useEffect(() => {
    const attr = geom.getAttribute('position');
    for (let i = 0; i < points.length; i += 1)
      attr.setXYZ(i, points[i].x, points[i].y, points[i].z);
    attr.needsUpdate = true;
    geom.setDrawRange(0, drawing ? 1 : points.length);
    done.current = false;
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [drawing, geom, points]);

  useFrame((_, delta) => {
    const mat = matRef.current;
    if (!mat) return;
    const attr = geom.getAttribute('position');
    if (!attr) return;

    if (drawing) {
      // Advance the draw head along the polyline (~1.2s for the whole path).
      const p = Math.min(1, drawProgress.value + delta / 1.2);
      // eslint-disable-next-line react-compiler/react-compiler -- intentional SharedValue mutation in r3f frame loop
      drawProgress.value = p;
      const reached = p * segs.total;
      // Find the active segment and interpolate the head position.
      let acc = 0;
      let segIndex = 0;
      let localT = 0;
      for (let i = 0; i < segs.lengths.length; i += 1) {
        if (reached <= acc + segs.lengths[i] || i === segs.lengths.length - 1) {
          segIndex = i;
          localT = segs.lengths[i] === 0 ? 1 : (reached - acc) / segs.lengths[i];
          break;
        }
        acc += segs.lengths[i];
      }
      const head = new THREE.Vector3().lerpVectors(
        points[segIndex],
        points[segIndex + 1],
        Math.min(1, Math.max(0, localT)),
      );
      // Reveal all completed vertices plus the moving head vertex.
      for (let i = 0; i <= segIndex; i += 1) attr.setXYZ(i, points[i].x, points[i].y, points[i].z);
      attr.setXYZ(segIndex + 1, head.x, head.y, head.z);
      attr.needsUpdate = true;
      geom.setDrawRange(0, segIndex + 2);
      geom.computeBoundingSphere();
      // Brighter glowing trail while drawing, settling after.
      mat.opacity = 0.85;
      mat.color.set('#C79CFF');
      // Glowing head spark.
      if (headRef.current) {
        headRef.current.position.copy(head);
        const flicker = 0.6 + 0.4 * Math.sin(p * 40);
        headMat.opacity = p < 1 ? 0.9 * flicker : 0;
        const s = 1.6;
        headRef.current.scale.set(s, s, s);
      }
      if (p >= 1 && !done.current) {
        done.current = true;
        // Settle to the resting full line, then notify completion next tick.
        for (let i = 0; i < points.length; i += 1)
          attr.setXYZ(i, points[i].x, points[i].y, points[i].z);
        attr.needsUpdate = true;
        geom.setDrawRange(0, points.length);
        geom.computeBoundingSphere();
        if (onDrawComplete) onDrawComplete();
      }
      return;
    }

    done.current = false;
    if (geom.drawRange.count !== points.length) geom.setDrawRange(0, points.length);
    if (headMat.opacity > 0) headMat.opacity = 0;
    const target = visible ? 0.55 : 0;
    mat.color.set('#9D5CFF');
    // Slow, gentle fade-in/out when a star reveals its constellation (~1.2s).
    mat.opacity += (target - mat.opacity) * Math.min(1, delta * 1.4);
  });

  return (
    <group>
      <line>
        <primitive object={geom} attach="geometry" />
        <lineBasicMaterial
          ref={matRef}
          color="#9D5CFF"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </line>
      <sprite ref={headRef} material={headMat} scale={[1.6, 1.6, 1]} />
    </group>
  );
}

/** Distant non-interactive dust points. */
function DustField() {
  const { positions, colors } = useMemo(() => {
    const count = 600;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < count; i += 1) {
      // Distribute on a large sphere shell around the scene.
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

/** Faint volumetric haze band — a few large additive glow sprites. */
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

// ---- Ambient shooting stars ----------------------------------------------
//
// Purely ambient, subtle and rare. A single comet at a time streaks across a
// distant shell of the sky in one of the app accent colors, leaving a fading
// tail, then a randomized quiet gap (20-40s) passes before the next one.

/** App accent palette for ambient comets (cyan / violet / rose). */
const COMET_COLORS = ['#45F3FF', '#9D5CFF', '#FF2A6D'];
const COMET_TAIL = 7;

/** Random number in [min, max). */
function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

interface CometRun {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: THREE.Color;
  duration: number;
}

/** Build a fly-across run on a far shell, crossing a random chord of the sky. */
function makeCometRun(): CometRun {
  const shell = randRange(46, 60);
  const pick = () => {
    const theta = randRange(0, Math.PI * 2);
    const phi = Math.acos(randRange(-0.6, 0.6));
    return new THREE.Vector3(
      shell * Math.sin(phi) * Math.cos(theta),
      shell * Math.cos(phi),
      shell * Math.sin(phi) * Math.sin(theta),
    );
  };
  const from = pick();
  let to = pick();
  // Ensure a decent travel distance so the streak reads as motion.
  let guard = 0;
  while (from.distanceTo(to) < shell * 0.9 && guard < 6) {
    to = pick();
    guard += 1;
  }
  return {
    from,
    to,
    color: new THREE.Color(COMET_COLORS[Math.floor(Math.random() * COMET_COLORS.length)]),
    duration: randRange(1.1, 1.8),
  };
}

function ShootingStars() {
  const headRef = useRef<THREE.Sprite>(null);
  const tailRefs = useRef<(THREE.Sprite | null)[]>([]);
  const headMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: coreTex(),
        color: new THREE.Color('#ffffff'),
        transparent: true,
        depthWrite: false,
        opacity: 0,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const tailMats = useMemo(
    () =>
      Array.from(
        { length: COMET_TAIL },
        () =>
          new THREE.SpriteMaterial({
            map: glowTex(),
            color: new THREE.Color('#ffffff'),
            transparent: true,
            depthWrite: false,
            opacity: 0,
            blending: THREE.AdditiveBlending,
          }),
      ),
    [],
  );

  // Scheduling state held in refs so it survives frames without re-render.
  const run = useRef<CometRun | null>(null);
  const elapsed = useRef(0);
  const nextAt = useRef(randRange(4, 9)); // first comet a few seconds in
  const clockRef = useRef(0);
  const headPos = useRef(new THREE.Vector3());

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30);
    clockRef.current += delta;

    if (!run.current) {
      // Idle: keep everything hidden, wait for the scheduled start time.
      if (clockRef.current >= nextAt.current) {
        run.current = makeCometRun();
        elapsed.current = 0;
        const c = run.current.color;
        // eslint-disable-next-line react-compiler/react-compiler -- mutating three material in frame loop
        headMat.color.copy(c).lerp(new THREE.Color('#ffffff'), 0.6);
        for (const m of tailMats) m.color.copy(c);
      }
      return;
    }

    elapsed.current += delta;
    const r = run.current;
    const p = elapsed.current / r.duration;
    if (p >= 1) {
      // Done: hide and schedule the next quiet gap (20-40s).
      run.current = null;
      clockRef.current = 0;
      nextAt.current = randRange(20, 40);
      headMat.opacity = 0;
      for (const m of tailMats) m.opacity = 0;
      return;
    }

    // Fade in fast, fade out toward the end so it reads as a streak.
    const envelope = Math.min(1, p / 0.12) * Math.min(1, (1 - p) / 0.3);
    headPos.current.copy(r.from).lerp(r.to, p);
    if (headRef.current) {
      headRef.current.position.copy(headPos.current);
      headRef.current.scale.setScalar(1.6);
    }
    headMat.opacity = 0.9 * envelope;

    // Tail trails behind the head along the travel direction.
    for (let i = 0; i < COMET_TAIL; i += 1) {
      const back = (i + 1) / COMET_TAIL;
      const tp = Math.max(0, p - back * 0.05);
      const s = tailRefs.current[i];
      const m = tailMats[i];
      if (s) {
        s.position.copy(r.from).lerp(r.to, tp);
        const scale = 2.4 * (1 - back * 0.7);
        s.scale.set(scale, scale, 1);
      }
      m.opacity = 0.5 * envelope * (1 - back);
    }
  });

  return (
    <group>
      <sprite ref={headRef} material={headMat} scale={[1.6, 1.6, 1]} />
      {tailMats.map((m, i) => (
        <sprite
          // eslint-disable-next-line react-x/no-array-index-key
          key={i}
          ref={(el) => {
            tailRefs.current[i] = el;
          }}
          material={m}
          scale={[2, 2, 1]}
        />
      ))}
    </group>
  );
}

/**
 * Large invisible sphere enclosing the scene; clicking it (a "miss" on any
 * star) deselects. Stars stopPropagation so their taps never reach this.
 */
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
