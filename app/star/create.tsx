import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Chip, Input, Label, Text, TextField } from 'heroui-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Camera, MapPin, Mic, Plus, Square, X } from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { StarPreview } from '@/components/StarPreview';
import { useMemoria, PERSONAL_COSMOS } from '@/lib/store';
import {
  STAR_COLORS,
  DEFAULT_STAR_COLOR,
  radiusForText,
  DIRECTORY_USERS,
  CURRENT_USER,
  colorFor,
  starStats,
} from '@/lib/memoria';
import { searchPlaces, resolvePlace, placesEnabled, type PlacePrediction } from '@/lib/places';
import type { StarColorKey, StarLocation, VoiceNote } from '@/lib/types';
import { useVoiceRecorder } from '@/lib/useVoiceRecorder';
import { FREE_LIMIT_BYTES, totalMediaBytes } from '@/lib/storage';

const MAX_PHOTOS = 2;
const MAX_VOICE = 2;
const ACCENT = colorFor('cyan').hex;
const MUTED = '#94A3B8';

export default function CreateStar() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const addStar = useMemoria((s) => s.addStar);
  const activeCosmosId = useMemoria((s) => s.activeCosmosId);
  const allStars = useMemoria((s) => s.stars);
  const tier = useMemoria((s) => s.tier);
  const cosmosId =
    (Array.isArray(params.cosmosId) ? params.cosmosId[0] : params.cosmosId) ??
    activeCosmosId ??
    PERSONAL_COSMOS;

  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [colorKey, setColorKey] = useState<StarColorKey>(DEFAULT_STAR_COLOR);
  const [date] = useState(() => new Date().toISOString());
  const [photos, setPhotos] = useState<string[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [taggedIds, setTaggedIds] = useState<string[]>([]);
  const [location, setLocation] = useState<StarLocation | undefined>();

  const usedBytes = useMemo(() => totalMediaBytes(allStars), [allStars]);
  const atLimit = tier === 'free' && usedBytes >= FREE_LIMIT_BYTES;

  const liveStats = useMemo(
    () => starStats({ story, title, photos, voiceNotes, taggedUserIds: taggedIds }),
    [story, title, photos, voiceNotes, taggedIds],
  );
  const hasContent = (story.length > 0 ? story : title).trim().length > 0;

  const canSave = title.trim().length > 0 || story.trim().length > 0;

  const openPaywall = () => router.push('/paywall');

  const save = () => {
    if (!canSave) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const star = addStar({
      title,
      story,
      colorKey,
      date,
      location,
      photos,
      voiceNotes,
      taggedUserIds: taggedIds,
      cosmosId,
    });
    router.replace({ pathname: '/star/ignite', params: { id: star.id } });
  };

  const pickPhotos = useCallback(async () => {
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
    // openPaywall is stable for this screen instance (defined inline, router is stable).
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.length, atLimit]);

  return (
    <View className="bg-void flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="px-5 pt-6 pb-40" keyboardShouldPersistTaps="handled">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-starlight text-2xl font-bold">New memory</Text>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text className="text-muted text-base">Close</Text>
            </Pressable>
          </View>
          <Text className="text-muted mb-5 text-sm leading-5">
            Write your memory and watch it come to life. The more you write, the brighter your star
            shines.
          </Text>

          {/* Live star preview */}
          <GlassCard className="mb-6" contentClassName="items-center py-7">
            <StarPreview story={story} title={title} colorKey={colorKey} />
            <Text className="text-muted mt-2 text-xs">
              {!hasContent
                ? 'Start typing to bring your star to life'
                : radiusForText(story.length > 0 ? story : title) > 18
                  ? 'This is becoming a core memory'
                  : 'Your star is taking shape'}
            </Text>
            {hasContent && (
              <View className="border-glass-border mt-4 w-full flex-row justify-around border-t pt-4">
                <PreviewStat label="Temp" value={`${liveStats.temperatureK.toLocaleString()} K`} />
                <PreviewStat label="Mass" value={`${liveStats.massSolar.toFixed(1)} M\u2609`} />
                <PreviewStat label="Class" value={liveStats.spectralClass} />
              </View>
            )}
          </GlassCard>

          {atLimit && (
            <Pressable onPress={openPaywall}>
              <GlassCard className="mb-5" contentClassName="gap-1.5 p-4">
                <Text className="text-danger text-sm font-semibold">Your storage is full</Text>
                <Text className="text-muted text-xs leading-5">
                  You can still save this memory, but adding photos or voice notes needs more space.
                  Tap to upgrade.
                </Text>
              </GlassCard>
            </Pressable>
          )}

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
              <Text className="text-muted text-right text-xs">
                {story.trim().length} characters
              </Text>
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
            Save memory
          </Button>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ------------------------------ Color grid -------------------------------- */

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="items-center">
      <Text className="text-starlight font-display text-sm font-semibold">{value}</Text>
      <Text className="text-muted mt-0.5 text-[10px] tracking-wider uppercase">{label}</Text>
    </View>
  );
}

