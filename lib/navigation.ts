import type { Router } from 'expo-router';

/**
 * Close the current screen. When it was opened without anything behind it (a screen
 * entered via `router.replace`, a refresh, or a direct link on the web) `router.back()`
 * does nothing, so fall back to the cosmos.
 */
export function goBack(router: Router): void {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)');
}
