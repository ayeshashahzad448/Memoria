import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Apple } from 'lucide-react-native';
import { Button, Input, Text, TextField } from 'heroui-native';

import { GlassCard } from '@/components/GlassCard';
import { StarfieldBackground } from '@/components/StarfieldBackground';
import { wordmarkFamily } from '@/lib/fonts';
import { useMemoria } from '@/lib/store';

export default function LoginScreen() {
  const router = useRouter();
  const signIn = useMemoria((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const enter = () => {
    signIn();
    router.replace('/(tabs)');
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
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-7 items-center">
            <Text
              style={{
                fontFamily: wordmarkFamily(),
                fontSize: 44,
                letterSpacing: 3,
                color: '#F8FAFC',
              }}
            >
              Memoria
            </Text>
            <Text className="text-starlight font-display mt-2 text-xl">Welcome back</Text>
          </View>

          <GlassCard contentClassName="gap-5 p-6">
            <View className="gap-4">
              <TextField>
                <Text className="text-starlight mb-1.5 text-sm font-semibold">Email</Text>
                <Input
                  placeholder="you@stars.space"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </TextField>

              <TextField>
                <View className="mb-1.5 flex-row items-center justify-between">
                  <Text className="text-starlight text-sm font-semibold">Password</Text>
                  <Pressable hitSlop={8}>
                    <Text className="text-accent text-sm">Forgot?</Text>
                  </Pressable>
                </View>
                <Input
                  placeholder="••••••••"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </TextField>
            </View>

            <Button onPress={enter} className="mt-1">
              Log In
            </Button>

            <View className="flex-row items-center gap-3 py-0.5">
              <View className="bg-glass-border h-px flex-1" />
              <Text className="text-muted text-xs">or</Text>
              <View className="bg-glass-border h-px flex-1" />
            </View>

            <View className="gap-3">
              <OAuthButton label="Continue with Google" onPress={enter}>
                <GoogleGlyph />
              </OAuthButton>
              <OAuthButton label="Continue with Apple" onPress={enter}>
                <Apple size={18} color="#F8FAFC" fill="#F8FAFC" />
              </OAuthButton>
            </View>
          </GlassCard>

          <Text className="text-muted mt-6 text-center text-sm leading-5">
            New to Memoria?{' '}
            <Text
              className="text-accent text-sm font-semibold"
              onPress={() => router.replace('/auth')}
            >
              Sign up.
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function OAuthButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="border-glass-border bg-starlight/5 active:bg-starlight/10 flex-row items-center justify-center gap-3 rounded-2xl border py-3.5"
    >
      {children}
      <Text className="text-starlight font-medium">{label}</Text>
    </Pressable>
  );
}

/** Minimal multi-color Google "G" ring built from a 4-color border (no external logo asset). */
function GoogleGlyph() {
  return (
    <View className="h-[18px] w-[18px] items-center justify-center">
      <View
        style={{
          height: 18,
          width: 18,
          borderRadius: 9,
          borderWidth: 3,
          borderTopColor: '#EA4335',
          borderLeftColor: '#FBBC05',
          borderRightColor: '#4285F4',
          borderBottomColor: '#34A853',
        }}
      />
    </View>
  );
}
