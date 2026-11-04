import * as THREE from 'three';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * A white four-point sparkle with a small bright centre, built into a pixel buffer so it works
 * on native (no DOM) and web. Tint it with the sprite material's colour. Used as a star's core on
 * a light sky, where a soft round glow would read as a smudge.
 */
export function makeSparkleTexture(size = 128): THREE.Texture {
  const data = new Uint8Array(size * size * 4);
  const centre = (size - 1) / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = Math.abs((x - centre) / centre);
      const ny = Math.abs((y - centre) / centre);
      // sqrt(|x|) + sqrt(|y|) <= 1 is a pinched four-point star; the divisor sets edge softness.
      const arms = clamp01((1 - (Math.sqrt(nx) + Math.sqrt(ny))) / 0.14);
      const core = clamp01(1 - Math.hypot(nx, ny) / 0.2);
      const i = (y * size + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = Math.round(Math.max(arms, core) * 255);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/**
 * A soft round mask for a photo sprite: fully opaque in the middle and feathered to nothing at the
 * edge, so the picture reads as a glowing orb rather than a hard-edged square. Used as the
 * material's alphaMap, which reads the green channel, so the value is written to r, g and b.
 */
export function makeSoftDiscMask(size = 128): THREE.Texture {
  const data = new Uint8Array(size * size * 4);
  const centre = (size - 1) / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dist = Math.hypot((x - centre) / centre, (y - centre) / centre);
      const m = clamp01((1 - dist) / 0.4);
      const value = Math.round(m * m * (3 - 2 * m) * 255);
      const i = (y * size + x) * 4;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
