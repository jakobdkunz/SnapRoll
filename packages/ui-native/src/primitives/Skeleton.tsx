import * as React from 'react';
import { View, ViewProps, useColorScheme } from 'react-native';

export function Skeleton({ style, ...rest }: ViewProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
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


