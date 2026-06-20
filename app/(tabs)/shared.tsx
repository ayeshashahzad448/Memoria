import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Text } from 'heroui-native';
import { format } from 'date-fns';
import { ChevronRight, MapPin, Plus, UsersRound } from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { useMemoria } from '@/lib/store';
import { CURRENT_USER, colorFor, userById } from '@/lib/memoria';
import type { MemoryStar } from '@/lib/types';

const ACCENT = colorFor('cyan').hex;
const MUTED = '#94A3B8';

export default function SharedTab() {
  const router = useRouter();
  const allStars = useMemoria((s) => s.stars);
  const sharedCosmoses = useMemoria((s) => s.sharedCosmoses);

  // Memories that are co-authored, tagged with others, or live in a shared cosmos.
  const sharedCosmosIds = useMemo(() => new Set(sharedCosmoses.map((c) => c.id)), [sharedCosmoses]);
  const sharedStars = useMemo(
    () =>
      allStars
        .filter(
          (s) =>
            s.taggedUserIds.length > 0 ||
            sharedCosmosIds.has(s.cosmosId) ||
            s.authorId !== CURRENT_USER.id,
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [allStars, sharedCosmosIds],
  );

  const open = (star: MemoryStar) =>
    router.push({ pathname: '/star/[id]', params: { id: star.id } });

  return (
    <View className="bg-void flex-1">
      <ScrollView contentContainerClassName="px-5 pt-safe-offset-4 pb-32">
        <Text className="text-starlight font-display text-3xl font-bold">Shared</Text>
        <Text className="text-muted mt-1 mb-6 text-sm leading-5">
          Memories you share with others, and your shared family cosmos spaces.
        </Text>

        {/* Shared cosmos spaces */}
        <Pressable onPress={() => router.push('/cosmos-spaces')}>
          <GlassCard contentClassName="flex-row items-center gap-3 p-5">
            <UsersRound size={18} color={ACCENT} />
            <View className="flex-1">
              <Text className="text-starlight font-medium">Shared cosmos spaces</Text>
              <Text className="text-muted text-xs">
                {sharedCosmoses.length} space{sharedCosmoses.length === 1 ? '' : 's'}
              </Text>
            </View>
            <ChevronRight size={18} color={MUTED} />
          </GlassCard>
        </Pressable>

        {/* Co-authored / tagged memories */}
        <Text className="text-muted mt-7 mb-2.5 text-xs font-semibold tracking-widest uppercase">
          Shared memories
        </Text>

        {sharedStars.length === 0 ? (
          <GlassCard contentClassName="items-center gap-3 p-6">
            <UsersRound size={22} color={MUTED} />
            <Text className="text-muted text-center text-sm leading-5">
              Nothing shared yet. Tag people when you create a memory and it will appear here.
            </Text>
            <Button size="sm" onPress={() => router.push('/star/create')}>
              <Plus size={15} color="#0b0c10" />
              <Button.Label>Add a memory</Button.Label>
            </Button>
          </GlassCard>
        ) : (
          <View className="gap-2.5">
            {sharedStars.map((s) => {
              const color = colorFor(s.colorKey);
              const tagged = s.taggedUserIds.map((id) => userById(id)).filter(Boolean);
              return (
                <Pressable key={s.id} onPress={() => open(s)}>
                  <GlassCard contentClassName="gap-2 p-4">
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
                      <Text className="text-starlight flex-1 font-semibold" numberOfLines={1}>
                        {s.title}
                      </Text>
                      <Text className="text-muted text-xs">{format(new Date(s.date), 'PP')}</Text>
                    </View>
                    <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
                      {tagged.length > 0 && (
                        <View className="flex-row items-center gap-1.5">
                          <UsersRound size={12} color={MUTED} />
                          <Text className="text-muted text-xs" numberOfLines={1}>
                            {tagged.map((u) => u!.name).join(', ')}
                          </Text>
                        </View>
                      )}
                      {s.location ? (
                        <View className="flex-row items-center gap-1">
                          <MapPin size={12} color={MUTED} />
                          <Text className="text-muted text-xs" numberOfLines={1}>
                            {s.location.name}
                          </Text>
                        </View>
                      ) : null}
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
