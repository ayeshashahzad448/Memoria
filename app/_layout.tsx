// oxlint-disable-next-line eslint-plugin-import/no-unassigned-import
import '../global.css';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { Lora_400Regular, Lora_500Medium } from '@expo-google-fonts/lora';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform, StyleSheet, View } from 'react-native';
import { useEffect, useState, type ReactNode } from 'react';
import * as DevClient from 'expo-dev-client';
import { HeroUINativeProvider, useThemeColor } from 'heroui-native';
import { StatusBar } from 'expo-status-bar';
import { Uniwind } from 'uniwind';
import {
  ErrorBoundary as ExpoErrorBoundary,
  type ErrorBoundaryProps,
  SplashScreen,
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from 'expo-router';

import { isCloudSimulated, startAutoSync } from '@/lib/cloudSync';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import { startAppearanceSync } from '@/lib/appearance';
import { usePalette } from '@/lib/theme';
import { useMemoria } from '@/lib/store';
import { FRAME_MAX_WIDTH, useFrame } from '@/lib/useFrame';
import { initPostHog } from '@/lib/posthog';
import { reportErrorToParent } from '@/lib/reportPreviewError';
import { getMokotoFontMap, injectMokotoWebFont } from '@/lib/fonts';
import { DemoTourOverlay } from '@/components/DemoTourOverlay';

/**
 * Custom ErrorBoundary that reports React render errors to the parent window (Bilt preview iframe)
 * and then renders the default Expo error UI.
 */
function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    if (Platform.OS === 'web' && error) {
      const message = [error.message, error.stack].filter(Boolean).join('\n');
      reportErrorToParent(message);
    }
  }, [error]);
  return <ExpoErrorBoundary error={error} retry={retry} />;
}

export { ErrorBoundary };

// Memoria is a dark-only cosmos experience.
Uniwind.setTheme('dark');

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Lora_400Regular,
    Lora_500Medium,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    // Clean family aliases so `fontFamily: 'Space Grotesk' | 'Lora' | 'Instrument Serif'`
    // resolves on native too.
    'Space Grotesk': SpaceGrotesk_600SemiBold,
    Lora: Lora_400Regular,
    'Instrument Serif': InstrumentSerif_400Regular,
    ...getMokotoFontMap(),
  });

  // Report uncaught JS errors and unhandled promise rejections to parent (Bilt preview iframe)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;

    const handleError = (event: ErrorEvent) => {
      const message = event.error?.stack ?? event.message ?? 'Unknown error';
      reportErrorToParent(message);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const err = event.reason;
      const message =
        err instanceof Error ? [err.message, err.stack].filter(Boolean).join('\n') : String(err);
      reportErrorToParent(message);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Inject Google Fonts link tag for web to ensure fonts load through proxy
  // Also register font family names as fallback if expo-font fails
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Check if link already exists
      const existingLink = document.querySelector(
        'link[href*="fonts.googleapis.com/css2?family=Inter"]',
      );

      if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href =
          'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=Lora:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap';
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }

      injectMokotoWebFont();

      // Note: The @import in global.css and the link tag above ensure Inter font loads
      // expo-font will register the font family names (Inter_400Regular, etc.)
      // If expo-font fails due to proxy issues, the fonts should still be available
      // via the direct Google Fonts CDN link, though the specific font family names
      // might not be registered. The app should still render with Inter font.
    }
  }, []);

  useEffect(() => {
    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (__DEV__ && Platform.OS !== 'web' && !isExpoGo) {
      const timer = setTimeout(() => {
        DevClient.closeMenu();
        DevClient.hideMenu();
      }, 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      initPostHog();
    }
  }, []);

  useEffect(() => {
    // Web has no real cloud drive, but the demo simulation should still run there.
    if (Platform.OS === 'web' && !isCloudSimulated()) return undefined;
    return startAutoSync();
  }, []);

  // Text size and High contrast from Settings.
  useEffect(() => startAppearanceSync(), []);

  // "Reduce motion" turns off Reanimated animations; otherwise follow the device setting.
  const reduceMotion = useMemoria((s) => s.settings.reduceMotion);

  useEffect(() => {
    if (loaded || error) {
      void SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ReducedMotionConfig mode={reduceMotion ? ReduceMotion.Always : ReduceMotion.System} />
      <HeroUINativeProvider>
        <AppFrame>
          <RootNavigator />
        </AppFrame>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}

/**
 * On wide web windows, show the app as a centered phone-width column so cards and the
 * tab bar keep their intended proportions. Everything inside (modals, the tab bar,
 * overlays) is positioned against this column. Native and narrow windows are untouched.
 */
function AppFrame({ children }: { children: ReactNode }) {
  const colors = usePalette();
  const { framed } = useFrame();
  if (!framed) return <>{children}</>;
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        backgroundColor: colors.isDark ? '#050609' : '#FFE3CC',
      }}
    >
      <View
        style={{
          flex: 1,
          width: FRAME_MAX_WIDTH,
          overflow: 'hidden',
          backgroundColor: colors.bg,
          borderLeftWidth: StyleSheet.hairlineWidth,
          borderRightWidth: StyleSheet.hairlineWidth,
          borderColor: colors.fg(0.1),
        }}
      >
        {children}
      </View>
    </View>
  );
}

