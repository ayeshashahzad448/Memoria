/**
 * Shared geometry for Memoria's star: a concave four-point sparkle. Both the Skia
 * (native) and react-native-svg (web) renderers draw this same path, so the star
 * looks identical on every platform. Helpers are worklets so they can run inside
 * Reanimated derived values.
 */

/** SVG path data for a four-point sparkle centred on (cx, cy), `len` from centre to tip. */
export function sparklePathData(cx: number, cy: number, len: number, rotation = 0): string {
  'worklet';
  // How far the edges pinch in towards the centre; smaller = thinner, sharper points.
  const k = len * 0.09;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const pt = (x: number, y: number) =>
    `${(cx + x * cos - y * sin).toFixed(2)} ${(cy + x * sin + y * cos).toFixed(2)}`;
  return (
    `M${pt(0, -len)} Q${pt(k, -k)} ${pt(len, 0)} Q${pt(k, k)} ${pt(0, len)} ` +
    `Q${pt(-k, k)} ${pt(-len, 0)} Q${pt(-k, -k)} ${pt(0, -len)} Z`
  );
}

/** Blend two #rrggbb colors; `t` of 0 returns `a`, 1 returns `b`. */
export function mixHex(a: string, b: string, t: number): string {
  'worklet';
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

/** Slow, soft brightness wobble (0..1) from a non-wrapping clock that ramps 0..6. */
export function twinkleAt(clock: number): number {
  'worklet';
  const a = Math.sin(clock * 0.7 * Math.PI * 2);
  const b = Math.sin(clock * 1.2 * Math.PI * 2);
  return Math.pow((a * 0.7 + b * 0.3 + 1) / 2, 1.4);
}
