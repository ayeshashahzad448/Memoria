import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from 'heroui-native';
import { History, MapPin, Sparkles } from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { useMemoria } from '@/lib/store';
import { colorFor } from '@/lib/memoria';

const ACCENT = colorFor('cyan').hex;
const MUTED = '#94A3B8';

export default function ThrowbacksTab() {
  const router = useRouter();
  const allStars = useMemoria((s) => s.stars);
  const activeCosmosId = useMemoria((s) => s.activeCosmosId);
  const suggestThrowbacks = useMemoria((s) => s.suggestThrowbacks);
  const setOpenMemoryStar = useMemoria((s) => s.setOpenMemoryStar);

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

  // Every surfaced memory is a real star, so each card can be visited in the cosmos.
  const realStarIds = useMemo(() => new Set(allStars.map((s) => s.id)), [allStars]);
  const cards = throwbacks;

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
                    if (!canOpen) return;
                    // Visit the memory in the cosmos: focus the star and open its
                    // floating detail panel on the Cosmos tab.
                    setOpenMemoryStar(tb.star.id);
                    router.push('/(tabs)');
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
