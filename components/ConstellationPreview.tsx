import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import type { MemoryStar } from '@/lib/types';
import { colorFor } from '@/lib/memoria';

interface ConstellationPreviewProps {
  /** Member stars in pick order. */
  members: MemoryStar[];
  width?: number;
  height?: number;
}

const PAD = 10;
const LINE_COLOR = '#9D5CFF';

/**
 * A small, normalized thumbnail of a constellation: member stars plotted by
 * their cosmos coordinates and chained in pick order (closed for 3+ members),
 * mirroring how the lines render in the live cosmos.
 */
export function ConstellationPreview({
  members,
  width = 300,
  height = 96,
}: ConstellationPreviewProps) {
  const points = useMemo(() => {
    if (members.length === 0) return [];
    const xs = members.map((m) => m.x);
    const ys = members.map((m) => m.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = Math.max(maxX - minX, 0.0001);
    const spanY = Math.max(maxY - minY, 0.0001);
    const innerW = width - PAD * 2;
    const innerH = height - PAD * 2;
    // Preserve aspect ratio and center within the box.
    const scale = Math.min(innerW / spanX, innerH / spanY);
    const drawW = spanX * scale;
    const drawH = spanY * scale;
    const offX = PAD + (innerW - drawW) / 2;
    const offY = PAD + (innerH - drawH) / 2;
    return members.map((m) => ({
      star: m,
      cx: offX + (m.x - minX) * scale,
      cy: offY + (m.y - minY) * scale,
    }));
  }, [members, width, height]);

  if (points.length === 0) return null;

  // Chain consecutive points; close the loop for 3+ stars (matches cosmos).
  const segments: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    segments.push({
      x1: points[i].cx,
      y1: points[i].cy,
      x2: points[i + 1].cx,
      y2: points[i + 1].cy,
      key: `${points[i].star.id}-${points[i + 1].star.id}`,
    });
  }
  if (points.length >= 3) {
    const first = points[0];
    const last = points[points.length - 1];
    segments.push({
      x1: last.cx,
      y1: last.cy,
      x2: first.cx,
      y2: first.cy,
      key: `${last.star.id}-${first.star.id}-close`,
    });
  }

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {segments.map((s) => (
          <Line
            key={s.key}
            x1={s.x1}
            y1={s.y1}
            x2={s.x2}
            y2={s.y2}
            stroke={LINE_COLOR}
            strokeWidth={1}
            strokeOpacity={0.5}
          />
        ))}
        {points.map((p) => {
          const hex = colorFor(p.star.colorKey).hex;
          return (
            <Circle
              key={`glow-${p.star.id}`}
              cx={p.cx}
              cy={p.cy}
              r={5.5}
              fill={hex}
              fillOpacity={0.22}
            />
          );
        })}
        {points.map((p) => (
          <Circle
            key={`core-${p.star.id}`}
            cx={p.cx}
            cy={p.cy}
            r={2}
            fill="#FFFFFF"
            fillOpacity={0.95}
          />
        ))}
      </Svg>
    </View>
  );
}
