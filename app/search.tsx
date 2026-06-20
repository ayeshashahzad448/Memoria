import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Chip, Input, Label, Text, TextField } from 'heroui-native';
import { format } from 'date-fns';

import { GlassCard } from '@/components/GlassCard';
import { useMemoria } from '@/lib/store';
import { colorFor, userById } from '@/lib/memoria';
import type { MemoryStar } from '@/lib/types';

type DateRange = 'any' | '30d' | '90d' | '365d';

const RANGES: { key: DateRange; label: string; days: number }[] = [
  { key: 'any', label: 'Any time', days: 0 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
  { key: '365d', label: 'Last year', days: 365 },
];

export default function Search() {
  const router = useRouter();
  const allStars = useMemoria((s) => s.stars);
  const allConstellations = useMemoria((s) => s.constellations);
  const activeCosmosId = useMemoria((s) => s.activeCosmosId);

  const stars = useMemo(
    () => allStars.filter((s) => s.cosmosId === activeCosmosId),
    [allStars, activeCosmosId],
  );
  const constellations = useMemo(
    () => allConstellations.filter((c) => c.cosmosId === activeCosmosId),
    [allConstellations, activeCosmosId],
  );

  const [keywords, setKeywords] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [range, setRange] = useState<DateRange>('any');
  const [userFilter, setUserFilter] = useState<string[]>([]);
  const [constFilter, setConstFilter] = useState<string | null>(null);

  const usersInPlay = useMemo(() => {
    const ids = new Set<string>();
    for (const s of stars) s.taggedUserIds.forEach((id) => ids.add(id));
    return [...ids].map((id) => userById(id)).filter(Boolean);
  }, [stars]);

  const filtered = useMemo(() => {
    const kw = keywords.trim().toLowerCase();
    const loc = locationFilter.trim().toLowerCase();
    const days = RANGES.find((r) => r.key === range)?.days ?? 0;
    const cutoff = days > 0 ? Date.now() - days * 86400000 : 0;
    const constStars = constFilter
      ? new Set(constellations.find((c) => c.id === constFilter)?.starIds ?? [])
      : null;

    return stars.filter((s) => {
      if (kw && !`${s.title} ${s.story}`.toLowerCase().includes(kw)) return false;
      if (loc && !(s.location?.name.toLowerCase().includes(loc) ?? false)) return false;
      if (cutoff && new Date(s.date).getTime() < cutoff) return false;
      if (userFilter.length > 0 && !userFilter.some((u) => s.taggedUserIds.includes(u)))
        return false;
      if (constStars && !constStars.has(s.id)) return false;
      return true;
    });
  }, [stars, keywords, locationFilter, range, userFilter, constFilter, constellations]);

  const open = (star: MemoryStar) => {
    router.back();
    router.push({ pathname: '/star/[id]', params: { id: star.id } });
  };

  const toggleUser = (id: string) =>
    setUserFilter((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <View className="bg-void flex-1">
      <ScrollView contentContainerClassName="px-5 pt-6 pb-12" keyboardShouldPersistTaps="handled">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-starlight text-2xl font-bold">Search the cosmos</Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text className="text-muted">Close</Text>
          </Pressable>
        </View>

        <View className="gap-4">
          <TextField>
            <Label>Title or keywords</Label>
            <Input placeholder="Search memories…" value={keywords} onChangeText={setKeywords} />
          </TextField>

          <TextField>
            <Label>Location name</Label>
            <Input
              placeholder="e.g. Paris, our tree"
              value={locationFilter}
              onChangeText={setLocationFilter}
            />
          </TextField>

          <View className="gap-2">
            <Label>Date range</Label>
            <View className="flex-row flex-wrap gap-2">
              {RANGES.map((r) => (
                <Chip
                  key={r.key}
                  variant={range === r.key ? 'primary' : 'secondary'}
                  color={range === r.key ? 'accent' : 'default'}
                  onPress={() => setRange(r.key)}
                >
                  {r.label}
                </Chip>
              ))}
            </View>
          </View>

          {usersInPlay.length > 0 && (
            <View className="gap-2">
              <Label>Tagged people</Label>
              <View className="flex-row flex-wrap gap-2">
                {usersInPlay.map((u) => (
                  <Chip
                    key={u!.id}
                    variant={userFilter.includes(u!.id) ? 'primary' : 'secondary'}
                    color={userFilter.includes(u!.id) ? 'accent' : 'default'}
                    onPress={() => toggleUser(u!.id)}
                  >
                    {`${u!.avatar} ${u!.name}`}
                  </Chip>
                ))}
              </View>
            </View>
          )}

          {constellations.length > 0 && (
            <View className="gap-2">
              <Label>Constellation group</Label>
              <View className="flex-row flex-wrap gap-2">
                {constellations.map((c) => (
                  <Chip
                    key={c.id}
                    variant={constFilter === c.id ? 'primary' : 'secondary'}
                    color={constFilter === c.id ? 'accent' : 'default'}
                    onPress={() => setConstFilter(constFilter === c.id ? null : c.id)}
                  >
                    {c.name}
                  </Chip>
                ))}
              </View>
            </View>
          )}
        </View>

        <Text className="text-muted mt-6 mb-2 text-sm">
          {filtered.length} result{filtered.length === 1 ? '' : 's'}
        </Text>

        <View className="gap-3">
          {filtered.map((s) => (
            <Pressable key={s.id} onPress={() => open(s)}>
              <GlassCard contentClassName="flex-row items-center gap-3 p-4">
                <View
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: colorFor(s.colorKey).hex }}
                />
                <View className="flex-1">
                  <Text className="text-starlight font-medium">{s.title}</Text>
                  <Text className="text-muted text-xs" numberOfLines={1}>
                    {format(new Date(s.date), 'PP')}
                    {s.location ? ` · ${s.location.name}` : ''}
                  </Text>
                </View>
              </GlassCard>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
