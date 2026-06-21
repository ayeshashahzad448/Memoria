import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Separator, Switch, Text } from 'heroui-native';
import {
  ChevronLeft,
  Contrast,
  Eye,
  Globe,
  Lock,
  Trash2,
  Type,
  UserCheck,
  Vibrate,
  Volume2,
  Waves,
  type LucideIcon,
} from 'lucide-react-native';

import { GlassCard } from '@/components/GlassCard';
import { useMemoria } from '@/lib/store';
import { colorFor } from '@/lib/memoria';
import type { MemoryPrivacy, TextSize } from '@/lib/types';

const ACCENT = colorFor('cyan').hex;
const MUTED = '#94A3B8';
const DANGER = '#FF2A6D';

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
  return (
    <View>
      {!first && <Separator />}
      <View className="flex-row items-center gap-3 px-4 py-3.5">
        <View
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(69,243,255,0.1)' }}
        >
          <Icon size={17} color={ACCENT} />
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
  return (
    <View
      className="flex-row rounded-full p-0.5"
      style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            hitSlop={4}
            className="flex-1 items-center rounded-full px-3 py-2"
            style={{ backgroundColor: active ? ACCENT : 'transparent' }}
          >
            <Text className="text-sm font-semibold" style={{ color: active ? '#0b0c10' : MUTED }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
          onPress={() => router.back()}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
        >
          <ChevronLeft size={20} color="#F8FAFC" />
        </Pressable>
        <Text className="text-starlight font-display text-2xl font-bold">Settings</Text>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-24" keyboardShouldPersistTaps="handled">
        {/* Display */}
        <SectionTitle>Display</SectionTitle>
        <GlassCard contentClassName="p-1">
          <View className="px-4 py-3.5">
            <View className="flex-row items-center gap-3">
              <View
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(69,243,255,0.1)' }}
              >
                <Type size={17} color={ACCENT} />
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

        {/* Sound & Haptics */}
        <SectionTitle>Sound & Haptics</SectionTitle>
        <GlassCard contentClassName="p-1">
          <Row first icon={Volume2} title="Sound effects" subtitle="UI and interaction sounds">
            <Switch
              isSelected={settings.sound}
              onSelectedChange={(sound) => updateSettings({ sound })}
            />
          </Row>
          <Row icon={Vibrate} title="Haptic feedback" subtitle="Vibrations on gestures and taps">
            <Switch
              isSelected={settings.haptics}
              onSelectedChange={(haptics) => updateSettings({ haptics })}
            />
          </Row>
        </GlassCard>

        {/* Memory privacy */}
        <SectionTitle>Memory Privacy</SectionTitle>
        <GlassCard contentClassName="gap-1 p-4">
          <View className="flex-row items-center gap-3">
            <View
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(69,243,255,0.1)' }}
            >
              <Eye size={17} color={ACCENT} />
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
                  className="flex-1 items-center gap-1.5 rounded-xl border py-3"
                  style={{
                    borderColor: active ? ACCENT : 'rgba(255,255,255,0.08)',
                    backgroundColor: active ? 'rgba(69,243,255,0.08)' : 'transparent',
                  }}
                >
                  <Icon size={18} color={active ? ACCENT : MUTED} />
                  <Text className="text-xs font-medium" style={{ color: active ? ACCENT : MUTED }}>
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

        {/* Data */}
        <SectionTitle>Data</SectionTitle>
        <GlassCard contentClassName="p-1">
          <Pressable onPress={() => setConfirmReset(true)}>
            <View className="flex-row items-center gap-3 px-4 py-3.5">
              <View
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(255,42,109,0.12)' }}
              >
                <Trash2 size={17} color={DANGER} />
              </View>
              <View className="flex-1">
                <Text className="font-medium" style={{ color: DANGER }}>
                  Reset app
                </Text>
                <Text className="text-muted text-xs leading-4">
                  Erase all memories, constellations and settings
                </Text>
              </View>
            </View>
          </Pressable>
        </GlassCard>

        <Text className="text-muted mt-6 text-center text-[11px] leading-4">
          Preferences are saved on this device.
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
                <Trash2 size={22} color={DANGER} />
              </View>
              <Text className="text-starlight font-display text-xl font-bold">Reset app?</Text>
              <Text className="text-muted text-center text-sm leading-5">
                This permanently erases every memory, constellation, shared cosmos and preference on
                this device. You will start over from a blank cosmos.
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
