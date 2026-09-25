import { createContext, useContext, useState, type ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/theme';

const Clearance = createContext<{ height: number; setHeight: (height: number) => void } | null>(null);

export function BottomClearanceProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(60 + Math.max(insets.bottom, spacing.sm));
  return <Clearance.Provider value={{ height, setHeight }}>{children}</Clearance.Provider>;
}

export function useBottomClearance() {
  const insets = useSafeAreaInsets();
  const context = useContext(Clearance);
  return { height: context?.height ?? Math.max(insets.bottom, spacing.sm), setHeight: context?.setHeight };
}
