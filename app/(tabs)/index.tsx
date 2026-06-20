import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input, Text, TextField } from 'heroui-native';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import {
  Camera,
  Eye,
  MapPin,
  Mic,
  Box,
  Plus,
  Square,
  Search,
  Sparkles,
  Spline,
  Users,
  X,
} from 'lucide-react-native';

import { CosmosCanvas } from '@/components/CosmosCanvas';
import { GlassCard } from '@/components/GlassCard';
import { CosmosTutorial } from '@/components/CosmosTutorial';
import { useMemoria, PERSONAL_COSMOS } from '@/lib/store';
import { colorFor, userById } from '@/lib/memoria';
import type { Constellation, MemoryStar } from '@/lib/types';

const ACCENT = colorFor('cyan').hex;
const MUTED = '#94A3B8';

export default function CosmosTab() {
  const router = useRouter();
  const allStars = useMemoria((s) => s.stars);
  const allConstellations = useMemoria((s) => s.constellations);
  const createConstellation = useMemoria((s) => s.createConstellation);
  const addStarsToConstellation = useMemoria((s) => s.addStarsToConstellation);
  const hasSeenTutorial = useMemoria((s) => s.hasSeenTutorial);
  const completeTutorial = useMemoria((s) => s.completeTutorial);
  const focusStarId = useMemoria((s) => s.focusStarId);
  const focusStar = useMemoria((s) => s.focusStar);

  // The central Cosmos is always the user's personal universe. Shared cosmos
  // spaces live in the Shared tab.
  const stars = useMemo(() => allStars.filter((s) => s.cosmosId === PERSONAL_COSMOS), [allStars]);
  const constellations = useMemo(
    () => allConstellations.filter((c) => c.cosmosId === PERSONAL_COSMOS),
    [allConstellations],
  );

  const [selectedStar, setSelectedStar] = useState<MemoryStar | null>(null);
  const [forging, setForging] = useState(false);
  const [forgeIds, setForgeIds] = useState<string[]>([]);
  const [forgeName, setForgeName] = useState('');
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [view2D, setView2D] = useState(false);
  // Local focus target handed to the canvas to animate toward (from search).
  const [canvasFocusId, setCanvasFocusId] = useState<string | null>(null);
  // Group of star ids the canvas should frame (zoom out to a constellation).
  const [fitIds, setFitIds] = useState<string[] | null>(null);
  // Constellation id the canvas should play the glowing line-draw animation for.
  const [drawId, setDrawId] = useState<string | null>(null);
  // A star awaiting "add to an existing constellation" selection.
  const [addStarTarget, setAddStarTarget] = useState<MemoryStar | null>(null);

  // Show the guided coachmark once for first-time users.
  useEffect(() => {
    if (!hasSeenTutorial) setTutorialVisible(true);
  }, [hasSeenTutorial]);

  // When search asks to focus a star, select it so its HUD card appears and
  // hand the id to the canvas so it animates the pan/zoom. Then clear the
  // store request so re-selecting the same star later works again.
  useEffect(() => {
    if (!focusStarId) return;
    const target = stars.find((s) => s.id === focusStarId);
    if (target) {
      setForging(false);
      setSelectedStar(target);
      // Toggle through null first so re-focusing the same star always re-fires.
      setCanvasFocusId(null);
      requestAnimationFrame(() => setCanvasFocusId(target.id));
    }
    focusStar(null);
  }, [focusStarId, stars, focusStar]);

  const dismissTutorial = () => {
    setTutorialVisible(false);
    completeTutorial();
  };

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

  const onTapStar = (star: MemoryStar) => {
    if (forging) {
      void Haptics.selectionAsync();
      setForgeIds((p) => (p.includes(star.id) ? p.filter((x) => x !== star.id) : [...p, star.id]));
      return;
    }
    setSelectedStar(star);
  };

  const beginForge = (seedStarId?: string) => {
    setSelectedStar(null);
    setFitIds(null);
    setForging(true);
    setForgeIds(seedStarId ? [seedStarId] : []);
    setForgeName('');
  };

  const confirmForge = () => {
    if (forgeIds.length < 2) return;
    const created = createConstellation(forgeName, forgeIds, 'manual');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setForging(false);
    setForgeName('');
    if (created) {
      // Frame the new group and play the glowing line-draw animation.
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

  // Smoothly zoom out to show every memory linked in a constellation.
  const viewConstellation = (starIds: string[]) => {
    void Haptics.selectionAsync();
    setSelectedStar(null);
    // Re-fire even if the same group is requested again.
    setFitIds(null);
    requestAnimationFrame(() => setFitIds([...starIds]));
  };

  // Constellations a given star is NOT already part of (candidates to add to).
  const addCandidates = useMemo(() => {
    if (!addStarTarget) return [];
    return constellations.filter((c) => !c.starIds.includes(addStarTarget.id));
  }, [addStarTarget, constellations]);

  // "Add to" a star: if there are existing constellations to join, open the
  // picker; otherwise start a fresh forge seeded with this star.
  const onAddToConstellation = (star: MemoryStar) => {
    const candidates = constellations.filter((c) => !c.starIds.includes(star.id));
    if (candidates.length > 0) {
      setSelectedStar(null);
      setAddStarTarget(star);
      return;
    }
    beginForge(star.id);
  };

  const confirmAddToExisting = (constellation: Constellation) => {
    if (!addStarTarget) return;
    addStarsToConstellation(constellation.id, [addStarTarget.id]);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const allIds = Array.from(new Set([...constellation.starIds, addStarTarget.id]));
    setAddStarTarget(null);
    // Frame the group and replay the glowing draw across the updated lines.
    setFitIds(allIds);
    setDrawId(null);
    requestAnimationFrame(() => setDrawId(constellation.id));
  };

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
        onTapStar={onTapStar}
        onTapEmpty={() => {
          setSelectedStar(null);
          setFitIds(null);
        }}
      />

      {/* Top bar */}
      <View className="pt-safe-offset-12 absolute inset-x-0 top-0 px-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-2">
            <Text className="text-starlight font-display text-3xl leading-9 font-semibold">
              Navigate Your{'\n'}Universe
            </Text>
          </View>
          <View className="items-end gap-2">
            <Pressable onPress={() => router.push('/search')} hitSlop={8}>
              <View
                className="bg-background border-accent/60 h-11 w-11 items-center justify-center rounded-full border"
                style={{ borderWidth: 1 }}
              >
                <Search width={22} height={22} color={ACCENT} strokeWidth={2.1} />
              </View>
            </Pressable>
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
      </View>

      {/* Empty state hint */}
      {stars.length === 0 && !tutorialVisible && (
        <View className="absolute inset-0 items-center justify-center px-10" pointerEvents="none">
          <Text className="text-muted text-center leading-6">
            Your cosmos is waiting. Tap the Cosmos button below to add your first memory.
          </Text>
        </View>
      )}

      {/* Connecting animation banner */}
      {drawId && (
        <View
          className="pt-safe-offset-12 absolute inset-x-0 top-0 items-center"
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
        <View className="pt-safe-offset-12 absolute inset-x-0 top-0 items-center">
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

      {/* HUD card on tap */}
      {selectedStar && !forging && (
        <View className="pb-safe-offset-32 absolute inset-x-0 bottom-0 px-4">
          <HudCard
            star={selectedStar}
            groups={selectedStarGroups}
            onOpen={() => router.push({ pathname: '/star/[id]', params: { id: selectedStar.id } })}
            onAdd={() => onAddToConstellation(selectedStar)}
            onCreate={() => beginForge(selectedStar.id)}
            onView={viewConstellation}
            canConnect={stars.length >= 2}
            onClose={() => setSelectedStar(null)}
          />
        </View>
      )}

      {/* Add-to-existing constellation picker */}
      {addStarTarget && (
        <View className="pb-safe-offset-32 absolute inset-x-0 bottom-0 px-4">
          <GlassCard contentClassName="gap-3 p-5">
            <Text className="text-starlight font-semibold">Add to a constellation</Text>
            <Text className="text-muted text-xs" numberOfLines={1}>
              Link {addStarTarget.title} into an existing constellation.
            </Text>
            <View className="gap-2">
              {addCandidates.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => confirmAddToExisting(c)}
                  className="border-glass-border flex-row items-center gap-2 rounded-xl border px-3.5 py-3"
                >
                  <Spline size={15} color={ACCENT} strokeWidth={2.1} />
                  <Text className="text-starlight flex-1 text-sm font-medium" numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text className="text-muted text-xs">{c.starIds.length}</Text>
                </Pressable>
              ))}
            </View>
            <View className="flex-row gap-3">
              <Button variant="ghost" className="flex-1" onPress={() => setAddStarTarget(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onPress={() => {
                  const seed = addStarTarget.id;
                  setAddStarTarget(null);
                  beginForge(seed);
                }}
              >
                New instead
              </Button>
            </View>
          </GlassCard>
        </View>
      )}

      {/* Forge controls — compact so memories stay easy to tap */}
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

      {/* Bottom action row */}
      {!selectedStar && !forging && !addStarTarget && !drawId && !fitIds && stars.length >= 2 && (
        <View className="pb-safe-offset-28 absolute inset-x-0 bottom-0 flex-row items-center justify-center px-8">
          <Pressable onPress={() => router.push('/constellations')}>
            <GlassCard contentClassName="px-5 py-3.5">
              <Text className="text-starlight font-medium">Constellations</Text>
            </GlassCard>
          </Pressable>
        </View>
      )}

      {tutorialVisible && (
        <CosmosTutorial
          onDone={dismissTutorial}
          onCreate={() =>
            router.push({ pathname: '/star/create', params: { cosmosId: PERSONAL_COSMOS } })
          }
        />
      )}
    </View>
  );
}

function HudCard({
  star,
  groups,
  onOpen,
  onAdd,
  onCreate,
  onView,
  canConnect,
  onClose,
}: {
  star: MemoryStar;
  groups: Constellation[];
  onOpen: () => void;
  onAdd: () => void;
  onCreate: () => void;
  onView: (starIds: string[]) => void;
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
          <View className="ml-auto flex-row items-center gap-1">
            <Sparkles size={12} color={ACCENT} />
            <Text className="text-accent text-xs">Open memory</Text>
          </View>
        </View>

        {/* Constellation actions */}
        {groups.length > 0 && (
          <View className="gap-2">
            {groups.map((g) => (
              <Pressable
                key={g.id}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onView(g.starIds);
                }}
                className="border-glass-border flex-row items-center justify-center gap-2 rounded-xl border py-2.5"
              >
                <Eye size={15} color={ACCENT} strokeWidth={2.1} />
                <Text className="text-accent text-sm font-medium" numberOfLines={1}>
                  View {g.name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {canConnect && (
          <View className="flex-row gap-2">
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onAdd();
              }}
              className="border-glass-border flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border py-2.5"
            >
              <Spline size={15} color={ACCENT} strokeWidth={2.1} />
              <Text className="text-accent text-sm font-medium">Add to</Text>
            </Pressable>
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onCreate();
              }}
              className="border-glass-border flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border py-2.5"
            >
              <Plus size={15} color={ACCENT} strokeWidth={2.1} />
              <Text className="text-accent text-sm font-medium">Create</Text>
            </Pressable>
          </View>
        )}
      </GlassCard>
    </Pressable>
  );
}
