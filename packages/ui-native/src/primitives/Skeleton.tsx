import * as React from 'react';
import { View, ViewProps } from 'react-native';

export function Skeleton({ style, ...rest }: ViewProps) {
  // Default to light mode since Appearance API requires native modules
  const isDark = false;
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          borderRadius: 12
        },
        style
      ]}
    />
  );
}


