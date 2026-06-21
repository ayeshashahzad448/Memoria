import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Input, Text, TextField } from 'heroui-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import {
  Box,
  Camera,
  ChevronLeft,
  Eye,
  MapPin,
  Mic,
  Plus,
  Spline,
  Square,
  Trash2,
  Users,
  UsersRound,
  X,
} from 'lucide-react-native';

import { CosmosCanvas } from '@/components/CosmosCanvas';
import { GlassCard } from '@/components/GlassCard';
import { MemoryDetailPanel } from '@/components/MemoryDetailPanel';
import { useMemoria } from '@/lib/store';
import { colorFor, userById } from '@/lib/memoria';
import type { Constellation, MemoryStar } from '@/lib/types';

const ACCENT = colorFor('cyan').hex;
const MUTED = '#94A3B8';
const DANGER = '#FF2A6D';

export default function SharedCosmosView() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const cosmosId = Array.isArray(params.id) ? params.id[0] : params.id;

  const allStars = useMemoria((s) => s.stars);
  const allConstellations = useMemoria((s) => s.constellations);
  const sharedCosmoses = useMemoria((s) => s.sharedCosmoses);
  const createConstellation = useMemoria((s) => s.createConstellation);
  const removeStarFromConstellation = useMemoria((s) => s.removeStarFromConstellation);

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
  const [view2D, setView2D] = useState(false);
  // Forge (create constellation) state.
  const [forging, setForging] = useState(false);
  const [forgeIds, setForgeIds] = useState<string[]>([]);
  const [forgeName, setForgeName] = useState('');
  // Group of star ids the canvas should frame (zoom out to a constellation).
  const [fitIds, setFitIds] = useState<string[] | null>(null);
  // Constellation id the canvas should play the glowing line-draw animation for.
  const [drawId, setDrawId] = useState<string | null>(null);
  // Pending "remove this star from this constellation?" confirmation.
  const [removeTarget, setRemoveTarget] = useState<{
    star: MemoryStar;
    group: Constellation;
  } | null>(null);
  // Small transient toast shown after a star is removed from a constellation.
  const [removedMessage, setRemovedMessage] = useState<string | null>(null);

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

  useEffect(() => {
    if (!removedMessage) return undefined;
    const t = setTimeout(() => setRemovedMessage(null), 3200);
    return () => clearTimeout(t);
  }, [removedMessage]);

  const revealedStarIds = useMemo(() => {
    const ids = new Set<string>();
    if (selectedStar) {
      for (const c of constellations) {
        if (c.starIds.includes(selectedStar.id)) {
          for (const sid of c.starIds) ids.add(sid);
        }
      }
    }
    if (fitIds) for (const id of fitIds) ids.add(id);
    return [...ids];
  }, [selectedStar, constellations, fitIds]);

  // Constellations the currently selected star already belongs to.
  const selectedStarGroups = useMemo(() => {
    if (!selectedStar) return [];
    return constellations.filter((c) => c.starIds.includes(selectedStar.id));
  }, [selectedStar, constellations]);

  const openMemory = (star: MemoryStar) => {
    void Haptics.selectionAsync();
    setForging(false);
    setFitIds(null);
    setSelectedStar(star);
    setViewingStar(star);
    setCanvasFocusId(null);
    requestAnimationFrame(() => setCanvasFocusId(star.id));
  };

  const onTapStar = (star: MemoryStar) => {
    if (forging) {
      void Haptics.selectionAsync();
      setForgeIds((p) => (p.includes(star.id) ? p.filter((x) => x !== star.id) : [...p, star.id]));
      return;
    }
    if (viewingStar) {
      openMemory(star);
      return;
    }
    setSelectedStar(star);
  };

  // Begin a new constellation, optionally seeded with one star.
  const beginForge = (seedId?: string) => {
    void Haptics.selectionAsync();
    setViewingStar(null);
    setSelectedStar(null);
    setFitIds(null);
    setForgeName('');
    setForgeIds(seedId ? [seedId] : []);
    setForging(true);
  };

  const confirmForge = () => {
    if (forgeIds.length < 2) return;
    const created = createConstellation(forgeName, forgeIds, 'manual', cosmosId);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setForging(false);
    setForgeName('');
    if (created) {
      setFitIds(created.starIds);
      setDrawId(created.id);
    }
    setForgeIds([]);
  };

  const cancelForge = () => {
    setForging(false);
    setForgeIds([]);
    setForgeName('');
  };

  // Smoothly zoom out to show every memory linked in a constellation, then
  // play the glowing line-draw animation.
  const viewConstellation = (starIds: string[], constellationId?: string) => {
    void Haptics.selectionAsync();
    setSelectedStar(null);
    setViewingStar(null);
    setForging(false);
    setFitIds(null);
    setDrawId(null);
    requestAnimationFrame(() => {
      setFitIds([...starIds]);
      if (constellationId) requestAnimationFrame(() => setDrawId(constellationId));
    });
  };

  const confirmRemoveFromConstellation = () => {
    if (!removeTarget) return;
    const { star, group } = removeTarget;
    const remaining = group.starIds.filter((id) => id !== star.id);
    removeStarFromConstellation(group.id, star.id);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRemoveTarget(null);
    setSelectedStar(null);
    setViewingStar(null);
    setRemovedMessage(group.name);
    if (remaining.length >= 2) viewConstellation(remaining, group.id);
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
        forgingStarIds={forgeIds}
        focusStarId={canvasFocusId}
        fitStarIds={fitIds}
        drawConstellationId={drawId}
        onDrawComplete={() => setDrawId(null)}
        view2D={view2D}
        panelOpen={!!viewingStar}
        onTapStar={onTapStar}
        onTapEmpty={() => {
          setSelectedStar(null);
          setViewingStar(null);
          setFitIds(null);
        }}
      />

      {/* Top bar */}
      <View className="pt-safe-offset-12 absolute inset-x-0 top-0 px-4">
        <View className="flex-row items-start gap-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            className="bg-background border-glass-border h-11 w-11 items-center justify-center rounded-full border"
          >
            <ChevronLeft size={22} color={ACCENT} strokeWidth={2.1} />
          </Pressable>
          <View className="flex-1 pt-0.5">
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
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              setView2D((v) => !v);
            }}
            hitSlop={8}
          >
            <View
              className="bg-background border-accent/60 h-11 w-11 items-center justify-center rounded-full border"
              style={{ borderWidth: 1 }}
            >
              {view2D ? (
                <Square width={22} height={22} color={ACCENT} strokeWidth={2.1} />
              ) : (
                <Box width={22} height={22} color={ACCENT} strokeWidth={2.1} />
              )}
            </View>
          </Pressable>
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

      {/* Connecting animation banner */}
      {drawId && (
        <View
          className="pb-safe-offset-28 absolute inset-x-0 bottom-0 items-center"
          pointerEvents="none"
        >
          <GlassCard contentClassName="flex-row items-center gap-2 px-4 py-2.5">
            <Spline size={15} color={ACCENT} strokeWidth={2.1} />
            <Text className="text-starlight text-sm font-medium">Connecting your memories</Text>
          </GlassCard>
        </View>
      )}

      {/* Exit constellation view */}
      {fitIds && !drawId && !selectedStar && !forging && (
        <View className="pb-safe-offset-28 absolute inset-x-0 bottom-0 items-center">
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              setFitIds(null);
            }}
          >
            <GlassCard contentClassName="flex-row items-center gap-2 px-4 py-2.5">
              <X size={15} color={MUTED} />
              <Text className="text-muted text-sm font-medium">Exit constellation view</Text>
            </GlassCard>
          </Pressable>
        </View>
      )}

      {/* Selected memory HUD */}
      {selectedStar && !viewingStar && !forging && (
        <View className="pb-safe-offset-28 absolute inset-x-0 bottom-0 px-4">
          <HudCard
            star={selectedStar}
            groups={selectedStarGroups}
            onOpen={() => openMemory(selectedStar)}
            onAdd={() => beginForge(selectedStar.id)}
            onView={viewConstellation}
            onRemove={(group) => setRemoveTarget({ star: selectedStar, group })}
            canConnect={stars.length >= 2}
            onClose={() => setSelectedStar(null)}
          />
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

      {/* Forge controls */}
      {forging && (
        <View className="pb-safe-offset-28 absolute inset-x-0 bottom-0 px-4">
          <GlassCard contentClassName="gap-2.5 p-3.5">
            <View className="flex-row items-center justify-between">
              <Text className="text-starlight text-sm font-semibold">New constellation</Text>
              <View className="bg-accent/15 rounded-full px-2 py-0.5">
                <Text className="text-accent text-xs font-semibold">
                  {forgeIds.length} selected
                </Text>
              </View>
            </View>
            <Text className="text-muted text-xs">
              Tap memories in the order you want them linked.
            </Text>
            <TextField>
              <Input
                placeholder="Name this constellation"
                value={forgeName}
                onChangeText={setForgeName}
              />
            </TextField>
            <View className="flex-row gap-2.5">
              <Button variant="ghost" size="sm" className="flex-1" onPress={cancelForge}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1"
                isDisabled={forgeIds.length < 2}
                onPress={confirmForge}
              >
                Create constellation
              </Button>
            </View>
          </GlassCard>
        </View>
      )}

      {/* Removed-from-constellation toast */}
      {removedMessage && (
        <View
          pointerEvents="none"
          className="pt-safe-offset-28 absolute inset-x-0 top-0 items-center px-6"
        >
          <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(400)}>
            <GlassCard contentClassName="flex-row items-center gap-2 px-4 py-2.5">
              <Spline size={15} color={ACCENT} strokeWidth={2.1} />
              <Text className="text-starlight text-sm font-medium" numberOfLines={1}>
                {`Removed from ${removedMessage}`}
              </Text>
            </GlassCard>
          </Animated.View>
        </View>
      )}

      {/* Remove-from-constellation confirmation */}
      {removeTarget && (
        <View className="absolute inset-0 items-center justify-center px-8">
          <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(200)}>
            <GlassCard
              intensity={60}
              contentClassName="w-80 max-w-full items-center gap-3 px-6 py-7"
            >
              <View className="bg-danger/10 mb-1 h-12 w-12 items-center justify-center rounded-full">
                <Spline size={22} color={DANGER} strokeWidth={2} />
              </View>
              <Text className="text-starlight font-display text-center text-lg font-semibold">
                Remove from constellation?
              </Text>
              <Text className="text-muted text-center text-sm leading-5">
                {`"${removeTarget.star.title}" will be removed from "${removeTarget.group.name}". The constellation stays connected through its other memories.`}
              </Text>
              <View className="mt-1 w-full gap-2.5">
                <Button variant="danger" onPress={confirmRemoveFromConstellation}>
                  Remove memory
                </Button>
                <Button variant="ghost" onPress={() => setRemoveTarget(null)}>
                  Keep it
                </Button>
              </View>
            </GlassCard>
          </Animated.View>
        </View>
      )}

      {/* Add memory FAB */}
      {!viewingStar && !selectedStar && !forging && (
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

function HudCard({
  star,
  groups,
  onOpen,
  onAdd,
  onView,
  onRemove,
  canConnect,
  onClose,
}: {
  star: MemoryStar;
  groups: Constellation[];
  onOpen: () => void;
  onAdd: () => void;
  onView: (starIds: string[], constellationId?: string) => void;
  onRemove: (group: Constellation) => void;
  canConnect: boolean;
  onClose: () => void;
}) {
  const color = colorFor(star.colorKey);
  const tagged = star.taggedUserIds.map((id) => userById(id)).filter(Boolean);
  return (
    <Pressable onPress={onOpen}>
      <GlassCard contentClassName="gap-2.5 p-5">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-2.5">
            <View
              className="h-3.5 w-3.5 rounded-full"
              style={{
                backgroundColor: color.hex,
                shadowColor: color.hex,
                shadowOpacity: 0.9,
                shadowRadius: 8,
              }}
            />
            <Text className="text-starlight flex-1 text-lg font-semibold" numberOfLines={1}>
              {star.title}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <X size={18} color={MUTED} />
          </Pressable>
        </View>

        <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1.5">
          <Text className="text-muted text-xs">{format(new Date(star.date), 'PP')}</Text>
          {star.location ? (
            <View className="flex-row items-center gap-1">
              <MapPin size={12} color={MUTED} />
              <Text className="text-muted text-xs" numberOfLines={1}>
                {star.location.name}
              </Text>
            </View>
          ) : null}
        </View>

        {tagged.length > 0 && (
          <View className="flex-row items-center gap-1.5">
            <Users size={12} color={MUTED} />
            <Text className="text-muted text-xs">{tagged.map((u) => u!.name).join(', ')}</Text>
          </View>
        )}

        {(star.photos.length > 0 || star.voiceNotes.length > 0) && (
          <View className="flex-row items-center gap-3.5 pt-0.5">
            {star.photos.length > 0 && (
              <View className="flex-row items-center gap-1">
                <Camera size={12} color={MUTED} />
                <Text className="text-muted text-xs">{star.photos.length}</Text>
              </View>
            )}
            {star.voiceNotes.length > 0 && (
              <View className="flex-row items-center gap-1">
                <Mic size={12} color={MUTED} />
                <Text className="text-muted text-xs">{star.voiceNotes.length}</Text>
              </View>
            )}
          </View>
        )}

        {/* Actions — equal-sized stacked buttons */}
        <View className="gap-2 pt-0.5">
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onOpen();
            }}
            className="border-glass-border h-11 flex-row items-center justify-center gap-2 rounded-xl border"
          >
            <Eye size={15} color={ACCENT} strokeWidth={2.1} />
            <Text className="text-accent text-sm font-medium">Open Memory</Text>
          </Pressable>

          {groups.length > 0 ? (
            groups.map((g) => (
              <View key={g.id} className="gap-2">
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onView(g.starIds, g.id);
                  }}
                  className="border-glass-border h-11 flex-row items-center justify-center gap-2 rounded-xl border"
                >
                  <Eye size={15} color={ACCENT} strokeWidth={2.1} />
                  <Text className="text-accent text-sm font-medium">View Constellation</Text>
                </Pressable>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onRemove(g);
                  }}
                  className="border-glass-border h-11 flex-row items-center justify-center gap-2 rounded-xl border"
                >
                  <Trash2 size={15} color={DANGER} strokeWidth={2.1} />
                  <Text className="text-sm font-medium" style={{ color: DANGER }}>
                    Remove from constellation
                  </Text>
                </Pressable>
              </View>
            ))
          ) : canConnect ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onAdd();
              }}
              className="border-glass-border h-11 flex-row items-center justify-center gap-2 rounded-xl border"
            >
              <Spline size={15} color={ACCENT} strokeWidth={2.1} />
              <Text className="text-accent text-sm font-medium">Connect into a constellation</Text>
            </Pressable>
          ) : null}
        </View>
      </GlassCard>
    </Pressable>
  );
}
