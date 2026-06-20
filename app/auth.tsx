import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input, Label, Text, TextField } from 'heroui-native';
import { Canvas, Circle, Fill, Group, Blur } from '@shopify/react-native-skia';
import { useWindowDimensions } from 'react-native';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { GlassCard } from '@/components/GlassCard';
import { useMemoria } from '@/lib/store';

function rand(i: number): number {
  let h = 2166136261 ^ i;
  h = Math.imul(h, 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

/** Slowly drifting, blurred starfield behind the gateway. */
function DriftingStarfield() {
  const { width, height } = useWindowDimensions();
  const drift = useSharedValue(0);

  // One-time animation setup: start on mount, no deps needed.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    drift.value = withRepeat(withTiming(1, { duration: 18000, easing: Easing.linear }), -1, true);
  });

  const stars = Array.from({ length: 70 }, (_, i) => ({
    id: i,
    x: rand(i * 3 + 1) * width,
    y: rand(i * 3 + 2) * height,
    r: 0.6 + rand(i * 3 + 3) * 2.2,
  }));

  return (
    <Canvas style={{ position: 'absolute', width, height }}>
      <Fill color="#080b18" />
      <Group>
        <Blur blur={2} />
        {stars.map((s) => (
          <DriftStar key={s.id} s={s} drift={drift} index={s.id} />
        ))}
      </Group>
    </Canvas>
  );
}

function DriftStar({
  s,
  drift,
  index,
}: {
  s: { id: number; x: number; y: number; r: number };
  drift: SharedValue<number>;
  index: number;
}) {
  const cy = useDerivedValue(() => s.y + drift.value * (10 + (index % 5) * 4));
  const opacity = useDerivedValue(() => 0.2 + 0.5 * Math.abs(Math.sin((drift.value + index) * 2)));
  return <Circle cx={s.x} cy={cy} r={s.r} color="#CFE0FF" opacity={opacity} />;
}

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
      <DriftingStarfield />
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

            <OAuthButton label="Sign in with Apple" glyph="" onPress={enter} />
            <OAuthButton label="Sign in with Google" glyph="G" onPress={enter} />
          </GlassCard>

          <Text className="text-muted mt-6 text-center text-xs">
            By continuing you agree to keep your memories among the stars.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function OAuthButton({
  label,
  glyph,
  onPress,
}: {
  label: string;
  glyph: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="border-glass-border bg-starlight/5 active:bg-starlight/10 flex-row items-center justify-center gap-3 rounded-2xl border py-3.5"
    >
      <Text className="text-starlight text-lg">{glyph}</Text>
      <Text className="text-starlight font-medium">{label}</Text>
    </Pressable>
  );
}
