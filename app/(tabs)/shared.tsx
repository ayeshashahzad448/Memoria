import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Chip, Input, Label, Text, TextField } from 'heroui-native';
import { ChevronRight, Plus, Sparkles, UsersRound, X } from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { useMemoria } from '@/lib/store';
import { DIRECTORY_USERS, CURRENT_USER, userById, colorFor } from '@/lib/memoria';

const ACCENT = colorFor('cyan').hex;
const MUTED = '#94A3B8';

export default function SharedTab() {
  const router = useRouter();
  const allStars = useMemoria((s) => s.stars);
  const sharedCosmoses = useMemoria((s) => s.sharedCosmoses);
  const createSharedCosmos = useMemoria((s) => s.createSharedCosmos);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [members, setMembers] = useState<string[]>([]);

  const taggable = DIRECTORY_USERS.filter((u) => u.id !== CURRENT_USER.id);

  const openSpace = (id: string) => router.push({ pathname: '/cosmos/[id]', params: { id } });

  const create = () => {
    if (name.trim().length === 0) return;
    const cosmos = createSharedCosmos(name, members);
    setName('');
    setMembers([]);
    setCreating(false);
    // Open the brand-new blank cosmos so people can start adding memories.
    openSpace(cosmos.id);
  };

  const toggleMember = (id: string) =>
    setMembers((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const starCount = (cosmosId: string) => allStars.filter((s) => s.cosmosId === cosmosId).length;

  return (
    <View className="bg-void flex-1">
      <ScrollView
        contentContainerClassName="px-5 pt-safe-offset-4 pb-32"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-starlight font-display text-3xl font-bold">Shared</Text>
        <Text className="text-muted mt-1 mb-6 text-sm leading-5">
          Collaborative cosmos spaces. Each one is a blank sky you and the people you invite fill
          with memories together — separate from your private cosmos.
        </Text>

        {sharedCosmoses.length === 0 && !creating && (
          <GlassCard className="mb-3" contentClassName="items-center gap-3 p-6">
            <View className="bg-accent/10 h-12 w-12 items-center justify-center rounded-full">
              <UsersRound size={22} color={ACCENT} />
            </View>
            <Text className="text-starlight font-display text-lg font-semibold">
              No shared spaces yet
            </Text>
            <Text className="text-muted text-center text-sm leading-5">
              Create a shared cosmos to start collecting memories with family and friends.
            </Text>
          </GlassCard>
        )}

        {/* Existing spaces */}
        <View className="gap-2.5">
          {sharedCosmoses.map((c) => {
            const count = starCount(c.id);
            const memberNames = c.memberIds.map((id) => userById(id)?.name ?? 'Member');
            return (
              <Pressable key={c.id} onPress={() => openSpace(c.id)}>
                <GlassCard contentClassName="flex-row items-center gap-3 p-4">
                  <View className="bg-accent/10 h-11 w-11 items-center justify-center rounded-full">
                    <UsersRound size={18} color={ACCENT} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-starlight font-semibold" numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text className="text-muted text-xs" numberOfLines={1}>
                      {count} {count === 1 ? 'memory' : 'memories'} · {memberNames.join(', ')}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={MUTED} />
                </GlassCard>
              </Pressable>
            );
          })}
        </View>

        {/* Create */}
        {creating ? (
          <GlassCard className="mt-4" contentClassName="gap-4 p-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-starlight font-semibold">Create a shared cosmos</Text>
              <Pressable
                onPress={() => {
                  setCreating(false);
                  setName('');
                  setMembers([]);
                }}
                hitSlop={10}
                className="border-glass-border h-8 w-8 items-center justify-center rounded-full border"
              >
                <X size={16} color={MUTED} />
              </Pressable>
            </View>
            <Text className="text-muted text-xs leading-4">
              This creates an empty sky with zero stars. You and invited members add memories to it
              together.
            </Text>
            <TextField>
              <Label>Name</Label>
              <Input placeholder="The Rivera Family Sky" value={name} onChangeText={setName} />
            </TextField>
            <View className="gap-2">
              <Label>Invite members</Label>
              <View className="flex-row flex-wrap gap-2">
                {taggable.map((u) => (
                  <Chip
                    key={u.id}
                    variant={members.includes(u.id) ? 'primary' : 'secondary'}
                    color={members.includes(u.id) ? 'accent' : 'default'}
                    onPress={() => toggleMember(u.id)}
                  >
                    {u.name}
                  </Chip>
                ))}
              </View>
            </View>
            <Button isDisabled={name.trim().length === 0} onPress={create}>
              <Sparkles size={15} color="#0b0c10" />
              <Button.Label>Create shared cosmos</Button.Label>
            </Button>
          </GlassCard>
        ) : (
          <Pressable className="mt-4" onPress={() => setCreating(true)}>
            <GlassCard contentClassName="flex-row items-center justify-center gap-2 p-4">
              <Plus size={18} color={ACCENT} />
              <Text className="text-accent font-medium">Create a shared cosmos</Text>
            </GlassCard>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
