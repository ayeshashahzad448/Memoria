import { Pressable, Platform, View } from 'react-native';
import { Text } from 'heroui-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pause, Play } from 'lucide-react-native';

import type { VoiceNote } from '@/lib/types';
import { colorFor } from '@/lib/memoria';

const ACCENT = colorFor('cyan').hex;

/** Plays a recorded voice note. Web shows a static row (recording is device-only). */
export function VoiceNotePlayer({ note, index }: { note: VoiceNote; index: number }) {
  const player = useAudioPlayer(Platform.OS === 'web' ? undefined : { uri: note.uri });
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    if (Platform.OS === 'web') return;
    if (status.playing) {
      player.pause();
    } else {
      void player.seekTo(0);
      player.play();
    }
  };

  return (
    <Pressable
      onPress={toggle}
      className="border-glass-border flex-row items-center justify-between rounded-2xl border px-4 py-3.5"
    >
      <View className="flex-row items-center gap-2.5">
        {status.playing ? <Pause size={16} color={ACCENT} /> : <Play size={16} color={ACCENT} />}
        <Text className="text-starlight">Note {index + 1}</Text>
      </View>
      <Text className="text-muted text-xs">{Math.round(note.durationSec)}s</Text>
    </Pressable>
  );
}
