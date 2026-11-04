import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { formatDistanceToNow } from 'date-fns';
import { Button, Separator, Switch, Text } from 'heroui-native';
import {
  ChevronLeft,
  Cloud,
  Contrast,
  Eye,
  FileText,
  Globe,
  LifeBuoy,
  Lock,
  SunMoon,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Type,
  UserCheck,
  Vibrate,
  Waves,
  type LucideIcon,
} from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { useMemoria } from '@/lib/store';
import { goBack } from '@/lib/navigation';

import {
  SIMULATED_CONNECT_MS,
  checkSyncAvailability,
  isCloudSimulated,
  providerLabel,
  syncNow,
  syncProviderForPlatform,
  type SyncAvailability,
} from '@/lib/cloudSync';
import type { MemoryPrivacy, TextSize, ThemeMode } from '@/lib/types';

import { usePalette } from '@/lib/theme';
/** Set these in the build environment before publishing; rows stay hidden until they exist. */
const LEGAL_LINKS = [
  { icon: ShieldCheck, title: 'Privacy policy', url: process.env.EXPO_PUBLIC_PRIVACY_URL },
  { icon: FileText, title: 'Terms of service', url: process.env.EXPO_PUBLIC_TERMS_URL },
  { icon: LifeBuoy, title: 'Support', url: process.env.EXPO_PUBLIC_SUPPORT_URL },
].filter((l): l is { icon: LucideIcon; title: string; url: string } => !!l.url);

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const TEXT_SIZES: { value: TextSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

const PRIVACY_OPTIONS: { value: MemoryPrivacy; label: string; icon: LucideIcon }[] = [
  { value: 'private', label: 'Only me', icon: Lock },
  { value: 'friends', label: 'Friends', icon: UserCheck },
  { value: 'public', label: 'Public', icon: Globe },
];

interface RowProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  children: ReactNode;
  first?: boolean;
}

function Row({ icon: Icon, title, subtitle, children, first }: RowProps) {
  const colors = usePalette();
  return (
    <View>
      {!first && <Separator />}
      <View className="flex-row items-center gap-3 px-4 py-3.5">
        <View
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.accentA(0.1) }}
        >
          <Icon size={17} color={colors.accent} />
        </View>
        <View className="flex-1">
          <Text className="text-starlight font-medium">{title}</Text>
          {subtitle ? <Text className="text-muted text-xs leading-4">{subtitle}</Text> : null}
        </View>
        {children}
      </View>
    </View>
  );
}

interface SegmentProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

function Segmented<T extends string>({ options, value, onChange }: SegmentProps<T>) {
  const colors = usePalette();
  return (
    <View className="flex-row rounded-full p-0.5" style={{ backgroundColor: colors.fg(0.06) }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            hitSlop={4}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: active }}
            className="flex-1 items-center rounded-full px-3 py-2"
            style={{ backgroundColor: active ? colors.accent : 'transparent' }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: active ? colors.onAccent : colors.muted }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CloudSyncSection() {
  const colors = usePalette();
  const sync = useMemoria((s) => s.sync);
  const setSync = useMemoria((s) => s.setSync);
  const [availability, setAvailability] = useState<SyncAvailability | null>(null);
  const [busy, setBusy] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    void checkSyncAvailability().then(setAvailability);
  }, []);

  const provider = availability?.provider ?? syncProviderForPlatform();
  const name = providerLabel(provider);

  const toggle = async (enabled: boolean) => {
    if (!enabled) {
      setSync({ enabled: false });
      return;
    }
    const next = await checkSyncAvailability();
    setAvailability(next);
    if (!next.available) {
      setSync({ lastError: next.reason });
      return;
    }
    if (isCloudSimulated()) {
      setConnecting(true);
      await new Promise((resolve) => setTimeout(resolve, SIMULATED_CONNECT_MS));
      setConnecting(false);
    }
    setSync({ enabled: true, lastError: undefined });
  };

  const syncOnce = async () => {
    setBusy(true);
    try {
      await syncNow();
    } finally {
      setBusy(false);
    }
  };

  const status = connecting
    ? `Connecting to ${name}…`
    : sync.lastError
      ? sync.lastError
      : sync.enabled
        ? sync.lastSyncedAt
          ? `Last synced ${formatDistanceToNow(new Date(sync.lastSyncedAt), { addSuffix: true })}`
          : 'Waiting for first sync'
        : (availability?.reason ?? `Keep memories and media in sync across your devices`);

  return (
    <GlassCard contentClassName="p-1">
      <Row first icon={Cloud} title={`Sync with ${name}`} subtitle={status}>
        <Switch
          isSelected={sync.enabled || connecting}
          isDisabled={connecting}
          onSelectedChange={(on) => void toggle(on)}
          accessibilityLabel={`Sync with ${name}`}
        />
      </Row>
      {sync.enabled ? (
        <>
          <Separator />
          <Pressable
            onPress={() => void syncOnce()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Sync now"
            accessibilityState={{ disabled: busy, busy }}
            className="flex-row items-center gap-3 px-4 py-3.5"
          >
            <View
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.accentA(0.1) }}
            >
              <RefreshCw size={17} color={colors.accent} />
            </View>
            <Text className="font-medium" style={{ color: colors.accent, opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Syncing…' : 'Sync now'}
            </Text>
          </Pressable>
        </>
      ) : null}
    </GlassCard>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text className="text-muted mt-7 mb-2.5 text-xs font-semibold tracking-widest uppercase">
      {children}
    </Text>
  );
}

