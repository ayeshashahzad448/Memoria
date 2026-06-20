import { Image, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Separator, Text } from 'heroui-native';
import { format } from 'date-fns';

import { GlassCard } from '@/components/GlassCard';
import { VoiceNotePlayer } from '@/components/VoiceNotePlayer';
import { useMemoria } from '@/lib/store';
import { colorFor, userById } from '@/lib/memoria';

export default function StarDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const star = useMemoria((s) => s.stars.find((x) => x.id === id));
  const removeStar = useMemoria((s) => s.removeStar);

  if (!star) {
    return (
      <View className="bg-void flex-1 items-center justify-center px-6">
        <Text className="text-muted">This star has faded.</Text>
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
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text className="text-muted">Close</Text>
          </Pressable>
        </View>

        <Text className="text-starlight text-3xl font-bold">{star.title}</Text>

        <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-1">
          <Text className="text-muted text-sm">🗓️ {format(new Date(star.date), 'PPP')}</Text>
          {star.location ? (
            <Text className="text-muted text-sm">📍 {star.location.name}</Text>
          ) : null}
        </View>

        {tagged.length > 0 && (
          <View className="mt-3 flex-row flex-wrap gap-2">
            {tagged.map((u) => (
              <View key={u!.id} className="border-glass-border rounded-full border px-3 py-1">
                <Text className="text-starlight text-xs">
                  🤝 {u!.avatar} {u!.name}
                </Text>
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
            <Text className="text-starlight/90 text-base leading-6">{star.story}</Text>
          </GlassCard>
        )}

        {star.voiceNotes.length > 0 && (
          <View className="mt-5 gap-2">
            <Text className="text-muted text-sm">🎙️ Voice notes</Text>
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
          Let this star fade
        </Button>
      </ScrollView>
    </View>
  );
}
