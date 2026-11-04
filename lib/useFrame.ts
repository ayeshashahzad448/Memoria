import { Platform, useWindowDimensions } from 'react-native';

/**
 * Memoria is designed as a phone-width column. On the web, wider windows show that
 * column centered over the dark backdrop instead of stretching every card edge to edge.
 */
export const FRAME_MAX_WIDTH = 520;

/**
 * Size of the area the app actually draws in. Use this instead of `useWindowDimensions`
 * for anything laid out against the screen width.
 */
export function useFrame() {
  const { width: windowWidth, height } = useWindowDimensions();
  const framed = Platform.OS === 'web' && windowWidth > FRAME_MAX_WIDTH;
  const width = framed ? FRAME_MAX_WIDTH : windowWidth;
  return {
    width,
    height,
    framed,
    /** Distance from the window's left edge to the frame's left edge. */
    offsetX: (windowWidth - width) / 2,
  };
}
