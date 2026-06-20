import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Input, Text, TextField } from 'heroui-native';
import { ChevronLeft, Search, UserMinus, UserPlus, X } from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { useMemoria } from '@/lib/store';
import { CURRENT_USER, DIRECTORY_USERS, colorFor } from '@/lib/memoria';

const ACCENT = colorFor('cyan').hex;
const DANGER = colorFor('rose').hex;
const MUTED = '#94A3B8';

const PEOPLE = DIRECTORY_USERS.filter((u) => u.id !== CURRENT_USER.id);

export default function FriendsScreen() {
  const router = useRouter();
  const friendIds = useMemoria((s) => s.friendIds);
  const addFriend = useMemoria((s) => s.addFriend);
  const removeFriend = useMemoria((s) => s.removeFriend);

  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      q.length === 0
        ? PEOPLE
        : PEOPLE.filter(
            (u) => u.name.toLowerCase().includes(q) || u.handle.toLowerCase().includes(q),
          ),
    [q],
  );

  const friends = filtered.filter((u) => friendIds.includes(u.id));
  const suggestions = filtered.filter((u) => !friendIds.includes(u.id));

  return (
    <View className="bg-void flex-1">
      <View className="pt-safe-offset-3 flex-row items-center gap-3 px-5 pb-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
        >
          <ChevronLeft size={20} color="#F8FAFC" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-starlight font-display text-2xl font-bold">Friends</Text>
          <Text className="text-muted text-xs">{friendIds.length} connected</Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-24" keyboardShouldPersistTaps="handled">
        {/* Search */}
        <GlassCard contentClassName="flex-row items-center gap-2.5 px-4 py-2.5">
          <Search size={18} color={MUTED} />
          <TextField className="flex-1">
            <Input
              placeholder="Search people"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </TextField>
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <X size={16} color={MUTED} />
            </Pressable>
          )}
        </GlassCard>

        {/* Your friends */}
        <SectionTitle>Your friends</SectionTitle>
        {friends.length === 0 ? (
          <GlassCard contentClassName="items-center gap-1 px-4 py-6">
            <Text className="text-muted text-sm">
              {q.length > 0 ? 'No friends match your search.' : 'You have no friends yet.'}
            </Text>
          </GlassCard>
        ) : (
          <GlassCard contentClassName="gap-2 p-3">
            {friends.map((u) => (
              <PersonRow
                key={u.id}
                name={u.name}
                handle={u.handle}
                avatar={u.avatar}
                action="remove"
                onPress={() => removeFriend(u.id)}
              />
            ))}
          </GlassCard>
        )}

        {/* Suggestions / add */}
        {suggestions.length > 0 && (
          <>
            <SectionTitle>Add people</SectionTitle>
            <GlassCard contentClassName="gap-2 p-3">
              {suggestions.map((u) => (
                <PersonRow
                  key={u.id}
                  name={u.name}
                  handle={u.handle}
                  avatar={u.avatar}
                  action="add"
                  onPress={() => addFriend(u.id)}
                />
              ))}
            </GlassCard>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="text-muted mt-7 mb-2.5 text-xs font-semibold tracking-widest uppercase">
      {children}
    </Text>
  );
}

interface PersonRowProps {
  name: string;
  handle: string;
  avatar: string;
  action: 'add' | 'remove';
  onPress: () => void;
}

function PersonRow({ name, handle, avatar, action, onPress }: PersonRowProps) {
  const isAdd = action === 'add';
  return (
    <View className="flex-row items-center gap-3">
      <View className="bg-nebula-base h-11 w-11 items-center justify-center rounded-full">
        <Text className="text-lg">{avatar}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-starlight font-medium">{name}</Text>
        <Text className="text-muted text-xs">@{handle}</Text>
      </View>
      <Pressable
        onPress={onPress}
        hitSlop={6}
        className="h-9 flex-row items-center gap-1.5 rounded-full px-3.5"
        style={{
          backgroundColor: isAdd ? 'rgba(69,243,255,0.12)' : 'rgba(255,255,255,0.06)',
          borderWidth: 1,
          borderColor: isAdd ? 'rgba(69,243,255,0.5)' : 'rgba(255,42,109,0.4)',
        }}
      >
        {isAdd ? <UserPlus size={15} color={ACCENT} /> : <UserMinus size={15} color={DANGER} />}
        <Text className="text-xs font-semibold" style={{ color: isAdd ? ACCENT : DANGER }}>
          {isAdd ? 'Add' : 'Remove'}
        </Text>
      </Pressable>
    </View>
  );
}