export function ColorGrid({
  value,
  onChange,
}: {
  value: StarColorKey;
  onChange: (k: StarColorKey) => void;
}) {
  return (
    <View className="gap-2">
      <Label>Glow color</Label>
      <View className="flex-row flex-wrap gap-3">
        {STAR_COLORS.map((c) => {
          const selected = c.key === value;
          return (
            <Pressable
              key={c.key}
              onPress={() => onChange(c.key)}
              className="items-center"
              hitSlop={6}
            >
              <View
                className="h-11 w-11 items-center justify-center rounded-full"
                style={{
                  backgroundColor: c.hex,
                  borderWidth: selected ? 2.5 : 0,
                  borderColor: '#FFFFFF',
                  shadowColor: c.hex,
                  shadowOpacity: selected ? 0.9 : 0.4,
                  shadowRadius: selected ? 12 : 6,
                  shadowOffset: { width: 0, height: 0 },
                }}
              />
              <Text className="text-muted mt-1 text-[10px]">{c.emotion}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ------------------------------ Photos ------------------------------------ */

export function PhotoPicker({
  photos,
  atLimit,
  onAdd,
  onRemove,
}: {
  photos: string[];
  atLimit: boolean;
  onAdd: () => void;
  onRemove: (uri: string) => void;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <Camera size={15} color={MUTED} />
        <Label>{`Photos (${photos.length}/${MAX_PHOTOS})`}</Label>
      </View>
      <View className="flex-row flex-wrap gap-3">
        {photos.map((uri) => (
          <View key={uri} className="overflow-hidden rounded-2xl">
            <Image source={{ uri }} style={{ width: 84, height: 84 }} />
            <Pressable
              onPress={() => onRemove(uri)}
              className="bg-void/80 absolute top-1 right-1 h-6 w-6 items-center justify-center rounded-full"
            >
              <X size={12} color="#E9ECFF" />
            </Pressable>
          </View>
        ))}
        {photos.length < MAX_PHOTOS && (
          <Pressable
            onPress={onAdd}
            className="border-glass-border h-[84px] w-[84px] items-center justify-center rounded-2xl border border-dashed"
          >
            <Plus size={24} color={atLimit ? '#FF6B6B' : MUTED} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

/* ------------------------------ Voice notes ------------------------------- */

export function VoiceRecorder({
  notes,
  atLimit,
  onUpgrade,
  onChange,
}: {
  notes: VoiceNote[];
  atLimit: boolean;
  onUpgrade: () => void;
  onChange: (n: VoiceNote[]) => void;
}) {
  const { isRecording, isSupported, permission, start, stop } = useVoiceRecorder();

  const toggle = async () => {
    if (atLimit && !isRecording) {
      onUpgrade();
      return;
    }
    if (isRecording) {
      const result = await stop();
      if (result) {
        onChange([
          ...notes,
          { id: `vn-${Date.now()}`, uri: result.uri, durationSec: result.durationSec },
        ]);
      }
    } else {
      await start();
    }
  };

  const remove = (id: string) => onChange(notes.filter((n) => n.id !== id));

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <Mic size={15} color={MUTED} />
        <Label>{`Voice notes (${notes.length}/${MAX_VOICE})`}</Label>
      </View>
      {!isSupported && (
        <Text className="text-muted text-xs">Voice recording is not available on this device.</Text>
      )}
      {isSupported && permission === 'denied' && (
        <Text className="text-warning text-xs">
          Microphone access is blocked. Enable it in your device or browser settings, then try
          again.
        </Text>
      )}
      <View className="gap-2">
        {notes.map((n, i) => (
          <View
            key={n.id}
            className="border-glass-border flex-row items-center justify-between rounded-2xl border px-4 py-3"
          >
            <View className="flex-row items-center gap-2">
              <Mic size={14} color={ACCENT} />
              <Text className="text-starlight">
                Note {i + 1} · {Math.round(n.durationSec)}s
              </Text>
            </View>
            <Pressable onPress={() => remove(n.id)} hitSlop={8}>
              <Text className="text-muted">Remove</Text>
            </Pressable>
          </View>
        ))}
        {notes.length < MAX_VOICE && isSupported && (
          <Pressable
            onPress={toggle}
            className="border-glass-border flex-row items-center justify-center gap-2 rounded-2xl border py-3.5"
            style={isRecording ? { borderColor: '#FF6B6B' } : undefined}
          >
            {isRecording ? <Square size={16} color="#FF6B6B" /> : <Mic size={16} color={ACCENT} />}
            <Text className="text-starlight">
              {isRecording ? 'Stop recording' : 'Record a voice note'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/* ------------------------------ Tagging ----------------------------------- */

export function TagPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const taggable = useMemo(() => DIRECTORY_USERS.filter((u) => u.id !== CURRENT_USER.id), []);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return taggable;
    return taggable.filter(
      (u) => u.name.toLowerCase().includes(q) || u.handle.toLowerCase().includes(q),
    );
  }, [query, taggable]);

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <View className="gap-2">
      <Label>Tag who shared this</Label>
      <TextField>
        <Input
          placeholder="Search people"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
      </TextField>
      <View className="flex-row flex-wrap gap-2 pt-1">
        {results.map((u) => {
          const isSel = selected.includes(u.id);
          return (
            <Chip
              key={u.id}
              variant={isSel ? 'primary' : 'secondary'}
              color={isSel ? 'accent' : 'default'}
              onPress={() => toggle(u.id)}
            >
              {u.name}
            </Chip>
          );
        })}
      </View>
      {selected.length > 0 && (
        <Text className="text-muted text-xs">
          {selected.length} {selected.length > 1 ? 'people' : 'person'} will see this memory in
          their cosmos.
        </Text>
      )}
    </View>
  );
}

/* ------------------------------ Location ---------------------------------- */

export function LocationPicker({
  location,
  onChange,
}: {
  location?: StarLocation;
  onChange: (l: StarLocation | undefined) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!placesEnabled) return;
    if (debounce.current) clearTimeout(debounce.current);
    if (query.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    debounce.current = setTimeout(() => {
      setLoading(true);
      void searchPlaces(query).then((r) => {
        setResults(r.predictions);
        setError(r.error ?? null);
        setLoading(false);
      });
    }, 320);
  }, [query]);

  const choose = async (p: PlacePrediction) => {
    const resolved = await resolvePlace(p);
    onChange(resolved);
    setQuery('');
    setResults([]);
    setError(null);
  };

  const useManual = () => {
    if (query.trim().length === 0) return;
    onChange({ name: query.trim() });
    setQuery('');
    setResults([]);
  };

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <MapPin size={15} color={MUTED} />
        <Label>Location</Label>
      </View>
      {location ? (
        <View className="border-glass-border flex-row items-center justify-between rounded-2xl border px-4 py-3">
          <View className="flex-1 flex-row items-center gap-2">
            <MapPin size={14} color={ACCENT} />
            <Text className="text-starlight flex-1">{location.name}</Text>
          </View>
          <Pressable onPress={() => onChange(undefined)} hitSlop={8}>
            <Text className="text-muted">Clear</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <TextField>
                <Input
                  placeholder={
                    placesEnabled ? 'Search a place, or type your own' : 'Type a place name'
                  }
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="words"
                />
              </TextField>
            </View>
            {loading && <ActivityIndicator color={ACCENT} />}
          </View>
          {query.trim().length > 0 && (
            <Pressable onPress={useManual} hitSlop={6}>
              <Text className="text-accent text-sm">{`Use "${query.trim()}" as a custom place`}</Text>
            </Pressable>
          )}
          {results.map((p) => (
            <Pressable
              key={p.placeId}
              onPress={() => choose(p)}
              className="border-glass-border rounded-2xl border px-4 py-3"
            >
              <Text className="text-starlight">{p.primary}</Text>
              {p.secondary ? <Text className="text-muted text-xs">{p.secondary}</Text> : null}
            </Pressable>
          ))}
          {error && !loading ? (
            <Text className="text-warning text-xs">{`${error} You can still type a place above.`}</Text>
          ) : null}
        </>
      )}
    </View>
  );
}
