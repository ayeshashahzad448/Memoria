import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

export interface RecordingResult {
  uri: string;
  durationSec: number;
}

/**
 * Thin wrapper around expo-audio recording with permission handling and a
 * graceful web fallback (recording is unsupported on web in this build).
 */
export function useVoiceRecorder() {
  const isSupported = Platform.OS !== 'web';
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const startedAt = useRef<number | null>(null);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    if (!isSupported) return;
    void (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      setGranted(status.granted);
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    })();
  }, [isSupported]);

  const start = useCallback(async () => {
    if (!isSupported || !granted) return;
    await recorder.prepareToRecordAsync();
    recorder.record();
    startedAt.current = Date.now();
  }, [isSupported, granted, recorder]);

  const stop = useCallback(async (): Promise<RecordingResult | null> => {
    if (!isSupported) return null;
    await recorder.stop();
    const durationSec = startedAt.current ? (Date.now() - startedAt.current) / 1000 : 0;
    startedAt.current = null;
    if (!recorder.uri) return null;
    return { uri: recorder.uri, durationSec };
  }, [isSupported, recorder]);

  return {
    isSupported: isSupported && granted,
    isRecording: state.isRecording,
    start,
    stop,
  };
}
