import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input, Label, Text, TextField } from 'heroui-native';

import { GlassCard } from '@/components/GlassCard';
import { StarfieldBackground } from '@/components/StarfieldBackground';
import { useMemoria } from '@/lib/store';

export default function AuthScreen() {
  const router = useRouter();
  const signIn = useMemoria((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const enter = () => {
    signIn();
    router.replace('/');
  };

  return (
    <View className="bg-void-deep flex-1">
      <StarfieldBackground variant="drift" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-12"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-8 items-center">
            <Text className="text-starlight text-5xl font-bold tracking-tight">Memoria</Text>
            <Text className="text-muted mt-2 text-center">
              A cosmos of your memories, kept luminous.
            </Text>
          </View>

          <GlassCard contentClassName="gap-4 p-6">
            <TextField>
              <Label>Email</Label>
              <Input
                placeholder="you@stars.space"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </TextField>
            <TextField>
              <Label>Password</Label>
              <Input
                placeholder="••••••••"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </TextField>

            <Button onPress={enter} className="mt-1">
              Create account
            </Button>

            <View className="flex-row items-center gap-3 py-1">
              <View className="bg-glass-border h-px flex-1" />
              <Text className="text-muted text-xs">or continue with</Text>
              <View className="bg-glass-border h-px flex-1" />
            </View>

            <OAuthButton label="Continue with Apple" onPress={enter} />
            <OAuthButton label="Continue with Google" onPress={enter} />
          </GlassCard>

          <Text className="text-muted mt-6 text-center text-xs">
            By continuing you agree to keep your memories among the stars.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function OAuthButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="border-glass-border bg-starlight/5 active:bg-starlight/10 flex-row items-center justify-center gap-3 rounded-2xl border py-3.5"
    >
      <Text className="text-starlight font-medium">{label}</Text>
    </Pressable>
  );
}
