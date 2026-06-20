import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Separator, Text } from 'heroui-native';
import { ChevronRight, Cloud, LogOut, Sparkles, Users } from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { StorageBar, storageLabel } from '@/components/StorageBar';
import { useMemoria } from '@/lib/store';
import { CURRENT_USER, colorFor } from '@/lib/memoria';
import { FREE_LIMIT_BYTES, WARN_RATIO, totalMediaBytes } from '@/lib/storage';

const ACCENT = colorFor('cyan').hex;
const MUTED = '#94A3B8';

export default function ProfileTab() {
  const router = useRouter();
  const stars = useMemoria((s) => s.stars);
  const tier = useMemoria((s) => s.tier);
  const sharedCosmoses = useMemoria((s) => s.sharedCosmoses);
  const signOut = useMemoria((s) => s.signOut);
  const setTier = useMemoria((s) => s.setTier);

  const isPremium = tier === 'premium';
  const used = useMemo(() => totalMediaBytes(stars), [stars]);
  const ratio = used / FREE_LIMIT_BYTES;
  const atLimit = !isPremium && used >= FREE_LIMIT_BYTES;
  const warning = !isPremium && ratio >= WARN_RATIO && !atLimit;

  const onSignOut = () => {
    signOut();
    router.replace('/');
  };

  return (
    <View className="bg-void flex-1">
      <ScrollView contentContainerClassName="px-5 pt-safe-offset-4 pb-32">
        <Text className="text-starlight font-display text-3xl font-bold">Profile</Text>

        {/* Identity */}
        <GlassCard className="mt-5" contentClassName="flex-row items-center gap-4 p-5">
          <View
            className="h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: ACCENT }}
          >
            <Text className="text-void text-xl font-bold">
              {CURRENT_USER.name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-starlight text-lg font-semibold">{CURRENT_USER.name}</Text>
            <Text className="text-muted text-xs">@{CURRENT_USER.handle}</Text>
          </View>
          <View
            className="rounded-full border px-3 py-1"
            style={{ borderColor: isPremium ? ACCENT : 'rgba(140,147,184,0.4)' }}
          >
            <Text className="text-xs font-semibold" style={{ color: isPremium ? ACCENT : MUTED }}>
              {isPremium ? 'Premium' : 'Free'}
            </Text>
          </View>
        </GlassCard>

        {/* Storage capacity */}
        <Text className="text-muted mt-7 mb-2.5 text-xs font-semibold tracking-widest uppercase">
          Storage
        </Text>
        <GlassCard contentClassName="gap-3.5 p-5">
          <View className="flex-row items-center gap-2">
            <Cloud size={18} color={ACCENT} />
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

          {!isPremium && (
            <Button size="sm" onPress={() => router.push('/paywall')}>
              <Sparkles size={15} color="#0b0c10" />
              <Button.Label>Upgrade to Premium</Button.Label>
            </Button>
          )}
        </GlassCard>

        {/* Spaces */}
        <Text className="text-muted mt-7 mb-2.5 text-xs font-semibold tracking-widest uppercase">
          Spaces
        </Text>
        <Pressable onPress={() => router.push('/cosmos-spaces')}>
          <GlassCard contentClassName="flex-row items-center gap-3 p-5">
            <Users size={18} color={ACCENT} />
            <View className="flex-1">
              <Text className="text-starlight font-medium">Shared cosmos spaces</Text>
              <Text className="text-muted text-xs">
                {sharedCosmoses.length} space{sharedCosmoses.length === 1 ? '' : 's'}
              </Text>
            </View>
            <ChevronRight size={18} color={MUTED} />
          </GlassCard>
        </Pressable>

        <Separator className="my-7" />

        {/* Demo helper for testing premium state */}
        {isPremium && (
          <Button variant="ghost" className="mb-3" onPress={() => setTier('free')}>
            Switch back to Free (demo)
          </Button>
        )}

        <Pressable onPress={onSignOut}>
          <GlassCard contentClassName="flex-row items-center justify-center gap-2 p-4">
            <LogOut size={16} color={MUTED} />
            <Text className="text-muted font-medium">Sign out</Text>
          </GlassCard>
        </Pressable>

        <Text className="text-muted mt-6 text-center text-[11px] leading-4">
          Your memories are kept luminous among the stars.
        </Text>
      </ScrollView>
    </View>
  );
}
