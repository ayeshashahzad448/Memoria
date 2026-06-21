import { useMemo } from 'react';
import { Image, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from 'heroui-native';
import Animated, { SlideInRight, SlideOutRight } from 'react-native-reanimated';
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
  X,
} from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { VoiceNotePlayer } from '@/components/VoiceNotePlayer';
import { colorFor, starStatsForStar, userById } from '@/lib/memoria';
import type { MemoryStar } from '@/lib/types';

const ACCENT = colorFor('cyan').hex;
const MUTED = '#94A3B8';

/**
 * Floating memory card that slides in from the right while the star stays
 * zoomed-in on the left of the cosmos. Replaces the full-screen detail route
 * for in-cosmos viewing.
 */
export function MemoryDetailPanel({ star, onClose }: { star: MemoryStar; onClose: () => void }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  // Take the right portion of the screen, but always leave room on the left so
  // the zoomed-in star stays visible. Cap so it never eats more than ~62% of
  // the screen on phones, and clamp to a comfortable width on tablets/web.
  const panelWidth = Math.min(Math.max(width * 0.54, 250), Math.min(width * 0.62, 420));

  const stats = useMemo(() => starStatsForStar(star), [star]);
  const color = colorFor(star.colorKey);
  const tagged = star.taggedUserIds.map((id) => userById(id)).filter(Boolean);

  return (
    <Animated.View
      entering={SlideInRight.duration(380)}
      exiting={SlideOutRight.duration(280)}
      className="pt-safe-offset-4 pb-safe-offset-28 absolute inset-y-0 right-0 px-3"
      style={{ width: panelWidth, zIndex: 50, elevation: 50 }}
    >
      <GlassCard className="flex-1" intensity={50} contentClassName="flex-1 p-0">
        <View className="border-glass-border flex-row items-center justify-between border-b px-4 py-3.5">
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
            <Text className="text-muted text-[11px] tracking-widest uppercase" numberOfLines={1}>
              {color.emotion}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => router.push({ pathname: '/star/edit', params: { id: star.id } })}
              hitSlop={10}
            >
              <Pencil size={16} color={ACCENT} />
            </Pressable>
            <Pressable onPress={onClose} hitSlop={10}>
              <View className="border-glass-border h-7 w-7 items-center justify-center rounded-full border">
                <X size={15} color={MUTED} />
              </View>
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerClassName="px-4 py-4" showsVerticalScrollIndicator={false}>
          <Text className="text-starlight font-display text-2xl leading-7 font-bold">
            {star.title}
          </Text>

          <View className="mt-3 gap-1.5">
            <View className="flex-row items-center gap-1.5">
              <CalendarDays size={13} color={MUTED} />
              <Text className="text-muted text-xs">{format(new Date(star.date), 'PPP')}</Text>
            </View>
            {star.location ? (
              <View className="flex-row items-center gap-1.5">
                <MapPin size={13} color={MUTED} />
                <Text className="text-muted text-xs" numberOfLines={1}>
                  {star.location.name}
                </Text>
              </View>
            ) : null}
          </View>

          {tagged.length > 0 && (
            <View className="mt-3 flex-row flex-wrap items-center gap-2">
              <Users size={13} color={MUTED} />
              {tagged.map((u) => (
                <View key={u!.id} className="border-glass-border rounded-full border px-2.5 py-1">
                  <Text className="text-starlight text-[11px]">{u!.name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Stellar profile */}
          <View className="border-glass-border bg-background/40 mt-4 rounded-2xl border p-3.5">
            <Text className="text-muted text-[10px] tracking-[2px] uppercase">Stellar profile</Text>
            <Text
              className="font-display text-base font-semibold"
              style={{ color: color.hex }}
              numberOfLines={1}
            >
              {stats.spectralName}
            </Text>
            <View className="mt-2 flex-row flex-wrap">
              <StatCell
                icon={<Flame size={13} color="#FF8A5C" />}
                label="Temp"
                value={`${stats.temperatureK.toLocaleString()} K`}
              />
              <StatCell
                icon={<Weight size={13} color={color.hex} />}
                label="Mass"
                value={`${stats.massSolar.toFixed(2)} M\u2609`}
              />
              <StatCell
                icon={<Sun size={13} color="#FFC75F" />}
                label="Luminosity"
                value={`${stats.luminositySolar.toFixed(1)} L\u2609`}
              />
              <StatCell
                icon={<Sparkles size={13} color={color.hex} />}
                label="Class"
                value={stats.spectralClass}
              />
            </View>
          </View>

          {star.photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
              <View className="flex-row gap-2.5">
                {star.photos.map((uri) => (
                  <Image
                    key={uri}
                    source={{ uri }}
                    style={{ width: 150, height: 150, borderRadius: 16 }}
                  />
                ))}
              </View>
            </ScrollView>
          )}

          {star.story.trim().length > 0 && (
            <View className="border-glass-border bg-background/30 mt-4 rounded-2xl border p-4">
              <Text className="text-starlight/90 font-serif text-[15px] leading-6">
                {star.story}
              </Text>
            </View>
          )}

          {star.voiceNotes.length > 0 && (
            <View className="mt-4 gap-2">
              <View className="flex-row items-center gap-2">
                <Mic size={14} color={MUTED} />
                <Text className="text-muted text-xs">Voice notes</Text>
              </View>
              {star.voiceNotes.map((n, i) => (
                <VoiceNotePlayer key={n.id} note={n} index={i} />
              ))}
            </View>
          )}
        </ScrollView>
      </GlassCard>
    </Animated.View>
  );
}

function StatCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View className="w-1/2 py-1.5 pr-2">
      <View className="flex-row items-center gap-1.5">
        {icon}
        <Text className="text-muted text-[10px]">{label}</Text>
      </View>
      <Text className="text-starlight font-display mt-0.5 text-sm font-semibold">{value}</Text>
    </View>
  );
}