/** Screens people can reach without being signed in. */
const PUBLIC_SEGMENTS = new Set<string | undefined>([undefined, 'index', 'auth', 'login']);

/**
 * Keep the first-run order: sign up -> accept terms -> onboarding -> first star -> the app. Without
 * this, a direct link (or a refresh on the web) could open the cosmos or the create-star
 * screen before onboarding.
 */
function useFlowGuard() {
  const router = useRouter();
  const segments = useSegments();
  const navigationKey = useRootNavigationState()?.key;
  const isAuthed = useMemoria((s) => s.isAuthed);
  const hasAcceptedTerms = useMemoria((s) => s.hasAcceptedTerms);
  const hasOnboarded = useMemoria((s) => s.hasOnboarded);
  const [hydrated, setHydrated] = useState(() => useMemoria.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return undefined;
    return useMemoria.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  const first: string | undefined = segments[0];
  useEffect(() => {
    if (!navigationKey || !hydrated) return;
    if (PUBLIC_SEGMENTS.has(first) || first === '+not-found') return;
    if (!isAuthed) router.replace('/auth');
    else if (!hasAcceptedTerms) {
      if (first !== 'terms') router.replace('/terms');
    } else if (first === 'terms') router.replace(hasOnboarded ? '/(tabs)' : '/onboarding');
    else if (!hasOnboarded && first !== 'onboarding') router.replace('/onboarding');
  }, [navigationKey, hydrated, first, isAuthed, hasAcceptedTerms, hasOnboarded, router]);
}

function RootNavigator() {
  const [overlay] = useThemeColor(['overlay']);
  const colors = usePalette();
  useFlowGuard();
  return (
    <>
      {/* oxlint-disable-next-line react/style-prop-object -- expo-status-bar style prop takes a string */}
      <StatusBar style={colors.isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="login" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="cosmos/[id]" />
        <Stack.Screen name="constellations" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="checkout" options={{ presentation: 'modal' }} />
        <Stack.Screen name="friends" />
        <Stack.Screen
          name="star/create"
          options={{ presentation: 'modal', contentStyle: { backgroundColor: overlay } }}
        />
        <Stack.Screen
          name="star/edit"
          options={{ presentation: 'modal', contentStyle: { backgroundColor: overlay } }}
        />
        <Stack.Screen
          name="star/[id]"
          options={{ presentation: 'modal', contentStyle: { backgroundColor: overlay } }}
        />
        <Stack.Screen
          name="star/ignite"
          options={{
            presentation: 'transparentModal',
            animation: 'fade',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <Stack.Screen
          name="star/dissolve"
          options={{
            presentation: 'transparentModal',
            animation: 'fade',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <Stack.Screen
          name="paywall"
          options={{
            presentation: 'transparentModal',
            animation: 'fade',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
      </Stack>
      {/* Guided demo walkthrough controller (hidden until started). Mounted at
          the root so it persists across navigation while it drives the app. */}
      <DemoTourOverlay />
    </>
  );
}
