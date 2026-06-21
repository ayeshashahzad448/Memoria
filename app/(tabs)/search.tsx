import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Chip, Input, Label, Text, TextField } from 'heroui-native';
import { format, isSameDay } from 'date-fns';
import { CalendarDays, MapPin, Search as SearchIcon, X } from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { WheelDatePicker } from '@/components/WheelDatePicker';
import { useMemoria } from '@/lib/store';
import { colorFor, userById } from '@/lib/memoria';
import type { MemoryStar } from '@/lib/types';

const MUTED = '#94A3B8';

export default function SearchTab() {
  const router = useRouter();
  const allStars = useMemoria((s) => s.stars);
  const allConstellations = useMemoria((s) => s.constellations);
  const activeCosmosId = useMemoria((s) => s.activeCosmosId);
  const setOpenMemoryStar = useMemoria((s) => s.setOpenMemoryStar);

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [userFilter, setUserFilter] = useState<string[]>([]);
  const [constFilter, setConstFilter] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const usersInPlay = useMemo(() => {
    const ids = new Set<string>();
    for (const s of stars) s.taggedUserIds.forEach((id) => ids.add(id));
    return [...ids].map((id) => userById(id)).filter(Boolean);
  }, [stars]);

  const filtered = useMemo(() => {
    const kw = keywords.trim().toLowerCase();
    const loc = locationFilter.trim().toLowerCase();
    const constStars = constFilter
      ? new Set(constellations.find((c) => c.id === constFilter)?.starIds ?? [])
      : null;

    return stars.filter((s) => {
      if (kw && !`${s.title} ${s.story}`.toLowerCase().includes(kw)) return false;
      if (loc && !(s.location?.name.toLowerCase().includes(loc) ?? false)) return false;
      if (selectedDate && !isSameDay(new Date(s.date), selectedDate)) return false;
      if (userFilter.length > 0 && !userFilter.some((u) => s.taggedUserIds.includes(u)))
        return false;
      if (constStars && !constStars.has(s.id)) return false;
      return true;
    });
  }, [stars, keywords, locationFilter, selectedDate, userFilter, constFilter, constellations]);

  // Take the user to the star in their cosmos: request it be opened, then switch
  // to the Cosmos tab where it pans/zooms in on the left and its detail panel
  // slides in on the right — the same view you get by tapping a star.
  const open = (star: MemoryStar) => {
    setOpenMemoryStar(star.id);
    router.navigate('/(tabs)');
  };

  const toggleUser = (id: string) =>
    setUserFilter((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <View className="bg-void flex-1">
      <ScrollView
        scrollEnabled={scrollEnabled}
        contentContainerClassName="px-5 pt-safe-offset-4 pb-32"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-starlight font-display text-3xl font-bold">Search</Text>
            <Text className="text-muted mt-1 mb-6 text-sm">Find any memory in your cosmos.</Text>
          </View>
          <Pressable
            onPress={() => router.navigate('/(tabs)')}
            hitSlop={12}
            className="bg-surface border-border h-9 w-9 items-center justify-center rounded-full border"
          >
            <X size={18} color={MUTED} />
          </Pressable>
        </View>

        <View className="gap-4">
          <TextField>
            <Label>Title or keywords</Label>
            <Input placeholder="Search memories" value={keywords} onChangeText={setKeywords} />
          </TextField>

          <TextField>
            <Label>Location</Label>
            <Input
              placeholder="e.g. Paris, our tree"
              value={locationFilter}
              onChangeText={setLocationFilter}
            />
          </TextField>

          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Label>Date</Label>
              {selectedDate ? (
                <Pressable onPress={() => setSelectedDate(null)}>
                  <Text className="text-accent text-xs font-medium">Clear</Text>
                </Pressable>
              ) : null}
            </View>
            <GlassCard contentClassName="gap-2 p-4">
              {!selectedDate ? (
                <Pressable
                  onPress={() => setSelectedDate(new Date())}
                  className="flex-row items-center justify-center gap-2 py-2"
                >
                  <CalendarDays size={18} color={MUTED} />
                  <Text className="text-muted text-sm">Pick a date to filter by</Text>
                </Pressable>
              ) : (
                <WheelDatePicker
                  value={selectedDate}
                  onChange={setSelectedDate}
                  onActiveChange={(active) => setScrollEnabled(!active)}
                />
              )}
            </GlassCard>
            {selectedDate ? (
              <Text className="text-muted text-xs">
                Showing memories on {format(selectedDate, 'PP')}
              </Text>
            ) : null}
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
                    {u!.name}
                  </Chip>
                ))}
              </View>
            </View>
          )}

          {constellations.length > 0 && (
            <View className="gap-2">
              <Label>Group</Label>
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

        <Text className="text-muted mt-6 mb-2.5 text-sm">
          {filtered.length} result{filtered.length === 1 ? '' : 's'}
        </Text>

        {filtered.length === 0 ? (
          <GlassCard contentClassName="items-center gap-2 p-6">
            <SearchIcon size={20} color={MUTED} />
            <Text className="text-muted text-center text-sm">No memories match these filters.</Text>
          </GlassCard>
        ) : (
          <View className="gap-2.5">
            {filtered.map((s) => (
              <Pressable key={s.id} onPress={() => open(s)}>
                <GlassCard contentClassName="flex-row items-center gap-3 p-4">
                  <View
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: colorFor(s.colorKey).hex }}
                  />
                  <View className="flex-1">
                    <Text className="text-starlight font-medium">{s.title}</Text>
                    <View className="mt-0.5 flex-row items-center gap-1.5">
                      <Text className="text-muted text-xs">{format(new Date(s.date), 'PP')}</Text>
                      {s.location ? (
                        <>
                          <MapPin size={11} color={MUTED} />
                          <Text className="text-muted text-xs" numberOfLines={1}>
                            {s.location.name}
                          </Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                </GlassCard>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
