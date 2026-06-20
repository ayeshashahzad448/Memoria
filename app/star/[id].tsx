import { Image, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Separator, Text } from 'heroui-native';
import { format } from 'date-fns';
import { CalendarDays, MapPin, Mic, Pencil, Users } from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { VoiceNotePlayer } from '@/components/VoiceNotePlayer';
import { useMemoria } from '@/lib/store';
import { colorFor, userById } from '@/lib/memoria';

const ACCENT = colorFor('cyan').hex;
const MUTED = '#94A3B8';

export default function StarDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const star = useMemoria((s) => s.stars.find((x) => x.id === id));
  const removeStar = useMemoria((s) => s.removeStar);

  if (!star) {
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

        {star.photos.length > 0 && (
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
          </ScrollView>
        )}

        {star.story.trim().length > 0 && (
          <GlassCard className="mt-5" contentClassName="p-5">
            <Text className="text-starlight/90 font-serif text-base leading-7">{star.story}</Text>
          </GlassCard>
        )}

        {star.voiceNotes.length > 0 && (
          <View className="mt-5 gap-2">
            <View className="flex-row items-center gap-2">
              <Mic size={15} color={MUTED} />
              <Text className="text-muted text-sm">Voice notes</Text>
            </View>
            {star.voiceNotes.map((n, i) => (
              <VoiceNotePlayer key={n.id} note={n} index={i} />
            ))}
          </View>
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
