import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { motion } from '@/theme';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

function animate(value: SharedValue<number>, target: number, preset: typeof motion.press, allowSpring: boolean) {
  value.value = allowSpring ? withSpring(target, preset) : withTiming(target, motion.fast);
}

export const haptics = {
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined),
  select: () => Haptics.selectionAsync().catch(() => undefined),
};

type PressableScaleProps = PressableProps & { haptic?: keyof typeof haptics | null; containerStyle?: StyleProp<ViewStyle> };

export function PressableScale({ haptic = 'tap', containerStyle, onPress, onPressIn, onPressOut, disabled, ...rest }: PressableScaleProps) {
  const scale = useSharedValue(1);
  const reduce = useReducedMotion();
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[containerStyle, animated]}>
      <Pressable
        {...rest}
        disabled={disabled}
        onPressIn={(event) => { animate(scale, 0.97, motion.press, !reduce); onPressIn?.(event); }}
        onPressOut={(event) => { animate(scale, 1, motion.press, !reduce); onPressOut?.(event); }}
        onPress={(event) => { if (!disabled && haptic && !reduce) haptics[haptic](); onPress?.(event); }}
      />
    </Animated.View>
  );
}

export function Staggered({ index = 0, children, style }: { index?: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  return (
    <Animated.View
      style={style}
      entering={reduce ? FadeIn.duration(motion.base.duration) : FadeInDown.springify().stiffness(motion.enter.stiffness).damping(motion.enter.damping).delay(Math.min(index * 40, 320))}
    >
      {children}
    </Animated.View>
  );
}

export function Skeleton({ style, radius: cornerRadius = 12 }: { style?: StyleProp<ViewStyle>; radius?: number }) {
  const reduce = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (reduce) { opacity.value = 0.55; return; }
    opacity.value = withRepeat(withTiming(0.45, { duration: 850 }), -1, true);
    return () => { opacity.value = 1; };
  }, [opacity, reduce]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.skeleton, { borderRadius: cornerRadius }, style, animated]} />;
}

export function PulsingDot({ color, size = 6 }: { color: string; size?: number }) {
  const halo = useSharedValue(0);
  const core = useSharedValue(1);
  useEffect(() => {
    halo.value = withRepeat(withTiming(1, { duration: 1400 }), -1, false);
    core.value = withRepeat(withTiming(0.82, { duration: 700 }), -1, true);
    return () => { halo.value = 0; core.value = 1; };
  }, [core, halo]);
  const haloStyle = useAnimatedStyle(() => ({ opacity: 0.45 - 0.45 * halo.value, transform: [{ scale: 1 + halo.value * 1.5 }] }));
  return (
    <View style={{ width: size * 2.6, height: size * 2.6, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.halo, { backgroundColor: color, borderRadius: size * 1.3 }, haloStyle]} />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

const styles = StyleSheet.create({ skeleton: { backgroundColor: 'rgba(155,150,171,0.16)' }, halo: { position: 'absolute' } });

export function Ticker({ value, format, style }: { value: number; format: (input: number) => string; style?: StyleProp<TextStyle> }) {
  const reduce = useReducedMotion();
  const [text, setText] = useState(() => format(value));
  const current = useRef(value);
  const formatRef = useRef(format);
  useEffect(() => { formatRef.current = format; });
  useEffect(() => {
    const from = current.current;
    if (from === value) return;
    current.current = value;
    if (reduce) { setText(formatRef.current(value)); return; }
    const start = Date.now();
    const timer = setInterval(() => {
      const t = Math.min((Date.now() - start) / 600, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setText(formatRef.current(from + (value - from) * eased));
      if (t >= 1) clearInterval(timer);
    }, 32);
    return () => clearInterval(timer);
  }, [reduce, value]);
  return <Text style={style}>{text}</Text>;
}

export function FlashOnChange({ changed, children, style }: { changed: unknown; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const previous = useRef(changed);
  const flash = useSharedValue(0);
  useEffect(() => {
    if (changed === previous.current) return;
    previous.current = changed;
    flash.value = 1;
    flash.value = withTiming(0, { duration: 700 });
  }, [changed, flash]);
  const animated = useAnimatedStyle(() => ({ opacity: 1 - flash.value * 0.4 }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
