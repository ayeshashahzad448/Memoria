import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Input, Label, Text, TextField } from 'heroui-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { GlassCard } from '@/components/GlassCard';
import { StarPreview } from '@/components/StarPreview';
import {
  ColorGrid,
  PhotoPicker,
  VoiceRecorder,
  TagPicker,
  LocationPicker,
} from '@/app/star/create';
import { useMemoria } from '@/lib/store';
import { radiusForText } from '@/lib/memoria';
import type { StarColorKey, StarLocation, VoiceNote } from '@/lib/types';
import { FREE_LIMIT_BYTES, totalMediaBytes } from '@/lib/storage';

const MAX_PHOTOS = 3;

export default function EditStar() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const star = useMemoria((s) => s.stars.find((x) => x.id === id));
  const updateStar = useMemoria((s) => s.updateStar);
  const allStars = useMemoria((s) => s.stars);
  const tier = useMemoria((s) => s.tier);

  const [title, setTitle] = useState(star?.title ?? '');
  const [story, setStory] = useState(star?.story ?? '');
  const [colorKey, setColorKey] = useState<StarColorKey>(star?.colorKey ?? 'cyan');
  const [photos, setPhotos] = useState<string[]>(star?.photos ?? []);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>(star?.voiceNotes ?? []);
  const [taggedIds, setTaggedIds] = useState<string[]>(star?.taggedUserIds ?? []);
  const [location, setLocation] = useState<StarLocation | undefined>(star?.location);

  // Storage used by other stars (exclude this one so edits compare fairly).
  const usedBytes = useMemo(
    () => totalMediaBytes(allStars.filter((s) => s.id !== id)),
    [allStars, id],
  );
  const atLimit = tier === 'free' && usedBytes >= FREE_LIMIT_BYTES;

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

  const canSave = title.trim().length > 0 || story.trim().length > 0;
  const openPaywall = () => router.push('/paywall');

  const save = () => {
    if (!canSave) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateStar(star.id, {
      title: title.trim() || 'Untitled memory',
      story,
      colorKey,
      photos,
      voiceNotes,
      taggedUserIds: taggedIds,
      location,
    });
    router.back();
  };

  const pickPhotos = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    if (atLimit) {
      openPaywall();
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
    }
  };

  return (
    <View className="bg-void flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="px-5 pt-6 pb-40" keyboardShouldPersistTaps="handled">
          <View className="mb-5 flex-row items-center justify-between">
            <Text className="text-starlight text-2xl font-bold">Edit memory</Text>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text className="text-muted text-base">Close</Text>
            </Pressable>
          </View>

          <GlassCard className="mb-6" contentClassName="items-center py-7">
            <StarPreview story={story} title={title} colorKey={colorKey} />
            <Text className="text-muted mt-2 text-xs">
              {radiusForText(story.length > 0 ? story : title) > 18
                ? 'This is a core memory'
                : 'Your star'}
            </Text>
          </GlassCard>

          <View className="gap-5">
            <TextField>
              <Label>Title</Label>
              <Input placeholder="A name for this memory" value={title} onChangeText={setTitle} />
            </TextField>

            <View className="gap-2">
              <Label>Your story</Label>
              <TextField>
                <Input
                  placeholder="Tell it the way you want to remember it…"
                  value={story}
                  onChangeText={setStory}
                  multiline
                  numberOfLines={6}
                  className="min-h-32"
                  style={{ textAlignVertical: 'top' }}
                />
              </TextField>
            </View>

            <ColorGrid value={colorKey} onChange={setColorKey} />

            <PhotoPicker
              photos={photos}
              atLimit={atLimit}
              onAdd={pickPhotos}
              onRemove={(uri) => setPhotos((p) => p.filter((x) => x !== uri))}
            />

            <VoiceRecorder
              notes={voiceNotes}
              atLimit={atLimit}
              onUpgrade={openPaywall}
              onChange={setVoiceNotes}
            />

            <TagPicker selected={taggedIds} onChange={setTaggedIds} />

            <LocationPicker location={location} onChange={setLocation} />
          </View>
        </ScrollView>

        <View className="border-glass-border bg-void/90 pb-safe-offset-4 absolute inset-x-0 bottom-0 border-t px-5 pt-4">
          <Button isDisabled={!canSave} onPress={save}>
            Save changes
          </Button>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
