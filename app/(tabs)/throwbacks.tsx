import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from 'heroui-native';
import { History, MapPin, Sparkles } from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { useMemoria } from '@/lib/store';
import { colorFor } from '@/lib/memoria';
import type { MemoryStar, Throwback } from '@/lib/types';

const ACCENT = colorFor('cyan').hex;
const MUTED = '#94A3B8';

/** Build a lightweight demo star for the Recall showcase. */
function demoStar(s: Partial<MemoryStar> & Pick<MemoryStar, 'id' | 'title'>): MemoryStar {
  return {
    story: '',
    colorKey: 'cyan',
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    photos: [],
    voiceNotes: [],
    taggedUserIds: [],
    x: 0,
    y: 0,
    authorId: 'demo',
    cosmosId: 'personal',
    ...s,
  };
}

/** Fake memories surfaced in the Recall tab for demonstration. */
const DEMO_THROWBACKS: Throwback[] = [
  {
    id: 'demo-1',
    headline: 'On this day in 2019',
    detail: 'Six years ago today',
    kind: 'anniversary',
    star: demoStar({
      id: 'demo-star-1',
      title: 'Sunrise hike at Cradle Mountain',
      colorKey: 'emerald',
      location: { name: 'Cradle Mountain, Tasmania' },
    }),
  },
  {
    id: 'demo-2',
    headline: 'A highlight from your archive',
    detail: 'Resurfaced memory',
    kind: 'highlight',
    star: demoStar({
      id: 'demo-star-2',
      title: 'First apartment, first coffee',
      colorKey: 'amber',
      location: { name: 'Fitzroy, Melbourne' },
    }),
  },
  {
    id: 'demo-3',
    headline: 'On this day in 2022',
    detail: 'Three years ago today',
    kind: 'anniversary',
    star: demoStar({
      id: 'demo-star-3',
      title: 'Late-night drive along the coast',
      colorKey: 'violet',
      location: { name: 'Great Ocean Road' },
    }),
  },
  {
    id: 'demo-4',
    headline: 'A highlight from your archive',
    detail: 'Resurfaced memory',
    kind: 'highlight',
    star: demoStar({
      id: 'demo-star-4',
      title: 'Her laugh in the rain',
      colorKey: 'rose',
      location: { name: 'South Bank' },
    }),
  },
  {
    id: 'demo-5',
    headline: 'On this day in 2017',
    detail: 'Eight years ago today',
    kind: 'anniversary',
    star: demoStar({
      id: 'demo-star-5',
      title: 'The night we watched the meteor shower',
      colorKey: 'cyan',
      location: { name: 'Lake Tekapo' },
    }),
  },
];

export default function ThrowbacksTab() {
  const router = useRouter();
  const allStars = useMemoria((s) => s.stars);
  const activeCosmosId = useMemoria((s) => s.activeCosmosId);
  const suggestThrowbacks = useMemoria((s) => s.suggestThrowbacks);

  // Depend on stars so throwbacks recompute as memories change.
  const stars = useMemo(
    () => allStars.filter((s) => s.cosmosId === activeCosmosId),
    [allStars, activeCosmosId],
  );
  const throwbacks = useMemo(
    () => suggestThrowbacks(),
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [stars, suggestThrowbacks],
  );

  // Real throwbacks first, then demo cards to showcase the feature.
  const realStarIds = useMemo(() => new Set(allStars.map((s) => s.id)), [allStars]);
  const cards = useMemo(() => [...throwbacks, ...DEMO_THROWBACKS], [throwbacks]);

  return (
    <View className="bg-void flex-1">
      <ScrollView contentContainerClassName="px-5 pt-safe-offset-4 pb-32">
        <Text className="text-starlight font-display text-3xl font-bold">Recall</Text>
        <Text className="text-muted mt-1 mb-6 text-sm leading-5">
          Anniversaries and highlights resurfaced from years past, brought back for you to revisit.
        </Text>

        {cards.length === 0 ? (
          <GlassCard contentClassName="items-center gap-2 p-6">
            <History size={22} color={MUTED} />
            <Text className="text-muted text-center text-sm leading-5">
              Nothing to recall yet. As your memories age, anniversaries and highlights from years
              past will appear here.
            </Text>
          </GlassCard>
        ) : (
          <View className="gap-3">
            {cards.map((tb) => {
              const color = colorFor(tb.star.colorKey);
              const isAnniversary = tb.kind === 'anniversary';
              const Icon = isAnniversary ? History : Sparkles;
              const tint = isAnniversary ? ACCENT : colorFor('amber').hex;
              const canOpen = realStarIds.has(tb.star.id);
              return (
                <Pressable
                  key={tb.id}
                  onPress={() => {
                    if (canOpen) {
                      router.push({ pathname: '/star/[id]', params: { id: tb.star.id } });
                    }
                  }}
                >
                  <GlassCard contentClassName="gap-2 p-5">
                    <View className="flex-row items-center gap-2">
                      <Icon size={14} color={tint} />
                      <Text
                        className="text-xs font-semibold tracking-wide uppercase"
                        style={{ color: tint }}
                      >
                        {tb.headline}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-2.5">
                      <View
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: color.hex,
                          shadowColor: color.hex,
                          shadowOpacity: 0.9,
                          shadowRadius: 8,
                        }}
                      />
                      <Text className="text-starlight flex-1 text-lg font-semibold">
                        {tb.star.title}
                      </Text>
                    </View>
                    {tb.star.location ? (
                      <View className="flex-row items-center gap-1.5">
                        <MapPin size={12} color={MUTED} />
                        <Text className="text-muted text-xs">{tb.star.location.name}</Text>
                      </View>
                    ) : null}
                  </GlassCard>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
