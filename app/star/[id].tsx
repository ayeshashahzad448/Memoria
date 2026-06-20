import { useMemo } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Separator, Text } from 'heroui-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { format } from 'date-fns';
import {
  CalendarDays,
  Flame,
  MapPin,
  Mic,
  Pencil,
  Sparkles,
  Sun,
  Users,
  Weight,
} from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { StarPreview } from '@/components/StarPreview';
import { VoiceNotePlayer } from '@/components/VoiceNotePlayer';
import { useMemoria } from '@/lib/store';
import { colorFor, starStatsForStar, userById } from '@/lib/memoria';

const ACCENT = colorFor('cyan').hex;
const MUTED = '#94A3B8';

export default function StarDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; justCreated?: string }>();
  const id = params.id;
  const justCreated = params.justCreated === '1';
  const star = useMemoria((s) => s.stars.find((x) => x.id === id));
  const removeStar = useMemoria((s) => s.removeStar);

  const stats = useMemo(() => (star ? starStatsForStar(star) : null), [star]);

  if (!star || !stats) {
    return (
      <View className="bg-void flex-1 items-center justify-center px-6">
        <Text className="text-muted">This memory could not be found.</Text>
        <Button variant="ghost" onPress={() => router.back()} className="mt-4">
          Back
        </Button>
      </View>
    );
  }

  const color = colorFor(star.colorKey);
  const tagged = star.taggedUserIds.map((uid) => userById(uid)).filter(Boolean);

  // "Gentle fade + drift up" launch — only the first time, after creation.
  const wrap = (delay: number, children: React.ReactNode) =>
    justCreated ? (
      <Animated.View entering={FadeInDown.duration(520).delay(delay)}>{children}</Animated.View>
    ) : (
      <View>{children}</View>
    );

  return (
    <View className="bg-void flex-1">
      <ScrollView contentContainerClassName="px-5 pt-6 pb-12">
        <View className="mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View
              className="h-4 w-4 rounded-full"
              style={{
                backgroundColor: color.hex,
                shadowColor: color.hex,
                shadowOpacity: 0.9,
                shadowRadius: 8,
              }}
            />
            <Text className="text-muted text-xs tracking-widest uppercase">{color.emotion}</Text>
          </View>
          <View className="flex-row items-center gap-4">
            <Pressable
              onPress={() => router.push({ pathname: '/star/edit', params: { id: star.id } })}
              hitSlop={12}
              className="flex-row items-center gap-1.5"
            >
              <Pencil size={15} color={ACCENT} />
              <Text className="text-accent">Edit</Text>
            </Pressable>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text className="text-muted">Close</Text>
            </Pressable>
          </View>
        </View>

        {wrap(
          0,
          <>
            <Text className="text-starlight font-display text-3xl leading-9 font-bold">
              {star.title}
            </Text>

            <View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-1.5">
              <View className="flex-row items-center gap-1.5">
                <CalendarDays size={14} color={MUTED} />
                <Text className="text-muted text-sm">{format(new Date(star.date), 'PPP')}</Text>
              </View>
              {star.location ? (
                <View className="flex-row items-center gap-1.5">
                  <MapPin size={14} color={MUTED} />
                  <Text className="text-muted text-sm">{star.location.name}</Text>
                </View>
              ) : null}
            </View>

            {tagged.length > 0 && (
              <View className="mt-3 flex-row flex-wrap items-center gap-2">
                <Users size={14} color={MUTED} />
                {tagged.map((u) => (
                  <View key={u!.id} className="border-glass-border rounded-full border px-3 py-1">
                    <Text className="text-starlight text-xs">{u!.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </>,
        )}

        {wrap(
          120,
          <GlassCard className="mt-5" contentClassName="p-0">
            <View className="flex-row items-center gap-3 px-4 pt-4 pb-2">
              <View
                style={{ width: 92, height: 92, overflow: 'hidden' }}
                className="items-center justify-center"
              >
                <View style={{ marginLeft: -34, marginTop: -14 }}>
                  <StarPreview story={star.story} title={star.title} colorKey={star.colorKey} />
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-muted text-[11px] tracking-[2px] uppercase">
                  Stellar profile
                </Text>
                <Text
                  className="font-display text-lg font-semibold"
                  style={{ color: color.hex }}
                  numberOfLines={1}
                >
                  {stats.spectralName}
                </Text>
              </View>
            </View>
            <View className="flex-row flex-wrap px-4 pt-1 pb-4">
              <StatCell
                icon={<Flame size={15} color="#FF8A5C" />}
                label="Temperature"
                value={`${stats.temperatureK.toLocaleString()} K`}
              />
              <StatCell
                icon={<Weight size={15} color={color.hex} />}
                label="Mass"
                value={`${stats.massSolar.toFixed(2)} M\u2609`}
              />
              <StatCell
                icon={<Sun size={15} color="#FFC75F" />}
                label="Luminosity"
                value={`${stats.luminositySolar.toFixed(1)} L\u2609`}
              />
              <StatCell
                icon={<Sparkles size={15} color={color.hex} />}
                label="Spectral class"
                value={stats.spectralClass}
              />
            </View>
          </GlassCard>,
        )}

        {star.photos.length > 0 &&
          wrap(
            220,
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-5">
              <View className="flex-row gap-3">
                {star.photos.map((uri) => (
                  <Image
                    key={uri}
                    source={{ uri }}
                    style={{ width: 220, height: 220, borderRadius: 20 }}
                  />
                ))}
              </View>
            </ScrollView>,
          )}

        {star.story.trim().length > 0 &&
          wrap(
            320,
            <GlassCard className="mt-5" contentClassName="p-5">
              <Text className="text-starlight/90 font-serif text-base leading-7">{star.story}</Text>
            </GlassCard>,
          )}

        {star.voiceNotes.length > 0 &&
          wrap(
            420,
            <View className="mt-5 gap-2">
              <View className="flex-row items-center gap-2">
                <Mic size={15} color={MUTED} />
                <Text className="text-muted text-sm">Voice notes</Text>
              </View>
              {star.voiceNotes.map((n, i) => (
                <VoiceNotePlayer key={n.id} note={n} index={i} />
              ))}
            </View>,
          )}

        <Separator className="my-7" />

        <Button
          variant="danger-soft"
          onPress={() => {
            removeStar(star.id);
            router.back();
          }}
        >
          Delete memory
        </Button>
      </ScrollView>
    </View>
  );
}

function StatCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View className="w-1/2 py-2.5 pr-2">
      <View className="flex-row items-center gap-1.5">
        {icon}
        <Text className="text-muted text-[11px]">{label}</Text>
      </View>
      <Text className="text-starlight font-display mt-0.5 text-base font-semibold">{value}</Text>
    </View>
  );
}
