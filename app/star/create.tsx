import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Chip, Input, Label, Text, TextField } from 'heroui-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from '@/lib/haptics';
import { goBack } from '@/lib/navigation';
import { format } from 'date-fns';
import {
  CalendarDays,
  Camera,
  MapPin,
  Mic,
  Plus,
  Square,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { DemoTourOverlay } from '@/components/DemoTourOverlay';
import { StarPreview } from '@/components/StarPreview';
import { WheelDatePicker } from '@/components/WheelDatePicker';
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
import { persistAll, persistMedia } from '@/lib/media';
import { VoiceNotePlayer } from '@/components/VoiceNotePlayer';

const MAX_PHOTOS = 2;
const MAX_VOICE = 2;
const ACCENT = colorFor('cyan').hex;
const MUTED = '#8B93B8';
/** Placeholder text on the dark writing surface; ~5:1 contrast. */
const PLACEHOLDER = '#7C8AA0';
/** The browser's default focus outline looks out of place on the borderless writing fields. */
const NO_OUTLINE = (
  Platform.OS === 'web' ? { outlineStyle: 'none', resize: 'none' } : {}
) as object;

type DetailPanel = 'date' | 'place' | 'photos' | 'voice' | 'people';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

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
  const [date, setDate] = useState(() => new Date());
  const [photos, setPhotos] = useState<string[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [taggedIds, setTaggedIds] = useState<string[]>([]);
  const [location, setLocation] = useState<StarLocation | undefined>();

  // When the guided demo tour is driving the app, it pushes title/story/etc.
  // into the store's transient demoCompose channel so the live star preview can
  // grow on screen as if the user were typing. Mirror it into local state.
  const demoCompose = useMemoria((s) => s.demoCompose);
  useEffect(() => {
    if (!demoCompose) return;
    setTitle(demoCompose.title);
    setStory(demoCompose.story);
    setColorKey(demoCompose.colorKey);
    setDate(new Date(demoCompose.date));
    setPhotos(demoCompose.photos);
    setVoiceNotes(demoCompose.voiceNotes);
    setTaggedIds(demoCompose.taggedIds);
    setLocation(demoCompose.location);
  }, [demoCompose]);

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
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const star = addStar({
      title,
      story,
      colorKey,
      date: date.toISOString(),
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
      const saved = await persistAll(
        result.assets.map((a) => a.uri),
        'photos',
      );
      setPhotos((prev) => [...prev, ...saved].slice(0, MAX_PHOTOS));
    }
    // openPaywall is stable for this screen instance (defined inline, router is stable).
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.length, atLimit]);

  const tint = colorFor(colorKey).hex;
  const [openPanel, setOpenPanel] = useState<DetailPanel | null>(null);
  const togglePanel = (panel: DetailPanel) =>
    setOpenPanel((current) => (current === panel ? null : panel));
  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <View className="bg-void flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="px-5 pt-safe-offset-6 pb-40"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-5 flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-starlight font-heading text-3xl">New memory</Text>
              <Text className="text-muted mt-0.5 text-sm">Every memory becomes a star.</Text>
            </View>
            <Pressable
              onPress={() => goBack(router)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
            >
              <X size={18} color={MUTED} strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Live star: tinted by the chosen emotion */}
          <View
            className="border-glass-border mb-5 items-center overflow-hidden rounded-3xl border py-6"
            style={{ backgroundColor: `${tint}0F` }}
          >
            <StarPreview story={story} title={title} colorKey={colorKey} />
            <Text className="text-muted mt-1 text-xs">
              {!hasContent
                ? 'Start writing to bring your star to life'
                : radiusForText(story.length > 0 ? story : title) > 18
                  ? 'This is becoming a core memory'
                  : 'Your star is taking shape'}
            </Text>
            {hasContent && (
              <View className="mt-4 flex-row gap-2">
                <PreviewStat label="Temp" value={`${liveStats.temperatureK.toLocaleString()} K`} />
                <PreviewStat label="Mass" value={`${liveStats.massSolar.toFixed(1)} M\u2609`} />
                <PreviewStat label="Class" value={liveStats.spectralClass} />
              </View>
            )}
          </View>

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

          {/* Writing surface */}
          <View
            className="border-glass-border mb-5 rounded-3xl border p-5"
            style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
          >
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Give it a name"
              placeholderTextColor={PLACEHOLDER}
              accessibilityLabel="Title"
              className="text-starlight font-display text-xl font-semibold"
              style={NO_OUTLINE}
            />
            <View className="bg-glass-border my-4 h-px" />
            <TextInput
              value={story}
              onChangeText={setStory}
              placeholder="Tell it the way you want to remember it…"
              placeholderTextColor={PLACEHOLDER}
              accessibilityLabel="Your story"
              multiline
              className="text-starlight min-h-40 font-serif text-base leading-7"
              style={[NO_OUTLINE, { textAlignVertical: 'top' }]}
            />
            <Text className="text-muted mt-2 self-end text-xs">
              {story.trim().length} characters
            </Text>
          </View>

          <View className="mb-6">
            <ColorGrid value={colorKey} onChange={setColorKey} />
          </View>

          {/* Optional details: tiles open one editor at a time */}
          <Text className="text-muted mb-3 text-xs font-semibold tracking-widest uppercase">
            Add details
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <DetailTile
              icon={CalendarDays}
              label="Date"
              value={isToday ? 'Today' : format(date, 'MMM d, yyyy')}
              filled={!isToday}
              active={openPanel === 'date'}
              onPress={() => togglePanel('date')}
            />
            <DetailTile
              icon={MapPin}
              label="Place"
              value={location?.name ?? 'Add a place'}
              filled={!!location}
              active={openPanel === 'place'}
              onPress={() => togglePanel('place')}
            />
            <DetailTile
              icon={Camera}
              label="Photos"
              value={photos.length ? plural(photos.length, 'photo') : 'Add photos'}
              filled={photos.length > 0}
              active={openPanel === 'photos'}
              onPress={() => togglePanel('photos')}
            />
            <DetailTile
              icon={Mic}
              label="Voice"
              value={voiceNotes.length ? plural(voiceNotes.length, 'note') : 'Record a note'}
              filled={voiceNotes.length > 0}
              active={openPanel === 'voice'}
              onPress={() => togglePanel('voice')}
            />
            <DetailTile
              icon={UsersRound}
              label="People"
              value={taggedIds.length ? `${taggedIds.length} tagged` : 'Tag people'}
              filled={taggedIds.length > 0}
              active={openPanel === 'people'}
              onPress={() => togglePanel('people')}
            />
          </View>

          {/* Every editor stays mounted (so a recording or search isn't lost); only one shows. */}
          <View
            className="border-glass-border mt-3 rounded-3xl border p-4"
            style={[
              { backgroundColor: 'rgba(255,255,255,0.03)' },
              openPanel ? null : { display: 'none' },
            ]}
          >
            <View style={openPanel === 'date' ? undefined : { display: 'none' }}>
              <WheelDatePicker value={date} onChange={setDate} minYear={1940} />
            </View>
            <View style={openPanel === 'place' ? undefined : { display: 'none' }}>
              <LocationPicker location={location} onChange={setLocation} />
            </View>
            <View style={openPanel === 'photos' ? undefined : { display: 'none' }}>
              <PhotoPicker
                photos={photos}
                atLimit={atLimit}
                onAdd={pickPhotos}
                onRemove={(uri) => setPhotos((p) => p.filter((x) => x !== uri))}
              />
            </View>
            <View style={openPanel === 'voice' ? undefined : { display: 'none' }}>
              <VoiceRecorder
                notes={voiceNotes}
                atLimit={atLimit}
                onUpgrade={openPaywall}
                onChange={setVoiceNotes}
              />
            </View>
            <View style={openPanel === 'people' ? undefined : { display: 'none' }}>
              <TagPicker selected={taggedIds} onChange={setTaggedIds} />
            </View>
          </View>
        </ScrollView>

        <View className="border-glass-border bg-void/90 pb-safe-offset-4 absolute inset-x-0 bottom-0 border-t px-5 pt-4">
          <Button isDisabled={!canSave} onPress={save}>
            Save memory
          </Button>
        </View>
      </KeyboardAvoidingView>
      <DemoTourOverlay embedded />
    </View>
  );
}

