import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Text } from 'heroui-native';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, ChevronRight, Link2, Sparkles, Trash2 } from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { ConstellationPreview } from '@/components/ConstellationPreview';
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
  const focusConstellation = useMemoria((s) => s.focusConstellation);

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

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  // Open this constellation in the cosmos: ask the cosmos to frame + draw it,
  // then return to the cosmos tab so the animation plays.
  const openInCosmos = (id: string) => {
    void Haptics.selectionAsync();
    focusConstellation(id);
    goBack();
  };

  return (
    <View className="bg-void flex-1">
      <ScrollView contentContainerClassName="px-5 pt-safe-offset-3 pb-12">
        <View className="mb-3 flex-row items-center gap-3">
          <Pressable onPress={goBack} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
            <View className="border-glass-border h-10 w-10 items-center justify-center rounded-full border">
              <ArrowLeft size={20} color={MUTED} />
            </View>
          </Pressable>
          <Text className="text-starlight font-display text-2xl font-bold">Constellations</Text>
        </View>
        <Text className="text-muted mb-6 text-sm leading-5">
          Tap a constellation to fly to it in your cosmos and watch the lines draw.
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
              const members = c.starIds
                .map((id) => starById.get(id))
                .filter((m): m is NonNullable<typeof m> => Boolean(m));
              return (
                <Pressable key={c.id} onPress={() => openInCosmos(c.id)}>
                  <GlassCard contentClassName="gap-3 p-4">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 flex-row items-center gap-2">
                        <Link2 size={15} color={ACCENT} />
                        <Text className="text-starlight flex-1 font-semibold" numberOfLines={1}>
                          {c.name}
                        </Text>
                      </View>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation?.();
                          removeConstellation(c.id);
                        }}
                        hitSlop={10}
                      >
                        <Trash2 size={16} color={MUTED} />
                      </Pressable>
                    </View>

                    {/* Mini map of the constellation shape */}
                    {members.length > 0 && (
                      <View className="border-glass-border bg-background/40 overflow-hidden rounded-xl border">
                        <ConstellationPreview members={members} height={104} />
                      </View>
                    )}

                    <View className="flex-row items-center justify-between">
                      <Text className="text-muted text-[11px]">
                        {members.length} memories ·{' '}
                        {c.origin === 'suggested' ? 'Suggested' : 'Created by you'}
                      </Text>
                      <View className="flex-row items-center gap-1">
                        <Text className="text-accent text-xs font-medium">View in cosmos</Text>
                        <ChevronRight size={14} color={ACCENT} />
                      </View>
                    </View>
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
