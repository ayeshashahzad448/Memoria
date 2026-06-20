import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input, Text, TextField } from 'heroui-native';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import {
  Camera,
  ChevronDown,
  Link2,
  MapPin,
  Mic,
  Plus,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react-native';

import { CosmosCanvas } from '@/components/CosmosCanvas';
import { GlassCard } from '@/components/GlassCard';
import { useMemoria, PERSONAL_COSMOS } from '@/lib/store';
import { colorFor, userById } from '@/lib/memoria';
import type { MemoryStar } from '@/lib/types';

const ACCENT = colorFor('cyan').hex;
const MUTED = '#8C93B8';

export default function CosmosTab() {
  const router = useRouter();
  const allStars = useMemoria((s) => s.stars);
  const allConstellations = useMemoria((s) => s.constellations);
  const activeCosmosId = useMemoria((s) => s.activeCosmosId);
  const sharedCosmoses = useMemoria((s) => s.sharedCosmoses);
  const createConstellation = useMemoria((s) => s.createConstellation);

  const stars = useMemo(
    () => allStars.filter((s) => s.cosmosId === activeCosmosId),
    [allStars, activeCosmosId],
  );
  const constellations = useMemo(
    () => allConstellations.filter((c) => c.cosmosId === activeCosmosId),
    [allConstellations, activeCosmosId],
  );

  const [selectedStar, setSelectedStar] = useState<MemoryStar | null>(null);
  const [forging, setForging] = useState(false);
  const [forgeIds, setForgeIds] = useState<string[]>([]);
  const [forgeName, setForgeName] = useState('');

  const cosmosName = useMemo(() => {
    if (activeCosmosId === PERSONAL_COSMOS) return 'Your cosmos';
    return sharedCosmoses.find((c) => c.id === activeCosmosId)?.name ?? 'Shared cosmos';
  }, [activeCosmosId, sharedCosmoses]);

  const revealedStarIds = useMemo(() => {
    if (!selectedStar) return [];
    const groups = constellations.filter((c) => c.starIds.includes(selectedStar.id));
    return groups.flatMap((g) => g.starIds);
  }, [selectedStar, constellations]);

  const onTapStar = (star: MemoryStar) => {
    if (forging) {
      void Haptics.selectionAsync();
      setForgeIds((p) => (p.includes(star.id) ? p.filter((x) => x !== star.id) : [...p, star.id]));
      return;
    }
    setSelectedStar(star);
  };

  const beginForge = () => {
    setSelectedStar(null);
    setForging(true);
    setForgeIds([]);
    setForgeName('');
  };

  const confirmForge = () => {
    if (forgeIds.length < 2) return;
    createConstellation(forgeName, forgeIds, 'manual');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    cancelForge();
  };

  const cancelForge = () => {
    setForging(false);
    setForgeIds([]);
    setForgeName('');
  };

  return (
    <View className="bg-void flex-1">
      <CosmosCanvas
        stars={stars}
        constellations={constellations}
        revealedStarIds={revealedStarIds}
        selectedStarId={selectedStar?.id}
        forgingStarIds={forgeIds}
        onTapStar={onTapStar}
        onTapEmpty={() => setSelectedStar(null)}
      />

      {/* Top bar */}
      <View className="pt-safe-offset-2 absolute inset-x-0 top-0 px-4">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.push('/cosmos-spaces')} hitSlop={8}>
            <GlassCard contentClassName="flex-row items-center gap-2 px-4 py-2.5">
              <Text className="text-starlight font-semibold">{cosmosName}</Text>
              <ChevronDown size={16} color={MUTED} />
            </GlassCard>
          </Pressable>
          <Pressable onPress={() => router.push('/search')} hitSlop={8}>
            <GlassCard contentClassName="h-11 w-11 items-center justify-center">
              <Search size={18} color={ACCENT} />
            </GlassCard>
          </Pressable>
        </View>
      </View>

      {/* Empty state hint */}
      {stars.length === 0 && (
        <View className="absolute inset-0 items-center justify-center px-10" pointerEvents="none">
          <Text className="text-muted text-center leading-6">
            Your cosmos is waiting. Tap the plus button to add your first memory.
          </Text>
        </View>
      )}

      {/* HUD card on tap */}
      {selectedStar && !forging && (
        <View className="pb-safe-offset-28 absolute inset-x-0 bottom-0 px-4">
          <HudCard
            star={selectedStar}
            onOpen={() => router.push({ pathname: '/star/[id]', params: { id: selectedStar.id } })}
            onClose={() => setSelectedStar(null)}
          />
        </View>
      )}

      {/* Forge controls */}
      {forging && (
        <View className="pb-safe-offset-28 absolute inset-x-0 bottom-0 px-4">
          <GlassCard contentClassName="gap-3 p-5">
            <Text className="text-starlight font-semibold">New group</Text>
            <Text className="text-muted text-xs">
              Tap two or more memories to connect them in order. {forgeIds.length} selected.
            </Text>
            <TextField>
              <Input placeholder="Name this group" value={forgeName} onChangeText={setForgeName} />
            </TextField>
            <View className="flex-row gap-3">
              <Button variant="ghost" className="flex-1" onPress={cancelForge}>
                Cancel
              </Button>
              <Button className="flex-1" isDisabled={forgeIds.length < 2} onPress={confirmForge}>
                Create group
              </Button>
            </View>
          </GlassCard>
        </View>
      )}

      {/* Bottom action row */}
      {!selectedStar && !forging && (
        <View className="pb-safe-offset-24 absolute inset-x-0 bottom-0 flex-row items-center justify-center gap-3 px-4">
          {stars.length >= 2 && (
            <Pressable onPress={beginForge}>
              <GlassCard contentClassName="flex-row items-center gap-2 px-5 py-3.5">
                <Link2 size={16} color={ACCENT} />
                <Text className="text-starlight">Group</Text>
              </GlassCard>
            </Pressable>
          )}
          <Pressable
            onPress={() =>
              router.push({ pathname: '/star/create', params: { cosmosId: activeCosmosId } })
            }
            hitSlop={8}
          >
            <View
              className="h-16 w-16 items-center justify-center rounded-full"
              style={{
                backgroundColor: ACCENT,
                shadowColor: ACCENT,
                shadowOpacity: 0.9,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 0 },
              }}
            >
              <Plus size={30} color="#0b0e1f" strokeWidth={2.5} />
            </View>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function HudCard({
  star,
  onOpen,
  onClose,
}: {
  star: MemoryStar;
  onOpen: () => void;
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
      </GlassCard>
    </Pressable>
  );
}
