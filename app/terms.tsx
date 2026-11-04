import { useState } from 'react';
import { ScopedTheme } from 'uniwind';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Text } from 'heroui-native';
import { Check } from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { useMemoria } from '@/lib/store';

const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL;
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL;

const POINTS = [
  {
    title: 'Your memories stay with you',
    body: 'Stories, photos and voice notes are kept on your device. If you turn on cloud sync, copies go to your own iCloud or Google Drive account.',
  },
  {
    title: 'You choose who sees a memory',
    body: 'Only people you tag, or invite to a shared cosmos, can see what you add to it.',
  },
  {
    title: 'Keep it kind and lawful',
    body: 'Please do not add content that is unlawful, or that harms or harasses other people.',
  },
  {
    title: 'Subscriptions renew until cancelled',
    body: 'Premium is billed through the App Store or Google Play and can be cancelled any time in your device settings.',
  },
];

/**
 * Shown once, right after someone first signs up or logs in, before onboarding.
 * They must tick the box to continue; declining signs them back out.
 */
function TermsScreenScreen() {
  const router = useRouter();
  const acceptTerms = useMemoria((s) => s.acceptTerms);
  const signOut = useMemoria((s) => s.signOut);
  const [agreed, setAgreed] = useState(false);

  const accept = () => {
    acceptTerms();
    router.replace(useMemoria.getState().hasOnboarded ? '/(tabs)' : '/onboarding');
  };

  const decline = () => {
    signOut();
    router.replace('/auth');
  };

  const links = [
    { title: 'Terms of Service', url: TERMS_URL },
    { title: 'Privacy Policy', url: PRIVACY_URL },
  ].filter((l): l is { title: string; url: string } => !!l.url);

  return (
    <View className="bg-void flex-1">
      <ScrollView contentContainerClassName="px-6 pt-safe-offset-10 pb-64">
        <Text className="text-starlight font-heading text-4xl leading-[42px]">Before we begin</Text>
        <Text className="text-muted mt-2 text-base leading-6">
          A quick look at how Memoria treats your memories.
        </Text>

        <GlassCard className="mt-6" contentClassName="gap-5 p-5">
          {POINTS.map((p) => (
            <View key={p.title} className="gap-1">
              <Text className="text-starlight font-semibold">{p.title}</Text>
              <Text className="text-muted text-sm leading-5">{p.body}</Text>
            </View>
          ))}
        </GlassCard>

        {links.length > 0 ? (
          <View className="mt-5 flex-row gap-5">
            {links.map((l) => (
              <Pressable
                key={l.title}
                onPress={() => void Linking.openURL(l.url)}
                accessibilityRole="link"
                accessibilityLabel={`Read the full ${l.title}`}
              >
                <Text className="text-accent text-sm font-medium">{`Read the full ${l.title}`}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View className="border-glass-border bg-void/95 pb-safe-offset-4 absolute inset-x-0 bottom-0 gap-3 border-t px-6 pt-4">
        <Pressable
          onPress={() => setAgreed((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
          accessibilityLabel="I agree to the Terms of Service and Privacy Policy"
          className="flex-row items-center gap-3"
        >
          <View
            className="h-6 w-6 items-center justify-center rounded-md border"
            style={{
              borderColor: agreed ? '#A5B4FC' : 'rgba(255,255,255,0.3)',
              backgroundColor: agreed ? '#A5B4FC' : 'transparent',
            }}
          >
            {agreed ? <Check size={16} color="#0C0E14" strokeWidth={3} /> : null}
          </View>
          <Text className="text-starlight flex-1 text-sm leading-5">
            I agree to the Terms of Service and Privacy Policy
          </Text>
        </Pressable>
        <Button isDisabled={!agreed} onPress={accept}>
          Accept and continue
        </Button>
        <Button variant="ghost" onPress={decline}>
          Decline
        </Button>
      </View>
    </View>
  );
}

/** This screen is a night sky, so it stays dark even when the app is in light mode. */
export default function TermsScreen() {
  return (
    <ScopedTheme theme="dark">
      <TermsScreenScreen />
    </ScopedTheme>
  );
}
