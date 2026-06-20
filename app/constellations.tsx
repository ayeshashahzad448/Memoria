import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Text } from 'heroui-native';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Link2, Sparkles, Trash2 } from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { useMemoria } from '@/lib/store';
import { colorFor } from '@/lib/memoria';

const ACCENT = colorFor('cyan').hex;
const MUTED = '#94A3B8';

export default function ConstellationsScreen() {
  const router = useRouter();
  const allStars = useMemoria((s) => s.stars);
  const allConstellations = useMemoria((s) => s.constellations);
  const activeCosmosId = useMemoria((s) => s.activeCosmosId);
  const createConstellation = useMemoria((s) => s.createConstellation);
  const removeConstellation = useMemoria((s) => s.removeConstellation);
  const suggestConstellations = useMemoria((s) => s.suggestConstellations);

  const stars = useMemo(
    () => allStars.filter((s) => s.cosmosId === activeCosmosId),
    [allStars, activeCosmosId],
  );
  const constellations = useMemo(
    () => allConstellations.filter((c) => c.cosmosId === activeCosmosId),
    [allConstellations, activeCosmosId],
  );

  // Recompute suggestions when stars/constellations change.
  const suggestions = useMemo(
    () => suggestConstellations(),
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [stars, constellations, suggestConstellations],
  );
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visibleSuggestions = suggestions.filter((s) => !dismissed.includes(s.id));

  const starById = useMemo(() => new Map(stars.map((s) => [s.id, s])), [stars]);

  const accept = (id: string, reason: string, starIds: string[]) => {
    createConstellation(reason, starIds, 'suggested');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDismissed((p) => [...p, id]);
  };

  return (
    <View className="bg-void flex-1">
      <ScrollView contentContainerClassName="px-5 pt-safe-offset-3 pb-12">
        <View className="mb-3 flex-row items-center gap-3">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
            hitSlop={12}
          >
            <ArrowLeft size={22} color={MUTED} />
          </Pressable>
          <Text className="text-starlight font-display text-2xl font-bold">Constellations</Text>
        </View>
        <Text className="text-muted mb-6 text-sm leading-5">
          Connect related memories into constellations. Toggle Constellations in your cosmos to
          reveal the glowing lines.
        </Text>

        {/* AI suggestions */}
        {visibleSuggestions.length > 0 && (
          <View className="mb-6 gap-2.5">
            <View className="flex-row items-center gap-2">
              <Sparkles size={16} color={ACCENT} />
              <Text className="text-starlight font-semibold">Suggested for you</Text>
            </View>
            {visibleSuggestions.map((s) => (
              <GlassCard key={s.id} contentClassName="gap-3 p-4">
                <Text className="text-starlight text-sm">{s.reason}</Text>
                <Text className="text-muted text-xs">{s.starIds.length} memories</Text>
                <View className="flex-row gap-2.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1"
                    onPress={() => setDismissed((p) => [...p, s.id])}
                  >
                    Not now
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onPress={() => accept(s.id, s.reason, s.starIds)}
                  >
                    Create
                  </Button>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* Existing constellations */}
        <Text className="text-starlight mb-2.5 font-semibold">Your constellations</Text>
        {constellations.length === 0 ? (
          <GlassCard contentClassName="items-center gap-2 p-6">
            <Link2 size={22} color={MUTED} />
            <Text className="text-muted text-center text-sm leading-5">
              No constellations yet. From your cosmos, tap Connect and pick two or more memories.
            </Text>
          </GlassCard>
        ) : (
          <View className="gap-2.5">
            {constellations.map((c) => {
              const members = c.starIds.map((id) => starById.get(id)).filter(Boolean);
              return (
                <GlassCard key={c.id} contentClassName="gap-2.5 p-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 flex-row items-center gap-2">
                      <Link2 size={15} color={ACCENT} />
                      <Text className="text-starlight flex-1 font-semibold" numberOfLines={1}>
                        {c.name}
                      </Text>
                    </View>
                    <Pressable onPress={() => removeConstellation(c.id)} hitSlop={10}>
                      <Trash2 size={16} color={MUTED} />
                    </Pressable>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    {members.map((m) => (
                      <Pressable
                        key={m!.id}
                        onPress={() =>
                          router.push({ pathname: '/star/[id]', params: { id: m!.id } })
                        }
                      >
                        <View className="border-glass-border flex-row items-center gap-1.5 rounded-full border px-3 py-1.5">
                          <View
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: colorFor(m!.colorKey).hex }}
                          />
                          <Text className="text-starlight text-xs" numberOfLines={1}>
                            {m!.title}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                  <Text className="text-muted text-[11px]">
                    {c.origin === 'suggested' ? 'Suggested constellation' : 'Created by you'}
                  </Text>
                </GlassCard>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
