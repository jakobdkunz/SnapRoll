import * as React from 'react';
import { Pressable, Text, ViewStyle, TextStyle } from 'react-native';

type ButtonProps = {
  onPress?: () => void;
  children?: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function Button({ onPress, children, className, style, textStyle }: ButtonProps) {
  return (
    <Pressable onPress={onPress} className={className} style={[{ paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#2563EB', borderRadius: 10 }, style]}>
      <Text style={[{ color: 'white', fontWeight: '600', textAlign: 'center' }, textStyle]}>{children}</Text>
    </Pressable>
  );
}


