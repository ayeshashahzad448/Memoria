import { Platform } from 'react-native';
import * as ExpoHaptics from 'expo-haptics';

import { useMemoria } from '@/lib/store';

/**
 * Drop-in for `import * as Haptics from 'expo-haptics'` that honours the
 * "Haptic feedback" switch in Settings. Browsers that support the Vibration API
 * (Android Chrome) get a short vibration; others stay silent.
 */
export { ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';

const enabled = () => useMemoria.getState().settings.haptics;

/** Vibration length in ms for each impact strength on the web. */
const WEB_IMPACT_MS: Record<ExpoHaptics.ImpactFeedbackStyle, number> = {
  [ExpoHaptics.ImpactFeedbackStyle.Light]: 12,
  [ExpoHaptics.ImpactFeedbackStyle.Medium]: 25,
  [ExpoHaptics.ImpactFeedbackStyle.Heavy]: 55,
  [ExpoHaptics.ImpactFeedbackStyle.Soft]: 15,
  [ExpoHaptics.ImpactFeedbackStyle.Rigid]: 35,
};

function webVibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern);
  }
}

export async function impactAsync(
  style: ExpoHaptics.ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle.Medium,
): Promise<void> {
  if (!enabled()) return;
  if (Platform.OS === 'web') webVibrate(WEB_IMPACT_MS[style]);
  else await ExpoHaptics.impactAsync(style);
}

export async function notificationAsync(
  type: ExpoHaptics.NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType.Success,
): Promise<void> {
  if (!enabled()) return;
  if (Platform.OS === 'web') webVibrate([30, 50, 70]);
  else await ExpoHaptics.notificationAsync(type);
}

export async function selectionAsync(): Promise<void> {
  if (!enabled()) return;
  if (Platform.OS === 'web') webVibrate(8);
  else await ExpoHaptics.selectionAsync();
}

/* ---- The "a memory becomes a star" sequence ---------------------------------------- */

/** Rising pulses while a new star collapses, getting firmer as it nears ignition. */
const BUILDUP_STYLES = [
  ExpoHaptics.ImpactFeedbackStyle.Light,
  ExpoHaptics.ImpactFeedbackStyle.Light,
  ExpoHaptics.ImpactFeedbackStyle.Medium,
  ExpoHaptics.ImpactFeedbackStyle.Medium,
  ExpoHaptics.ImpactFeedbackStyle.Heavy,
];
const BUILDUP_STEP_MS = 260;

/** Start the rising pulses. Returns a function that cancels any that haven't fired yet. */
export function startIgnitionBuildup(): () => void {
  const timers = BUILDUP_STYLES.map((style, i) =>
    setTimeout(() => void impactAsync(style), i * BUILDUP_STEP_MS),
  );
  return () => timers.forEach(clearTimeout);
}

/** The strong burst at the moment the star ignites: a heavy thump, then a success tap. */
export async function ignitionBurst(): Promise<void> {
  await impactAsync(ExpoHaptics.ImpactFeedbackStyle.Heavy);
  setTimeout(() => void notificationAsync(ExpoHaptics.NotificationFeedbackType.Success), 130);
}
