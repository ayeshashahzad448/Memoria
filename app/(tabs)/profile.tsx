import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input, Label, Separator, Text, TextArea, TextField } from 'heroui-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  Check,
  ChevronRight,
  Cloud,
  LogOut,
  Pencil,
  Settings,
  Sparkles,
  Users,
  X,
} from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { StorageBar, storageLabel } from '@/components/StorageBar';
import { useMemoria } from '@/lib/store';
import { CURRENT_USER, STAR_COLORS, colorFor } from '@/lib/memoria';
import { FREE_LIMIT_BYTES, WARN_RATIO, totalMediaBytes } from '@/lib/storage';
import { persistMedia } from '@/lib/media';
import { providerLabel, syncProviderForPlatform } from '@/lib/cloudSync';
import type { StarColorKey } from '@/lib/types';

import { usePalette } from '@/lib/theme';
export default function ProfileTab() {
  const colors = usePalette();
  const router = useRouter();
  const stars = useMemoria((s) => s.stars);
  const tier = useMemoria((s) => s.tier);
  const profile = useMemoria((s) => s.profile);
  const friendCount = useMemoria((s) => s.friendIds.length);
  const signOut = useMemoria((s) => s.signOut);
  const setTier = useMemoria((s) => s.setTier);
  const updateProfile = useMemoria((s) => s.updateProfile);
  const loadDemoProfile = useMemoria((s) => s.loadDemoProfile);
  const setDemoTourActive = useMemoria((s) => s.setDemoTourActive);
  const syncEnabled = useMemoria((s) => s.sync.enabled);
  const syncName = providerLabel(syncProviderForPlatform());

  const isPremium = tier === 'premium';
  const used = useMemo(() => totalMediaBytes(stars), [stars]);
  const ratio = used / FREE_LIMIT_BYTES;
  const atLimit = !isPremium && used >= FREE_LIMIT_BYTES;
  const warning = !isPremium && ratio >= WARN_RATIO && !atLimit;

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [avatarColorKey, setAvatarColorKey] = useState<StarColorKey>(profile.avatarColorKey);
  const [avatarUri, setAvatarUri] = useState<string | undefined>(profile.avatarUri);

  const avatarHex = colorFor(profile.avatarColorKey).hex;
  const initial = (profile.displayName || CURRENT_USER.name).slice(0, 1).toUpperCase();

  const startEdit = () => {
    setName(profile.displayName);
    setBio(profile.bio);
    setAvatarColorKey(profile.avatarColorKey);
    setAvatarUri(profile.avatarUri);
    setEditing(true);
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(await persistMedia(result.assets[0].uri, 'avatars'));
    }
  };

  const saveEdit = () => {
    updateProfile({
      displayName: name.trim() || CURRENT_USER.name,
      bio: bio.trim(),
      avatarColorKey,
      avatarUri,
    });
    setEditing(false);
  };

  const onSignOut = () => {
    signOut();
    router.replace('/');
  };

  // Hidden demo entry: long-press the footer line to load a fully populated
  // profile (years of memories + constellations) for live demos.
  const onLoadDemo = () => {
    loadDemoProfile();
    router.replace('/(tabs)');
  };

  // Hidden demo entry: long-press the @handle to start the auto-playing guided
  // walkthrough (for recording a demo video). It runs from the blank first-run
  // perspective through to the populated cosmos on its own.
  const onStartTour = () => {
    setDemoTourActive(true);
  };

  return (
    <View className="bg-void flex-1">
      <ScrollView
        contentContainerClassName="px-5 pt-safe-offset-4 pb-32"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-starlight font-heading text-3xl">Profile</Text>

        {/* Identity */}
        {editing ? (
          <GlassCard className="mt-5" contentClassName="gap-4 p-5">
            <View className="items-center gap-3">
              <Pressable onPress={pickAvatar} hitSlop={6}>
                <View
                  className="h-20 w-20 items-center justify-center overflow-hidden rounded-full"
                  style={{ backgroundColor: avatarUri ? '#1F2833' : colorFor(avatarColorKey).hex }}
                >
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={{ width: 80, height: 80 }} />
                  ) : (
                    <Text className="text-void text-2xl font-bold">
                      {(name || CURRENT_USER.name).slice(0, 1).toUpperCase()}
                    </Text>
                  )}
                  <View
                    className="absolute right-0 bottom-0 h-7 w-7 items-center justify-center rounded-full border-2"
                    style={{ backgroundColor: colors.accent, borderColor: colors.bg }}
                  >
                    <Camera size={14} color={colors.onAccent} strokeWidth={2.4} />
                  </View>
                </View>
              </Pressable>
              {avatarUri ? (
                <Pressable
                  onPress={() => setAvatarUri(undefined)}
                  hitSlop={6}
                  className="flex-row items-center gap-1.5"
                >
                  <X size={13} color={colors.muted} />
                  <Text className="text-muted text-xs font-medium">Remove photo</Text>
                </Pressable>
              ) : (
                <Text className="text-muted text-xs">Tap to add a profile photo</Text>
              )}
            </View>

            {/* Color avatar fallback (used when no photo is set) */}
            {!avatarUri && (
              <View className="gap-2">
                <Label>Avatar color</Label>
                <View className="flex-row flex-wrap gap-2">
                  {STAR_COLORS.map((c) => (
                    <Pressable key={c.key} onPress={() => setAvatarColorKey(c.key)} hitSlop={4}>
                      <View
                        className="h-8 w-8 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: c.hex,
                          borderWidth: avatarColorKey === c.key ? 2 : 0,
                          borderColor: colors.text,
                        }}
                      >
                        {avatarColorKey === c.key && (
                          <Check size={14} color={colors.onAccent} strokeWidth={3} />
                        )}
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <TextField>
              <Label>Display name</Label>
              <Input placeholder="Your name" value={name} onChangeText={setName} />
            </TextField>

            <TextField>
              <Label>Bio</Label>
              <TextArea
                placeholder="A short line about you"
                value={bio}
                onChangeText={setBio}
                numberOfLines={3}
              />
            </TextField>

            <View className="flex-row gap-3">
              <Button variant="ghost" className="flex-1" onPress={() => setEditing(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onPress={saveEdit}>
                <Button.Label>Save</Button.Label>
              </Button>
            </View>
          </GlassCard>
        ) : (
          <GlassCard className="mt-5" contentClassName="gap-3 p-5">
            <View className="flex-row items-center gap-4">
              <View
                className="h-14 w-14 items-center justify-center overflow-hidden rounded-full"
                style={{ backgroundColor: profile.avatarUri ? '#1F2833' : avatarHex }}
              >
                {profile.avatarUri ? (
                  <Image source={{ uri: profile.avatarUri }} style={{ width: 56, height: 56 }} />
                ) : (
                  <Text className="text-void text-xl font-bold">{initial}</Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-starlight text-lg font-semibold">
                  {profile.displayName || CURRENT_USER.name}
                </Text>
                <Pressable onLongPress={onStartTour} delayLongPress={800} hitSlop={8}>
                  <Text className="text-muted text-xs">@{CURRENT_USER.handle}</Text>
                </Pressable>
              </View>
              <View
                className="rounded-full border px-3 py-1"
                style={{ borderColor: isPremium ? colors.accent : 'rgba(140,147,184,0.4)' }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: isPremium ? colors.accent : colors.muted }}
                >
                  {isPremium ? 'Premium' : 'Free'}
                </Text>
              </View>
            </View>
            {profile.bio.length > 0 && (
              <Text className="text-muted text-sm leading-5">{profile.bio}</Text>
            )}
            <Pressable onPress={startEdit} hitSlop={6} className="flex-row items-center gap-2">
              <Pencil size={14} color={colors.accent} />
              <Text className="text-accent text-sm font-medium">Edit profile</Text>
            </Pressable>
          </GlassCard>
        )}

        {/* Storage capacity */}
        <Text className="text-muted mt-7 mb-2.5 text-xs font-semibold tracking-widest uppercase">
          Storage
        </Text>
        <GlassCard contentClassName="gap-3.5 p-5">
          <View className="flex-row items-center gap-2">
            <Cloud size={18} color={colors.accent} />
            <Text className="text-starlight font-semibold">Storage capacity</Text>
          </View>

          <StorageBar used={used} unlimited={isPremium} />

          <Text className="text-muted text-xs">{storageLabel(used, isPremium)}</Text>

          {warning && (
            <Text className="text-warning text-xs leading-5">
              {"You're running low on space. Upgrade to keep adding photos and voice notes."}
            </Text>
          )}
          {atLimit && (
            <Text className="text-danger text-xs leading-5">
              Your storage is full. Upgrade to add new photos and voice notes.
            </Text>
          )}

          {/* Cloud sync is opt-in; this is the way in from here. */}
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel={`${syncName} sync, currently ${syncEnabled ? 'on' : 'off'}. Open settings`}
            className="border-glass-border flex-row items-center justify-between rounded-2xl border px-4 py-3"
          >
            <View className="flex-row items-center gap-2.5">
              <Cloud size={16} color={syncEnabled ? colors.accent : colors.muted} />
              <Text className="text-starlight text-sm font-medium">{`${syncName} sync`}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Text
                className="text-sm"
                style={{ color: syncEnabled ? colors.accent : colors.muted }}
              >
                {syncEnabled ? 'On' : 'Set up'}
              </Text>
              <ChevronRight size={16} color={colors.muted} />
            </View>
          </Pressable>

          {!isPremium && (
            <Button size="sm" onPress={() => router.push('/paywall')}>
              <Sparkles size={15} color={colors.onAccent} />
              <Button.Label>Upgrade to Premium</Button.Label>
            </Button>
          )}
        </GlassCard>

        {/* Friends */}
        <Text className="text-muted mt-7 mb-2.5 text-xs font-semibold tracking-widest uppercase">
          Friends
        </Text>
        <Pressable onPress={() => router.push('/friends')}>
          <GlassCard contentClassName="flex-row items-center gap-3 p-4">
            <View
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.accentA(0.1) }}
            >
              <Users size={18} color={colors.accent} />
            </View>
            <View className="flex-1">
              <Text className="text-starlight font-medium">Friends</Text>
              <Text className="text-muted text-xs">
                {friendCount === 1 ? '1 connection' : `${friendCount} connections`} · search, add,
                remove
              </Text>
            </View>
            <ChevronRight size={18} color={colors.muted} />
          </GlassCard>
        </Pressable>

        <Separator className="my-7" />

        {/* Preferences */}
        <Pressable onPress={() => router.push('/settings')}>
          <GlassCard contentClassName="flex-row items-center gap-3 p-4">
            <View
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.accentA(0.1) }}
            >
              <Settings size={18} color={colors.accent} />
            </View>
            <View className="flex-1">
              <Text className="text-starlight font-medium">Settings</Text>
              <Text className="text-muted text-xs">Accessibility, sound, display, privacy</Text>
            </View>
            <ChevronRight size={18} color={colors.muted} />
          </GlassCard>
        </Pressable>

        {/* Demo helper for testing premium state */}
        {isPremium && (
          <Button variant="ghost" className="mt-3 mb-3" onPress={() => setTier('free')}>
            Switch back to Free (demo)
          </Button>
        )}

        <Pressable onPress={onSignOut}>
          <GlassCard contentClassName="flex-row items-center justify-center gap-2 p-4">
            <LogOut size={16} color={colors.muted} />
            <Text className="text-muted font-medium">Sign out</Text>
          </GlassCard>
        </Pressable>

        <Pressable
          onLongPress={onLoadDemo}
          delayLongPress={700}
          hitSlop={12}
          accessibilityLabel="Memoria"
        >
          <Text className="text-muted mt-6 text-center text-[11px] leading-4">
            Your memories are kept luminous among the stars.
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
