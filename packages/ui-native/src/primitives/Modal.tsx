import * as React from 'react';
import { View, Pressable } from 'react-native';

type Props = {
  open: boolean;
  onClose: () => void;
  children?: React.ReactNode;
};

export function Modal({ open, onClose, children }: Props) {
  if (!open) return null;

  // Use absolute positioning overlay as a workaround for native Modal issues
  // This works without requiring native modules to be linked
  // Note: When used inside a ScrollView, this will be positioned relative to the ScrollView
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 9999,
      }}
    >
      <Pressable style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View style={{ maxWidth: 480, width: '100%' }}>{children}</View>
        </Pressable>
      </Pressable>
    </View>
  );
}


