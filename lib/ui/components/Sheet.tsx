// lib/ui/components/Sheet.tsx
import React, { forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Easing } from 'react-native-reanimated';
import { color, radius, motion } from '../tokens';

export interface SheetHandle { open: () => void; close: () => void; }

interface SheetProps {
  snapPoints?: (string | number)[];
  children: React.ReactNode;
  onClose?: () => void;
}

export const Sheet = forwardRef<SheetHandle, SheetProps>(({ snapPoints = ['45%', '85%'], children, onClose }, ref) => {
  const innerRef = useRef<BottomSheet>(null);
  useImperativeHandle(ref, () => ({
    open: () => innerRef.current?.expand(),
    close: () => innerRef.current?.close(),
  }));

  const animationConfigs = useMemo(() => ({
    duration: motion.duration.base + 20, // 320ms — design-language §7 override
    easing: Easing.bezier(motion.ease.out[0], motion.ease.out[1], motion.ease.out[2], motion.ease.out[3]),
  }), []);

  return (
    <BottomSheet
      ref={innerRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      animationConfigs={animationConfigs as any}
      backgroundStyle={{ backgroundColor: color.bg.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }}
      handleIndicatorStyle={{ backgroundColor: color.text.muted }}
      onClose={onClose}
      backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />}
    >
      <BottomSheetView style={{ flex: 1 }}>{children}</BottomSheetView>
    </BottomSheet>
  );
});