/* ------------------------------ Color grid -------------------------------- */

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <View
      className="items-center rounded-2xl px-4 py-2"
      style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
    >
      <Text className="text-starlight font-display text-sm font-semibold">{value}</Text>
      <Text className="text-muted mt-0.5 text-[10px] tracking-wider uppercase">{label}</Text>
    </View>
  );
}

function DetailTile({
  icon: Icon,
  label,
  value,
  filled,
  active,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  /** Something has been added for this detail. */
  filled: boolean;
  /** Its editor is currently open. */
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityState={{ expanded: active }}
      className="w-[48%] flex-row items-center gap-3 rounded-2xl border px-3.5 py-3"
      style={{
        borderColor: active ? ACCENT : 'rgba(255,255,255,0.1)',
        backgroundColor: active ? 'rgba(165,180,252,0.08)' : 'rgba(255,255,255,0.03)',
      }}
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: filled ? 'rgba(165,180,252,0.16)' : 'rgba(255,255,255,0.06)' }}
      >
        <Icon size={17} color={filled || active ? ACCENT : MUTED} />
      </View>
      <View className="flex-1">
        <Text className="text-muted text-[11px]">{label}</Text>
        <Text className="text-starlight text-sm font-medium" numberOfLines={1}>
          {value}
        </Text>
      </View>
    </Pressable>
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
    <View>
      <Text className="text-muted mb-3 text-xs font-semibold tracking-widest uppercase">
        How did it feel?
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {STAR_COLORS.map((c) => {
          const selected = c.key === value;
          return (
            <Pressable
              key={c.key}
              onPress={() => onChange(c.key)}
              accessibilityRole="radio"
              accessibilityLabel={c.emotion}
              accessibilityState={{ selected }}
              className="flex-row items-center gap-2 rounded-full border px-3.5 py-2"
              style={{
                borderColor: selected ? c.hex : 'rgba(255,255,255,0.1)',
                backgroundColor: selected ? `${c.hex}26` : 'rgba(255,255,255,0.03)',
              }}
            >
              <View
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor: c.hex,
                  shadowColor: c.hex,
                  shadowOpacity: selected ? 0.9 : 0.4,
                  shadowRadius: selected ? 8 : 4,
                  shadowOffset: { width: 0, height: 0 },
                }}
              />
              <Text className="text-sm font-medium" style={{ color: selected ? '#F4F1EA' : MUTED }}>
                {c.emotion}
              </Text>
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
        const uri = await persistMedia(result.uri, 'audio');
        onChange([...notes, { id: `vn-${Date.now()}`, uri, durationSec: result.durationSec }]);
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
          <VoiceNotePlayer key={n.id} note={n} index={i} onRemove={() => remove(n.id)} />
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
  const taggable = useMemo(
    () => DIRECTORY_USERS.filter((u) => u.id !== CURRENT_USER.id).slice(0, 5),
    [],
  );
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
      <Label>Tag people</Label>
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
