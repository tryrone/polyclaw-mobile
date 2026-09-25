import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetScrollView,
  BottomSheetTextInput as NativeBottomSheetTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { X } from 'phosphor-react-native';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/motion';
import { fonts, radius, spacing, usePolyClawTheme } from '@/theme';

export { BottomSheetModalProvider };
// RN Web has no native keyboard/focused-input API; Gorhom's native input requires it.
export const BottomSheetTextInput = Platform.OS === 'web' ? TextInput : NativeBottomSheetTextInput;

export type AppBottomSheetHandle = {
  present: () => void;
  dismiss: () => void;
};

type Props = {
  children: ReactNode;
  onDismiss?: () => void;
  snapPoints?: (string | number)[];
  title: string;
};

/**
 * The single app-owned sheet surface. It centralises safe-area, keyboard, dismissal,
 * accessibility, backdrop and reduced-motion behaviour so feature screens only own content.
 */
export const AppBottomSheet = forwardRef<AppBottomSheetHandle, Props>(function AppBottomSheet(
  { children, onDismiss, snapPoints: requestedSnapPoints, title },
  forwardedRef,
) {
  const { theme } = usePolyClawTheme();
  const insets = useSafeAreaInsets();
  const modalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => requestedSnapPoints ?? ['72%', '94%'], [requestedSnapPoints]);

  useImperativeHandle(forwardedRef, () => ({
    present: () => modalRef.current?.present(),
    dismiss: () => modalRef.current?.dismiss(),
  }), []);

  const renderBackdrop = useCallback((props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={theme.mode === 'dark' ? 0.62 : 0.42} pressBehavior="close" />
  ), [theme.mode]);

  return (
    <BottomSheetModal
      android_keyboardInputMode="adjustResize"
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.panel }}
      bottomInset={Math.max(insets.bottom, spacing.sm)}
      enableDismissOnClose
      enableDynamicSizing={false}
      enablePanDownToClose
      handleIndicatorStyle={{ backgroundColor: theme.borderStrong, width: 36 }}
      index={0}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      onDismiss={onDismiss}
      overrideReduceMotion={ReduceMotion.System}
      ref={modalRef}
      snapPoints={snapPoints}>
      <BottomSheetScrollView
        accessibilityLabel={`${title} sheet`}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{title}</Text>
          <PressableScale
            accessibilityHint={`Dismisses the ${title} sheet`}
            accessibilityLabel={`Close ${title}`}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => modalRef.current?.dismiss()}>
            <View style={[styles.close, { backgroundColor: theme.field }]}><X color={theme.text} size={20} /></View>
          </PressableScale>
        </View>
        {children}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  close: { alignItems: 'center', borderRadius: radius.pill, height: 44, justifyContent: 'center', width: 44 },
  content: { gap: spacing.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  title: { flex: 1, fontFamily: fonts.displayExtraBold, fontSize: 22, letterSpacing: -0.5 },
});
