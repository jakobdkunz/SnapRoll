import * as React from 'react';
import { Modal as RNModal, View, Pressable } from 'react-native';

type Props = {
  open: boolean;
  onClose: () => void;
  children?: React.ReactNode;
};

export function Modal({ open, onClose, children }: Props) {
  return (
    <RNModal animationType="fade" transparent visible={open} onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 16 }} onPress={onClose}>
        <View style={{ maxWidth: 480, width: '100%' }}>{children}</View>
      </Pressable>
    </RNModal>
  );
}


