import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from 'heroui-native';
import { History, MapPin } from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { useMemoria } from '@/lib/store';
import { colorFor } from '@/lib/memoria';

const ACCENT = colorFor('cyan').hex;
const MUTED = '#8C93B8';

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

  return (
    <View className="bg-void flex-1">
      <ScrollView contentContainerClassName="px-5 pt-safe-offset-4 pb-32">
        <Text className="text-starlight text-3xl font-bold">Throwbacks</Text>
        <Text className="text-muted mt-1 mb-6 text-sm leading-5">
          Memories that resurface from years past, brought back for you to revisit.
        </Text>

        {throwbacks.length === 0 ? (
          <GlassCard contentClassName="items-center gap-2 p-6">
            <History size={22} color={MUTED} />
            <Text className="text-muted text-center text-sm leading-5">
              No throwbacks yet. As your memories age, the ones from this day in years past will
              appear here.
            </Text>
          </GlassCard>
        ) : (
          <View className="gap-3">
            {throwbacks.map((tb) => {
              const color = colorFor(tb.star.colorKey);
              return (
                <Pressable
                  key={tb.id}
                  onPress={() =>
                    router.push({ pathname: '/star/[id]', params: { id: tb.star.id } })
                  }
                >
                  <GlassCard contentClassName="gap-2 p-5">
                    <View className="flex-row items-center gap-2">
                      <History size={14} color={ACCENT} />
                      <Text className="text-accent text-xs font-semibold tracking-wide uppercase">
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
