import type { ReactNode } from 'react';
import { StyleSheet, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/** How far in a pinch or double tap goes: small text on an A3 sheet. */
const MAX_ZOOM = 6;
const DOUBLE_TAP_ZOOM = 3;

/**
 * Pinch, drag and double-tap zoom for the full-screen drawing on phones.
 * Not zoomed in, a drag is left to the screen (so it still scrolls).
 */
export function ZoomableDrawing({ children }: { children: ReactNode }) {
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  // Keeps the zoomed drawing covering its box: no blank edges dragged in.
  const clamp = (value: number, size: number, k: number) => {
    'worklet';
    const max = (size * (k - 1)) / 2;
    return Math.min(max, Math.max(-max, value));
  };
  const settle = (k: number) => {
    'worklet';
    scale.value = withTiming(k);
    savedScale.value = k;
    const nx = clamp(x.value, width.value, k);
    const ny = clamp(y.value, height.value, k);
    x.value = withTiming(nx);
    y.value = withTiming(ny);
    savedX.value = nx;
    savedY.value = ny;
  };

  const pinch = Gesture.Pinch()
    .onUpdate(e => {
      scale.value = Math.min(MAX_ZOOM, Math.max(1, savedScale.value * e.scale));
      x.value = clamp(savedX.value, width.value, scale.value);
      y.value = clamp(savedY.value, height.value, scale.value);
    })
    .onEnd(() => settle(scale.value));

  const pan = Gesture.Pan()
    .manualActivation(true)
    .onTouchesMove((_e, state) => {
      if (savedScale.value > 1) {
        state.activate();
      } else {
        state.fail();
      }
    })
    .onUpdate(e => {
      x.value = clamp(savedX.value + e.translationX, width.value, scale.value);
      y.value = clamp(savedY.value + e.translationY, height.value, scale.value);
    })
    .onEnd(() => {
      savedX.value = x.value;
      savedY.value = y.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (savedScale.value > 1) {
        x.value = withTiming(0);
        y.value = withTiming(0);
        savedX.value = 0;
        savedY.value = 0;
        settle(1);
      } else {
        settle(DOUBLE_TAP_ZOOM);
      }
    });

  const zoomed = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
    ],
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    width.value = e.nativeEvent.layout.width;
    height.value = e.nativeEvent.layout.height;
  };

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
      <Animated.View style={[styles.fill, zoomed]} onLayout={onLayout}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
});
