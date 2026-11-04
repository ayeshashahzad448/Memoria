import { forwardRef } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { format } from 'date-fns';

import { wordmarkFamily } from '@/lib/fonts';
import { colorFor } from '@/lib/memoria';
import { sparklePathData } from '@/lib/sparkle';
import { DARK } from '@/lib/theme';
import type { MemoryStar } from '@/lib/types';

export const SHARE_CARD_WIDTH = 360;
export const SHARE_CARD_HEIGHT = 480;

const MAX_STORY_CHARS = 170;
const MAX_TITLE_CHARS = 56;
const MAX_PLACE_CHARS = 34;

/** Trim long text ourselves: image capture doesn't support CSS line clamping reliably. */
function clip(text: string, max: number): string {
  return text.length > max ? `…` : text;
}

/**
 * The picture that gets shared: a night-sky card with the memory's star, title, date, place and a
 * short excerpt. It always uses the dark palette so it looks the same whichever theme is active,
 * and it only uses inline styles so it renders identically when captured to an image.
 */
export const ShareCard = forwardRef<View, { star: MemoryStar }>(function ShareCard({ star }, ref) {
  const color = colorFor(star.colorKey);
  const meta = [
    format(new Date(star.date), 'PPP'),
    star.location ? clip(star.location.name, MAX_PLACE_CHARS) : undefined,
  ]
    .filter(Boolean)
    .join('  ·  ');
  const story = star.story.trim();
  const excerpt = clip(story, MAX_STORY_CHARS);

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        backgroundColor: '#0C0E14',
        padding: 28,
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
    >
      <Text
        style={{
          fontFamily: wordmarkFamily(),
          color: DARK.accent,
          fontSize: 13,
          letterSpacing: 4,
        }}
      >
        MEMORIA
      </Text>

      <View style={{ alignItems: 'center' }}>
        <Svg width={130} height={130} viewBox="0 0 150 150">
          <Circle cx={75} cy={75} r={72} fill={color.hex} opacity={0.12} />
          <Circle cx={75} cy={75} r={46} fill={color.hex} opacity={0.2} />
          <Path d={sparklePathData(75, 75, 66)} fill={color.hex} />
          <Path d={sparklePathData(75, 75, 32, Math.PI / 4)} fill="#FFFFFF" opacity={0.85} />
          <Circle cx={75} cy={75} r={6} fill="#FFFFFF" />
        </Svg>
      </View>

      <View style={{ gap: 8 }}>
        <Text
          style={{
            fontFamily: 'Instrument Serif',
            color: DARK.text,
            fontSize: 34,
            lineHeight: 38,
          }}
        >
          {clip(star.title, MAX_TITLE_CHARS)}
        </Text>
        {meta ? <Text style={{ color: DARK.muted, fontSize: 13 }}>{meta}</Text> : null}
        {excerpt ? (
          <Text style={{ color: '#CBD0E6', fontSize: 14, lineHeight: 21, marginTop: 4 }}>
            {excerpt}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color.hex }} />
          <Text style={{ color: DARK.readable(color.hex), fontSize: 12, letterSpacing: 1 }}>
            {color.emotion.toUpperCase()}
          </Text>
        </View>
      </View>
    </View>
  );
});