export default function SettingsScreen() {
  const colors = usePalette();
  const router = useRouter();
  const settings = useMemoria((s) => s.settings);
  const updateSettings = useMemoria((s) => s.updateSettings);
  const resetApp = useMemoria((s) => s.resetApp);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleReset = () => {
    resetApp();
    router.replace('/');
  };

  return (
    <View className="bg-void flex-1">
      <View className="pt-safe-offset-3 flex-row items-center gap-3 px-5 pb-3">
        <Pressable
          onPress={() => goBack(router)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.fg(0.06) }}
        >
          <ChevronLeft size={20} color={colors.text} />
        </Pressable>
        <Text className="text-starlight font-heading text-3xl">Settings</Text>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-24" keyboardShouldPersistTaps="handled">
        {/* Display */}
        <SectionTitle>Display</SectionTitle>
        <GlassCard contentClassName="p-1">
          <View className="px-4 py-3.5">
            <View className="flex-row items-center gap-3">
              <View
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.accentA(0.1) }}
              >
                <SunMoon size={17} color={colors.accent} />
              </View>
              <View className="flex-1">
                <Text className="text-starlight font-medium">Appearance</Text>
                <Text className="text-muted text-xs leading-4">
                  Light, dark, or match your device. The night-sky screens stay dark.
                </Text>
              </View>
            </View>
            <View className="mt-3">
              <Segmented
                options={THEME_OPTIONS}
                value={settings.theme}
                onChange={(theme) => updateSettings({ theme })}
              />
            </View>
          </View>
          <Separator />
          <View className="px-4 py-3.5">
            <View className="flex-row items-center gap-3">
              <View
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.accentA(0.1) }}
              >
                <Type size={17} color={colors.accent} />
              </View>
              <View className="flex-1">
                <Text className="text-starlight font-medium">Text size</Text>
                <Text className="text-muted text-xs leading-4">Scale labels and memory text</Text>
              </View>
            </View>
            <View className="mt-3">
              <Segmented
                options={TEXT_SIZES}
                value={settings.textSize}
                onChange={(textSize) => updateSettings({ textSize })}
              />
            </View>
          </View>
          <Row icon={Contrast} title="High contrast" subtitle="Boost legibility of UI elements">
            <Switch
              isSelected={settings.highContrast}
              onSelectedChange={(highContrast) => updateSettings({ highContrast })}
            />
          </Row>
          <Row icon={Waves} title="Reduce motion" subtitle="Calm star twinkle and animations">
            <Switch
              isSelected={settings.reduceMotion}
              onSelectedChange={(reduceMotion) => updateSettings({ reduceMotion })}
            />
          </Row>
        </GlassCard>

        {/* Haptics */}
        <SectionTitle>Haptics</SectionTitle>
        <GlassCard contentClassName="p-1">
          <Row
            first
            icon={Vibrate}
            title="Haptic feedback"
            subtitle="Vibrations on gestures and taps"
          >
            <Switch
              isSelected={settings.haptics}
              onSelectedChange={(haptics) => updateSettings({ haptics })}
              accessibilityLabel="Haptic feedback"
            />
          </Row>
        </GlassCard>

        {/* Memory privacy: not connected to anything yet, so shown but switched off */}
        <SectionTitle>Memory Privacy (coming soon)</SectionTitle>
        <View pointerEvents="none" style={{ opacity: 0.45 }} accessibilityElementsHidden>
          <GlassCard contentClassName="gap-1 p-4">
            <View className="flex-row items-center gap-3">
              <View
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.accentA(0.1) }}
              >
                <Eye size={17} color={colors.accent} />
              </View>
              <View className="flex-1">
                <Text className="text-starlight font-medium">Default visibility</Text>
                <Text className="text-muted text-xs leading-4">Who can see new memories</Text>
              </View>
            </View>
            <View className="mt-3 flex-row gap-2">
              {PRIVACY_OPTIONS.map((o) => {
                const active = o.value === settings.privacy;
                const Icon = o.icon;
                return (
                  <Pressable
                    key={o.value}
                    onPress={() => updateSettings({ privacy: o.value })}
                    hitSlop={4}
                    accessibilityRole="radio"
                    accessibilityLabel={o.label}
                    accessibilityState={{ selected: active }}
                    className="flex-1 items-center gap-1.5 rounded-xl border py-3"
                    style={{
                      borderColor: active ? colors.accent : colors.fg(0.08),
                      backgroundColor: active ? colors.accentA(0.08) : 'transparent',
                    }}
                  >
                    <Icon size={18} color={active ? colors.accent : colors.muted} />
                    <Text
                      className="text-xs font-medium"
                      style={{ color: active ? colors.accent : colors.muted }}
                    >
                      {o.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>

          <GlassCard className="mt-3" contentClassName="p-1">
            <Row
              first
              icon={UserCheck}
              title="Allow tagging"
              subtitle="Friends can tag you in their memories"
            >
              <Switch
                isSelected={settings.allowTagging}
                onSelectedChange={(allowTagging) => updateSettings({ allowTagging })}
              />
            </Row>
          </GlassCard>
        </View>

        {/* Cloud sync */}
        <SectionTitle>Cloud</SectionTitle>
        <CloudSyncSection />

        {/* About & legal */}
        {LEGAL_LINKS.length > 0 ? (
          <>
            <SectionTitle>About</SectionTitle>
            <GlassCard contentClassName="p-1">
              {LEGAL_LINKS.map((link, i) => (
                <Pressable
                  key={link.title}
                  onPress={() => void Linking.openURL(link.url)}
                  accessibilityRole="link"
                  accessibilityLabel={link.title}
                >
                  {i > 0 && <Separator />}
                  <View className="flex-row items-center gap-3 px-4 py-3.5">
                    <View
                      className="h-9 w-9 items-center justify-center rounded-full"
                      style={{ backgroundColor: colors.accentA(0.1) }}
                    >
                      <link.icon size={17} color={colors.accent} />
                    </View>
                    <Text className="text-starlight flex-1 font-medium">{link.title}</Text>
                  </View>
                </Pressable>
              ))}
            </GlassCard>
          </>
        ) : null}

        {/* Data */}
        <SectionTitle>Data</SectionTitle>
        <GlassCard contentClassName="p-1">
          <Pressable
            onPress={() => setConfirmReset(true)}
            accessibilityRole="button"
            accessibilityLabel="Reset app"
            accessibilityHint="Erases all memories on this device after you confirm"
          >
            <View className="flex-row items-center gap-3 px-4 py-3.5">
              <View
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(255,42,109,0.12)' }}
              >
                <Trash2 size={17} color={colors.danger} />
              </View>
              <View className="flex-1">
                <Text className="font-medium" style={{ color: colors.danger }}>
                  Reset app
                </Text>
                <Text className="text-muted text-xs leading-4">
                  Erase all memories, constellations and settings
                </Text>
              </View>
            </View>
          </Pressable>
        </GlassCard>

        <Text className="text-muted mt-6 text-center text-xs leading-4">
          Preferences are saved on this device.
          {Constants.expoConfig?.version ? `\nMemoria ${Constants.expoConfig.version}` : ''}
        </Text>
      </ScrollView>

      {confirmReset ? (
        <View
          className="absolute inset-0 items-center justify-center px-8"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <GlassCard contentClassName="gap-4 p-6">
            <View className="items-center gap-2">
              <View
                className="h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(255,42,109,0.12)' }}
              >
                <Trash2 size={22} color={colors.danger} />
              </View>
              <Text className="text-starlight font-display text-xl font-bold">Reset app?</Text>
              <Text className="text-muted text-center text-sm leading-5">
                This permanently erases every memory, constellation, shared cosmos and preference on
                this device and turns cloud sync off. Any copy already in the cloud is kept. You
                will start over from a blank cosmos.
              </Text>
            </View>
            <View className="gap-2">
              <Button variant="danger" onPress={handleReset}>
                <Button.Label>Erase everything</Button.Label>
              </Button>
              <Button variant="ghost" onPress={() => setConfirmReset(false)}>
                <Button.Label>Cancel</Button.Label>
              </Button>
            </View>
          </GlassCard>
        </View>
      ) : null}
    </View>
  );
}
