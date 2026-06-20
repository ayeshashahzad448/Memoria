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

type PermissionState = 'unknown' | 'granted' | 'denied';

export interface VoiceRecorderApi {
  isSupported: boolean;
  permission: PermissionState;
  isRecording: boolean;
  start: () => Promise<void>;
  stop: () => Promise<RecordingResult | null>;
}

const IS_WEB = Platform.OS === 'web';

/**
 * Recording wrapper around expo-audio on native, with a browser MediaRecorder
 * fallback on web so voice notes work in the web preview too. Platform is fixed
 * per build, so the hooks below run unconditionally within their branch.
 */
export function useVoiceRecorder(): VoiceRecorderApi {
  // expo-audio hooks must run on every render; on web the recorder is a no-op.
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const startedAt = useRef<number | null>(null);
  const [permission, setPermission] = useState<PermissionState>('unknown');

  // Web fallback state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const resolveRef = useRef<((r: RecordingResult | null) => void) | null>(null);
  const [webRecording, setWebRecording] = useState(false);

  const webSupported =
    IS_WEB &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined';

  useEffect(() => {
    if (IS_WEB) return;
    void (async () => {
      const status = await AudioModule.getRecordingPermissionsAsync();
      setPermission(status.granted ? 'granted' : 'unknown');
      if (status.granted) {
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      }
    })();
  }, []);

  const startNative = useCallback(async () => {
    let ok = permission === 'granted';
    if (!ok) {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      ok = status.granted;
      setPermission(status.granted ? 'granted' : 'denied');
    }
    if (!ok) return;
    try {
      // Always (re)assert the recording audio mode right before recording. On
      // some devices the mode is reset after playback or backgrounding, which
      // otherwise makes record() a silent no-op.
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedAt.current = Date.now();
    } catch {
      // A device-level failure (audio focus, hardware busy) should not crash
      // the screen; surface it as a blocked mic so the UI shows guidance.
      setPermission('denied');
    }
  }, [permission, recorder]);

  const stopNative = useCallback(async (): Promise<RecordingResult | null> => {
    try {
      await recorder.stop();
    } catch {
      startedAt.current = null;
      return null;
    }
    const durationSec = startedAt.current ? (Date.now() - startedAt.current) / 1000 : 0;
    startedAt.current = null;
    if (!recorder.uri) return null;
    return { uri: recorder.uri, durationSec };
  }, [recorder]);

  const startWeb = useCallback(async () => {
    if (!webSupported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermission('granted');
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        const uri = URL.createObjectURL(blob);
        const durationSec = startedAt.current ? (Date.now() - startedAt.current) / 1000 : 0;
        startedAt.current = null;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        resolveRef.current?.({ uri, durationSec });
        resolveRef.current = null;
      };
      mediaRecorderRef.current = rec;
      rec.start();
      startedAt.current = Date.now();
      setWebRecording(true);
    } catch {
      setPermission('denied');
    }
  }, [webSupported]);

  const stopWeb = useCallback(async (): Promise<RecordingResult | null> => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === 'inactive') return null;
    setWebRecording(false);
    return new Promise<RecordingResult | null>((resolve) => {
      resolveRef.current = resolve;
      rec.stop();
    });
  }, []);

  if (IS_WEB) {
    return {
      isSupported: webSupported,
      permission,
      isRecording: webRecording,
      start: startWeb,
      stop: stopWeb,
    };
  }

  return {
    isSupported: true,
    permission,
    isRecording: state.isRecording,
    start: startNative,
    stop: stopNative,
  };
}
