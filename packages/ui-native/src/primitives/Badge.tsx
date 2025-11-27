import * as React from 'react';
import { Text, View, ViewStyle, TextStyle } from 'react-native';

type BadgeProps = {
  text: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function Badge({ text, style, textStyle }: BadgeProps) {
  return (
    <View style={[{ backgroundColor: '#EEF2FF', borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 4 }, style]}>
      <Text style={[{ color: '#3730A3', fontWeight: '600', fontSize: 12 }, textStyle]}>{text}</Text>
    </View>
  );
}


