import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from 'heroui-native';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Plus, UsersRound } from 'lucide-react-native';

import { CosmosCanvas } from '@/components/CosmosCanvas';
import { GlassCard } from '@/components/GlassCard';
import { MemoryDetailPanel } from '@/components/MemoryDetailPanel';
import { useMemoria } from '@/lib/store';
import { colorFor, userById } from '@/lib/memoria';
import type { MemoryStar } from '@/lib/types';

const ACCENT = colorFor('cyan').hex;
const MUTED = '#94A3B8';

export default function SharedCosmosView() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const cosmosId = Array.isArray(params.id) ? params.id[0] : params.id;

  const allStars = useMemoria((s) => s.stars);
  const allConstellations = useMemoria((s) => s.constellations);
  const sharedCosmoses = useMemoria((s) => s.sharedCosmoses);

  const cosmos = useMemo(
    () => sharedCosmoses.find((c) => c.id === cosmosId),
    [sharedCosmoses, cosmosId],
  );

  const stars = useMemo(
    () => allStars.filter((s) => s.cosmosId === cosmosId),
    [allStars, cosmosId],
  );
  const constellations = useMemo(
    () => allConstellations.filter((c) => c.cosmosId === cosmosId),
    [allConstellations, cosmosId],
  );

  const [selectedStar, setSelectedStar] = useState<MemoryStar | null>(null);
  const [viewingStar, setViewingStar] = useState<MemoryStar | null>(null);
  const [canvasFocusId, setCanvasFocusId] = useState<string | null>(null);

  // Keep the open panel / selection in sync with edits + deletions.
  useEffect(() => {
    if (selectedStar && !stars.some((s) => s.id === selectedStar.id)) setSelectedStar(null);
    if (viewingStar && !stars.some((s) => s.id === viewingStar.id)) {
      setViewingStar(null);
    } else if (viewingStar) {
      const fresh = stars.find((s) => s.id === viewingStar.id);
      if (fresh && fresh !== viewingStar) setViewingStar(fresh);
    }
  }, [stars, selectedStar, viewingStar]);

  const revealedStarIds = useMemo(() => {
    const ids = new Set<string>();
    if (selectedStar) {
      for (const c of constellations) {
        if (c.starIds.includes(selectedStar.id)) {
          for (const sid of c.starIds) ids.add(sid);
        }
      }
    }
    return [...ids];
  }, [selectedStar, constellations]);

  const openMemory = (star: MemoryStar) => {
    void Haptics.selectionAsync();
    setSelectedStar(star);
    setViewingStar(star);
    setCanvasFocusId(null);
    requestAnimationFrame(() => setCanvasFocusId(star.id));
  };

  const onTapStar = (star: MemoryStar) => {
    if (viewingStar) {
      openMemory(star);
      return;
    }
    setSelectedStar(star);
  };

  const addMemory = () => {
    void Haptics.selectionAsync();
    router.push({ pathname: '/star/create', params: { cosmosId } });
  };

  if (!cosmos) {
    return (
      <View className="bg-void flex-1 items-center justify-center px-8">
        <Text className="text-muted text-center">This shared cosmos no longer exists.</Text>
        <Pressable className="mt-4" onPress={() => router.back()}>
          <Text className="text-accent font-medium">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const memberNames = cosmos.memberIds.map((id) => userById(id)?.name ?? 'Member');

  return (
    <View className="bg-void flex-1">
      <CosmosCanvas
        stars={stars}
        constellations={constellations}
        revealedStarIds={revealedStarIds}
        selectedStarId={selectedStar?.id}
        forgingStarIds={[]}
        focusStarId={canvasFocusId}
        panelOpen={!!viewingStar}
        onTapStar={onTapStar}
        onTapEmpty={() => {
          setSelectedStar(null);
          setViewingStar(null);
        }}
      />

      {/* Top bar */}
      <View className="pt-safe-offset-12 absolute inset-x-0 top-0 px-4">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            className="bg-background border-glass-border h-11 w-11 items-center justify-center rounded-full border"
          >
            <ChevronLeft size={22} color={ACCENT} strokeWidth={2.1} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-starlight font-display text-xl font-semibold" numberOfLines={1}>
              {cosmos.name}
            </Text>
            <View className="flex-row items-center gap-1.5">
              <UsersRound size={12} color={MUTED} />
              <Text className="text-muted text-xs" numberOfLines={1}>
                {memberNames.join(', ')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Empty state */}
      {stars.length === 0 && (
        <View className="absolute inset-0 items-center justify-center px-10" pointerEvents="none">
          <Text className="text-muted text-center leading-6">
            This shared sky is empty. Tap the button below to add the first memory together.
          </Text>
        </View>
      )}

      {/* Selected memory HUD (compact, opens the panel) */}
      {selectedStar && !viewingStar && (
        <View className="pb-safe-offset-28 absolute inset-x-0 bottom-0 px-4">
          <Pressable onPress={() => openMemory(selectedStar)}>
            <GlassCard contentClassName="flex-row items-center gap-3 p-4">
              <View
                className="h-3.5 w-3.5 rounded-full"
                style={{
                  backgroundColor: colorFor(selectedStar.colorKey).hex,
                  shadowColor: colorFor(selectedStar.colorKey).hex,
                  shadowOpacity: 0.9,
                  shadowRadius: 8,
                }}
              />
              <Text className="text-starlight flex-1 text-base font-semibold" numberOfLines={1}>
                {selectedStar.title}
              </Text>
              <Text className="text-accent text-sm font-medium">Open</Text>
            </GlassCard>
          </Pressable>
        </View>
      )}

      {/* Detail panel */}
      {viewingStar && (
        <MemoryDetailPanel
          star={viewingStar}
          onClose={() => {
            setViewingStar(null);
            setSelectedStar(null);
          }}
        />
      )}

      {/* Add memory FAB */}
      {!viewingStar && (
        <Pressable
          onPress={addMemory}
          className="pb-safe-offset-6 absolute inset-x-0 bottom-0 items-center"
        >
          <View
            className="bg-accent h-14 w-14 items-center justify-center rounded-full"
            style={{ shadowColor: ACCENT, shadowOpacity: 0.6, shadowRadius: 14 }}
          >
            <Plus size={26} color="#0b0c10" strokeWidth={2.4} />
          </View>
        </Pressable>
      )}
    </View>
  );
}
