import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Chip, Input, Label, Text, TextField } from 'heroui-native';

import { GlassCard } from '@/components/GlassCard';
import { useMemoria, PERSONAL_COSMOS } from '@/lib/store';
import { DIRECTORY_USERS, CURRENT_USER, userById } from '@/lib/memoria';

export default function CosmosSpaces() {
  const router = useRouter();
  const sharedCosmoses = useMemoria((s) => s.sharedCosmoses);
  const activeCosmosId = useMemoria((s) => s.activeCosmosId);
  const setActiveCosmos = useMemoria((s) => s.setActiveCosmos);
  const createSharedCosmos = useMemoria((s) => s.createSharedCosmos);

  const [name, setName] = useState('');
  const [members, setMembers] = useState<string[]>([]);

  const taggable = DIRECTORY_USERS.filter((u) => u.id !== CURRENT_USER.id);

  const switchTo = (id: string) => {
    setActiveCosmos(id);
    router.back();
  };

  const create = () => {
    if (name.trim().length === 0) return;
    const cosmos = createSharedCosmos(name, members);
    setName('');
    setMembers([]);
    switchTo(cosmos.id);
  };

  const toggleMember = (id: string) =>
    setMembers((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <View className="bg-void flex-1">
      <ScrollView contentContainerClassName="px-5 pt-6 pb-12" keyboardShouldPersistTaps="handled">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-starlight text-2xl font-bold">Cosmos spaces</Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text className="text-muted">Close</Text>
          </Pressable>
        </View>
        <Text className="text-muted mb-5 text-sm">
          A shared family cosmos is a durable, collective sky — an interactive archive meant to be
          passed to the next generation.
        </Text>

        <Pressable onPress={() => switchTo(PERSONAL_COSMOS)}>
          <GlassCard className="mb-3" contentClassName="flex-row items-center justify-between p-4">
            <View>
              <Text className="text-starlight font-semibold">✨ Your private cosmos</Text>
              <Text className="text-muted text-xs">Only you (and tagged friends)</Text>
            </View>
            {activeCosmosId === PERSONAL_COSMOS && (
              <Text className="text-accent text-xs">Active</Text>
            )}
          </GlassCard>
        </Pressable>

        {sharedCosmoses.map((c) => (
          <Pressable key={c.id} onPress={() => switchTo(c.id)}>
            <GlassCard className="mb-3" contentClassName="p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-starlight font-semibold">🌌 {c.name}</Text>
                {activeCosmosId === c.id && <Text className="text-accent text-xs">Active</Text>}
              </View>
              <Text className="text-muted mt-1 text-xs">
                {c.memberIds.map((id) => userById(id)?.name ?? 'Member').join(', ')}
              </Text>
            </GlassCard>
          </Pressable>
        ))}

        <GlassCard className="mt-4" contentClassName="gap-4 p-5">
          <Text className="text-starlight font-semibold">Create a shared cosmos</Text>
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
                  {`${u.avatar} ${u.name}`}
                </Chip>
              ))}
            </View>
          </View>
          <Button isDisabled={name.trim().length === 0} onPress={create}>
            Create shared cosmos
          </Button>
        </GlassCard>
      </ScrollView>
    </View>
  );
}
