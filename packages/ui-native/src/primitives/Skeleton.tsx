import * as React from 'react';
import { View, ViewStyle } from 'react-native';

type SkeletonProps = {
  style?: ViewStyle;
  [key: string]: unknown;
};

export function Skeleton({ style, ...rest }: SkeletonProps) {
  // Default to light mode since Appearance API requires native modules
  const isDark = false;
  const baseStyle: ViewStyle = {
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    borderRadius: 12
  };
  
  return (
    <View
      {...rest}
      style={[baseStyle, style]}
    />
  );
}


